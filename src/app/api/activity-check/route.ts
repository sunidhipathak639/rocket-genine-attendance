import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { status, timestamp, duration } = await request.json()
    const todayStr = new Date().toISOString().split('T')[0]

    // Find today's attendance record
    const attendanceRes = await payload.find({
      collection: 'attendance',
      where: {
        and: [
          { user: { equals: user.id } },
          { date: { equals: todayStr } },
          { timeOut: { exists: false } }, // Only open sessions
        ],
      },
      limit: 1,
    })

    if (attendanceRes.docs.length === 0) {
      return NextResponse.json({ message: 'No active attendance found' }, { status: 404 })
    }

    const record = attendanceRes.docs[0]

    // Calculate new durations
    const currentActive = record.activeDuration || 0
    const currentInactive = record.inactiveDuration || 0

    // Duration is passed in minutes (e.g., 10)
    const newActive = status === 'active' ? currentActive + duration : currentActive
    const newInactive = status === 'inactive' ? currentInactive + duration : currentInactive

    // Update record
    await payload.update({
      collection: 'attendance',
      id: record.id,
      data: {
        activeDuration: newActive,
        inactiveDuration: newInactive,
        activityLogs: [
          ...(record.activityLogs || []),
          {
            timestamp: timestamp || new Date().toISOString(),
            status: status,
            notes: `System check: ${status === 'active' ? 'User confirmed' : 'User missed check'}`,
          },
        ],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Activity log error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
