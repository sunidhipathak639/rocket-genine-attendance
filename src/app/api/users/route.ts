import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * GET: Fetch users with optional filters
 * Query params: role, limit
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can view all users
    if (user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden - Admin only' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const where: any = {}

    if (role) {
      where.role = { equals: role }
    }

    const result = await payload.find({
      collection: 'users',
      where: Object.keys(where).length > 0 ? where : undefined,
      limit: Math.min(limit, 1000),
      sort: 'createdAt',
      depth: 1,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Users fetch error:', error)
    return NextResponse.json({ message: error.message || 'An error occurred' }, { status: 500 })
  }
}
