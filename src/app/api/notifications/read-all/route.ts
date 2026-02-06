import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'

/**
 * POST: Mark all notifications as read for the current user.
 */
export async function POST() {
  try {
    const payload = await getPayload({ config: await configPromise })
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const result = await payload.find({
      collection: 'notifications',
      where: {
        and: [{ user: { equals: user.id } }, { read: { equals: false } }],
      },
      limit: 200,
      depth: 0,
      overrideAccess: false,
      user,
    })

    for (const doc of result.docs) {
      await payload.update({
        collection: 'notifications',
        id: doc.id,
        data: { read: true } as any,
        overrideAccess: false,
        user,
      })
    }

    return NextResponse.json({ success: true, updated: result.docs.length })
  } catch (error) {
    console.error('[Notifications read-all]', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
