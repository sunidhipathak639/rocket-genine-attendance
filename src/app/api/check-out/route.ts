import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

/**
 * Custom route for staff check-out. Uses cookie auth so staff can update
 * their own attendance; bypasses collection access and enforces user can only update their own record.
 */
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json(
        { message: 'You must be logged in to check out.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, timeOut, location } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Attendance record id is required.' },
        { status: 400 }
      )
    }

    const existing = await payload.findByID({
      collection: 'attendance',
      id,
      overrideAccess: true,
    })

    const userId = typeof existing.user === 'object' ? (existing.user as any)?.id : existing.user
    if (userId !== user.id) {
      return NextResponse.json(
        { message: 'You can only check out your own attendance.' },
        { status: 403 }
      )
    }

    const doc = await payload.update({
      collection: 'attendance',
      id,
      data: {
        timeOut: timeOut || new Date().toISOString(),
        ...(location && { location }),
      },
      req: {
        user,
        payload,
        headers: request.headers,
        url: request.url,
        method: 'PATCH',
      } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ doc })
  } catch (error: any) {
    console.error('Check-out error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message, errors: (error as any).errors },
        { status: error.status }
      )
    }
    const message = error?.message || 'Failed to check out.'
    const status = (error as any)?.status || 500
    return NextResponse.json({ message, errors: (error as any)?.errors }, { status })
  }
}
