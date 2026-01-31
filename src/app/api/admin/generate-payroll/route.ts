import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * Admin-only: generate payroll for one user for a given month (default: current month).
 * POST /api/admin/generate-payroll
 * Body: { userId: string, month?: string }  month = YYYY-MM
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const userIdRaw = body.userId
    let month = body.month

    if (userIdRaw == null || userIdRaw === '') {
      return NextResponse.json({ error: 'User is required to generate payroll.' }, { status: 400 })
    }

    const now = new Date()
    if (!month || typeof month !== 'string') {
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    let targetUser: { id: number | string; salary?: number | null; email?: string; name?: string }
    try {
      targetUser = await payload.findByID({
        collection: 'users',
        id: userIdRaw,
        overrideAccess: true,
      }) as any
    } catch {
      return NextResponse.json({ error: 'User not found. Please refresh and try again.' }, { status: 404 })
    }

    const baseSalary = targetUser.salary
    if (baseSalary == null || baseSalary <= 0) {
      return NextResponse.json(
        { error: 'This user has no salary set. Set a salary on the user first, then generate payroll.' },
        { status: 400 }
      )
    }

    const existing = await payload.find({
      collection: 'payroll',
      where: {
        and: [
          { user: { equals: targetUser.id } },
          { month: { equals: month } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json(
        { error: `Payroll for ${month} already exists for this user. Edit it from Payroll if needed.`, doc: existing.docs[0] },
        { status: 409 }
      )
    }

    const doc = await payload.create({
      collection: 'payroll',
      data: {
        user: targetUser.id,
        month,
        baseSalary: Number(baseSalary),
        finalAmount: 0,
      } as any,
      req: { user, payload, headers: request.headers, url: request.url, method: 'POST' } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ doc, message: `Payroll for ${month} created.` })
  } catch (error: any) {
    console.error('Admin generate-payroll error:', error)
    const message =
      error?.message && typeof error.message === 'string'
        ? error.message
        : 'Failed to generate payroll. Check that the user has a salary and try again.'
    const status = error?.status && typeof error.status === 'number' ? error.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
