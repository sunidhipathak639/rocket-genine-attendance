import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'

/**
 * GET: List notifications for the current user (unread first, then recent).
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 30, 50)

    const result = await payload.find({
      collection: 'notifications',
      where: { user: { equals: user.id } },
      sort: '-createdAt',
      limit,
      depth: 0,
    })

    const unreadCount = result.docs.filter((d: any) => !d.read).length

    return NextResponse.json({
      docs: result.docs,
      totalDocs: result.totalDocs,
      unreadCount,
    })
  } catch (error) {
    console.error('[Notifications GET]', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
