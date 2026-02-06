import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

/**
 * PATCH: Update the current user's profile image only.
 * Body: { profileImage: number } (media document id)
 */
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const mediaId = body?.profileImage
    if (mediaId == null || typeof mediaId !== 'number') {
      return NextResponse.json({ message: 'profileImage (media id) is required' }, { status: 400 })
    }

    const doc = await payload.update({
      collection: 'users',
      id: typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10),
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
