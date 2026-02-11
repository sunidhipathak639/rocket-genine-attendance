import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * GET: Fetch meeting requests
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const technicalStaffId = searchParams.get('technicalStaff')

    const where: any = {}

    if (user.role === 'admin') {
      // Admin can filter by any criteria
      if (technicalStaffId) {
        where.technicalStaff = { equals: parseInt(technicalStaffId, 10) }
      }
      if (status) {
        where.status = { equals: status }
      }
    } else if (user.role === 'technical') {
      // Technical staff can only see requests assigned to them
      where.technicalStaff = { equals: user.id }
      if (status) {
        where.status = { equals: status }
      }
    } else if (user.role === 'staff') {
      // Staff can only see their own requests
      where.staff = { equals: user.id }
      if (status) {
        where.status = { equals: status }
      }
    } else {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const meetingRequests = await payload.find({
      collection: 'meeting-requests',
      where,
      sort: '-createdAt',
      limit: 100,
      depth: 2, // Populate relationships
    })

    return NextResponse.json(meetingRequests)
  } catch (error: any) {
    console.error('Error fetching meeting requests:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to fetch meeting requests' },
      { status: 500 },
    )
  }
}
