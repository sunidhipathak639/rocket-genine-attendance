import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

/**
 * Custom route for staff check-in. Uses cookie auth so staff can create
 * attendance; bypasses collection access and enforces user can only check in for themselves.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json(
        { message: 'You must be logged in to check in.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { date, timeIn, status, location } = body

    const todayStr = date || new Date().toISOString().split('T')[0]

    const doc = await payload.create({
      collection: 'attendance',
      data: {
        user: user.id,
        date: todayStr,
        timeIn: timeIn || new Date().toISOString(),
        status: status || 'present',
        location: location || {},
      },
      req: {
        user,
        payload,
        headers: request.headers,
        url: request.url,
        method: 'POST',
      } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ doc })
  } catch (error: any) {
    console.error('Check-in error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message, errors: (error as any).errors },
        { status: error.status }
      )
    }
    const message = error?.message || 'Failed to check in.'
    const status = (error as any)?.status || 500
    return NextResponse.json({ message, errors: (error as any)?.errors }, { status })
  }
}
