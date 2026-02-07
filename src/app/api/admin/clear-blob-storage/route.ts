import { list, del } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'

/**
 * POST /api/admin/clear-blob-storage
 * Deletes all blobs in the Vercel Blob store. Admin only.
 * Use this to free space when you hit the Hobby plan 1GB limit.
 */
export async function POST() {
  try {
    const payload = await getPayload({ config: await configPromise })
    const reqHeaders = await headers()
    const { user } = await payload.auth({ headers: reqHeaders })

    if (!user || (user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ message: 'Admin only' }, { status: 403 })
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token?.trim()) {
      return NextResponse.json({ message: 'BLOB_READ_WRITE_TOKEN is not set' }, { status: 503 })
    }

    let totalDeleted = 0
    let cursor: string | undefined

    do {
      const result = await list({
        cursor,
        limit: 100,
        token,
      })

      if (result.blobs.length > 0) {
        const urls = result.blobs.map((b) => b.url)
        await del(urls, { token })
        totalDeleted += urls.length
      }

      cursor = result.hasMore ? result.cursor : undefined
    } while (cursor)

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      message: `Deleted ${totalDeleted} blob(s). Storage quota should free up shortly.`,
    })
  } catch (error: any) {
    console.error('Clear blob storage error:', error)
    return NextResponse.json(
      { message: error?.message || 'Failed to clear blob storage' },
      { status: 500 },
    )
  }
}
