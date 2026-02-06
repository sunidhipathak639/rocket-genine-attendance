import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'

/**
 * PATCH: Mark a notification as read. User can only mark their own.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ message: 'Notification ID required' }, { status: 400 })
    }

    const doc = await payload.findByID({
      collection: 'notifications',
      id,
      depth: 0,
    })

    const notificationUserId = typeof doc.user === 'object' ? (doc.user as any)?.id : doc.user
    if (notificationUserId !== user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    await payload.update({
      collection: 'notifications',
      id,
      data: { read: true } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Notifications read PATCH]', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
