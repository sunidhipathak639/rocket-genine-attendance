import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

/**
 * Custom route for staff check-in. Creates attendance record; user is identified by userId in body.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const body = await request.json()
    const { userId, date, timeIn, status, location, selfie } = body

    if (!userId) {
      return NextResponse.json({ message: 'userId is required.' }, { status: 400 })
    }

    const todayStr = date || new Date().toISOString().split('T')[0]
    const userDoc = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    })

    const doc = await payload.create({
      collection: 'attendance',
      data: {
        user: userId,
        date: todayStr,
        timeIn: timeIn || new Date().toISOString(),
        status: status || 'present',
        location: location || {},
        selfie: selfie || undefined,
      },
      req: {
        user: userDoc,
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
        { status: error.status },
      )
    }
    const message = error?.message || 'Failed to check in.'
    const status = (error as any)?.status || 500
    return NextResponse.json({ message, errors: (error as any)?.errors }, { status })
  }
}
