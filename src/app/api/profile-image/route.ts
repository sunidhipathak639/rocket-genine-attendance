import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

/**
 * PATCH: Update a user's profile image. No auth required when userId is sent in body.
 * Body: { profileImage: number, userId?: number }
 */
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const body = await request.json()
    const mediaId = body?.profileImage
    const userIdFromBody = body?.userId

    if (mediaId == null || typeof mediaId !== 'number') {
      return NextResponse.json({ message: 'profileImage (media id) is required' }, { status: 400 })
    }

    let userId: number
    if (userIdFromBody != null && !Number.isNaN(Number(userIdFromBody))) {
      userId =
        typeof userIdFromBody === 'number' ? userIdFromBody : parseInt(String(userIdFromBody), 10)
    } else {
      const { user } = await payload.auth({ headers: request.headers })
      userId = user ? (typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10)) : NaN
      if (Number.isNaN(userId)) {
        return NextResponse.json({ message: 'userId is required in body' }, { status: 400 })
      }
    }

    const doc = await payload.update({
      collection: 'users',
      id: userId,
      data: { profileImage: mediaId },
      overrideAccess: true,
    })

    return NextResponse.json({ doc })
  } catch (error) {
    console.error('Profile image update error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message, errors: (error as any).errors },
        { status: error.status },
      )
    }
    return NextResponse.json({ message: 'Failed to update profile image' }, { status: 500 })
  }
}
