import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/dashboard-stats
 * Returns total employees and today's attendance count for Payload admin dashboard.
 * Requires admin auth.
 */
export async function GET() {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const todayStr = new Date().toISOString().split('T')[0]

    const [usersResult, attendanceResult] = await Promise.all([
      payload.find({ collection: 'users', limit: 0 }),
      payload.find({
        collection: 'attendance',
        where: { date: { equals: todayStr } },
        limit: 0,
      }),
    ])

    return NextResponse.json({
      totalEmployees: usersResult.totalDocs,
      todayAttendance: attendanceResult.totalDocs,
    })
  } catch (err) {
    console.error('[dashboard-stats]', err)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
