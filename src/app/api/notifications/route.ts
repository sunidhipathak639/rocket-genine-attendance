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

/** Parse notification IDs from query (e.g. where[and][0][id][in][0]=8&... or ids=8,7) or body { ids: [] } */
async function parseIdsFromRequest(request: NextRequest): Promise<number[]> {
  const ids: number[] = []
  const url = request.nextUrl

  const idsParam = url.searchParams.get('ids')
  if (idsParam) {
    idsParam.split(',').forEach((s) => {
      const n = parseInt(s.trim(), 10)
      if (!Number.isNaN(n)) ids.push(n)
    })
    if (ids.length) return [...new Set(ids)]
  }

  url.searchParams.forEach((value, key) => {
    if (key.includes('[id][in]')) {
      const n = parseInt(value, 10)
      if (!Number.isNaN(n)) ids.push(n)
    }
  })
  if (ids.length) return [...new Set(ids)]

  try {
    const body = await request.json()
    if (body && Array.isArray(body.ids)) {
      body.ids.forEach((id: unknown) => {
        const n = typeof id === 'number' ? id : parseInt(String(id), 10)
        if (!Number.isNaN(n)) ids.push(n)
      })
      return [...new Set(ids)]
    }
  } catch {
    // no body or invalid JSON
  }
  return ids
}

/**
 * DELETE: Delete notifications by IDs. Any authenticated user can delete their own notifications.
 * Query: ids=8,7 or body: { ids: [8, 7] }. Also accepts Payload-style where[and][0][id][in][0]=8&...
 */
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const ids = await parseIdsFromRequest(request)
    if (ids.length === 0) {
      return NextResponse.json(
        { message: 'No notification IDs provided. Use ids=8,7 or body { ids: [8, 7] }' },
        { status: 400 },
      )
    }

    const isAdmin = (user as { role?: string })?.role === 'admin'
    let deleted = 0
    for (const id of ids) {
      try {
        if (!isAdmin) {
          const doc = await payload.findByID({
            collection: 'notifications',
            id,
            depth: 0,
            overrideAccess: true,
          })
          const docUserId =
            typeof doc.user === 'object' ? (doc.user as { id?: string | number })?.id : doc.user
          if (docUserId == null || user.id == null || String(docUserId) !== String(user.id))
            continue
        }
        await payload.delete({
          collection: 'notifications',
          id,
          req: {
            user,
            payload,
            headers: request.headers,
            url: request.url,
            method: 'DELETE',
          } as any,
          overrideAccess: true,
        })
        deleted++
      } catch {
        // skip missing or invalid id
      }
    }

    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    console.error('[Notifications DELETE]', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
