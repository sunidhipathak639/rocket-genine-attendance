import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * GET: Fetch tasks with optional filters
 * Query params: assignedTo, createdBy, status, limit
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const assignedTo = searchParams.get('assignedTo')
    const createdBy = searchParams.get('createdBy')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const where: any = {}

    // Admin can view all tasks
    // Technical staff can only view tasks assigned to them
    // Staff can only view tasks they created
    if (user.role === 'admin') {
      // Admin can filter by any criteria
      if (assignedTo) {
        where.assignedTo = { equals: parseInt(assignedTo, 10) }
      }
      if (createdBy) {
        where.createdBy = { equals: parseInt(createdBy, 10) }
      }
    } else if (user.role === 'technical') {
      // Technical staff can only see tasks assigned to them
      where.assignedTo = { equals: user.id }
      // Allow filtering by status for their own tasks
      if (status) {
        where.status = { equals: status }
      }
    } else if (user.role === 'staff') {
      // Staff can only see tasks they created
      where.createdBy = { equals: user.id }
      // Allow filtering by status for their own tasks
      if (status) {
        where.status = { equals: status }
      }
    } else {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Apply status filter for admin (already handled for technical/staff above)
    if (user.role === 'admin' && status) {
      where.status = { equals: status }
    }

    const result = await payload.find({
      collection: 'tasks',
      where: Object.keys(where).length > 0 ? where : undefined,
      limit: Math.min(limit, 1000),
      sort: '-createdAt',
      depth: 2, // Populate relationships
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Tasks fetch error:', error)
    return NextResponse.json({ message: error.message || 'An error occurred' }, { status: 500 })
  }
}
