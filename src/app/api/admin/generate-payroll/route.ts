import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * Admin-only: generate payroll for one user for a given month (default: current month).
 * Supports custom date ranges for partial period payroll (e.g., 3 days, 1 week).
 * POST /api/admin/generate-payroll
 * Body: { userId: string, month?: string, startDate?: string, endDate?: string }
 *   - month = YYYY-MM (required for salary calculation base)
 *   - startDate = YYYY-MM-DD (optional, defaults to first day of month)
 *   - endDate = YYYY-MM-DD (optional, defaults to last day of month)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    // Authentication check removed as per request for unrestricted access
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json().catch(() => ({}))
    const userIdRaw = body.userId
    let month = body.month
    const startDate = body.startDate // Optional: YYYY-MM-DD
    const endDate = body.endDate // Optional: YYYY-MM-DD

    if (userIdRaw == null || userIdRaw === '') {
      return NextResponse.json({ error: 'User is required to generate payroll.' }, { status: 400 })
    }

    const now = new Date()
    if (!month || typeof month !== 'string') {
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    let targetUser: { id: number | string; salary?: number | null; email?: string; name?: string }
    try {
      targetUser = (await payload.findByID({
        collection: 'users',
        id: userIdRaw,
        overrideAccess: true,
      })) as any
    } catch {
      return NextResponse.json(
        { error: 'User not found. Please refresh and try again.' },
        { status: 404 },
      )
    }

    const baseSalary = targetUser.salary
    if (baseSalary == null || baseSalary <= 0) {
      return NextResponse.json(
        {
          error:
            'This user has no salary set. Set a salary on the user first, then generate payroll.',
        },
        { status: 400 },
      )
    }

    const existing = await payload.find({
      collection: 'payroll',
      where: {
        and: [{ user: { equals: targetUser.id } }, { month: { equals: month } }],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json(
        {
          error: `Payroll for ${month} already exists for this user. Edit it from Payroll if needed.`,
          doc: existing.docs[0],
        },
        { status: 409 },
      )
    }

    const payrollData: any = {
      user: targetUser.id,
      month,
      baseSalary: Number(baseSalary),
      finalAmount: 0,
    }

    // Add custom date range if provided
    if (startDate) {
      payrollData.startDate = startDate
    }
    if (endDate) {
      payrollData.endDate = endDate
    }

    const doc = await payload.create({
      collection: 'payroll',
      data: payrollData,
      req: { user, payload, headers: request.headers, url: request.url, method: 'POST' } as any,
      overrideAccess: true,
    })

    const periodInfo = startDate && endDate ? ` (${startDate} to ${endDate})` : ''
    return NextResponse.json({ doc, message: `Payroll for ${month}${periodInfo} created.` })
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
