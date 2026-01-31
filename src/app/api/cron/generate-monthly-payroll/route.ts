import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * Month-end cron: generates payroll for all staff for the previous month.
 * Call with: POST /api/cron/generate-monthly-payroll
 * Header: x-cron-secret: <CRON_SECRET> (set in env)
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret')
  const expected = process.env.CRON_SECRET

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config: await configPromise })

    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const year = prev.getFullYear()
    const month = prev.getMonth() + 1
    const monthStr = `${year}-${String(month).padStart(2, '0')}`

    const staffResult = await payload.find({
      collection: 'users',
      where: {
        and: [
          { role: { equals: 'staff' } },
          { salary: { greater_than: 0 } },
        ],
      },
      limit: 500,
      overrideAccess: true,
    })

    const created: string[] = []
    const skipped: string[] = []

    for (const user of staffResult.docs) {
      const baseSalary = user.salary
      if (baseSalary == null || baseSalary <= 0) {
        skipped.push(`${user.email} (no salary)`)
        continue
      }

      const existing = await payload.find({
        collection: 'payroll',
        where: {
          and: [
            { user: { equals: user.id } },
            { month: { equals: monthStr } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        skipped.push(`${user.email} (already exists)`)
        continue
      }

      await payload.create({
        collection: 'payroll',
        data: {
          user: user.id,
          month: monthStr,
          baseSalary: Number(baseSalary),
          finalAmount: 0,
        } as any,
        req: { payload } as any,
        overrideAccess: true,
      })
      created.push(`${user.email} (${monthStr})`)
    }

    return NextResponse.json({
      month: monthStr,
      created: created.length,
      skipped: skipped.length,
      createdList: created,
      skippedList: skipped,
    })
  } catch (error: any) {
    console.error('Cron generate-monthly-payroll error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate payroll' },
      { status: 500 }
    )
  }
}
