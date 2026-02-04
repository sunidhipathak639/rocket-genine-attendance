import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getAddressFromCoords } from '@/lib/location'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { latitude, longitude } = await request.json()
    const todayStr = new Date().toISOString().split('T')[0]

    // Find today's attendance record
    const attendanceRes = await payload.find({
      collection: 'attendance',
      where: {
        and: [
          { user: { equals: user.id } },
          { date: { equals: todayStr } },
          { timeOut: { exists: false } },
        ],
      },
      limit: 1,
    })

    if (attendanceRes.docs.length === 0) {
      return NextResponse.json({ message: 'No active attendance found' }, { status: 404 })
    }

    const record = attendanceRes.docs[0]

    // Get address
    const address = await getAddressFromCoords(latitude, longitude)

    // Update record with new location history entry
    await payload.update({
      collection: 'attendance',
      id: record.id,
      data: {
        locationHistory: [
          ...(record.locationHistory || []),
          {
            timestamp: new Date().toISOString(),
            latitude,
            longitude,
            address,
          },
        ],
      },
    })

    return NextResponse.json({ success: true, address })
  } catch (error) {
    console.error('Location update error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
