import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * Record a break on today's attendance. Called when a staff member ends a break.
 * Body: { attendanceId, startTime (ISO), endTime (ISO), durationMinutes }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const token = request.cookies.get('payload-token')?.value
    const authHeaders = new Headers(request.headers)
    if (token) authHeaders.set('Authorization', `Bearer ${token}`)
    const { user } = await payload.auth({ headers: authHeaders })

    if (!user) {
      return NextResponse.json({ message: 'You must be logged in to record a break.' }, { status: 401 })
    }

    const body = await request.json()
    const { attendanceId, startTime, endTime, durationMinutes } = body

    if (!attendanceId || !startTime || !endTime || typeof durationMinutes !== 'number') {
      return NextResponse.json(
        { message: 'attendanceId, startTime, endTime and durationMinutes are required.' },
        { status: 400 },
      )
    }

    const existing = await payload.findByID({
      collection: 'attendance',
      id: attendanceId,
      overrideAccess: true,
    })

    const userId = typeof existing.user === 'object' ? (existing.user as { id?: string | number })?.id : existing.user
    if (userId != null && user.id != null && String(userId) !== String(user.id)) {
      return NextResponse.json(
        { message: 'You can only record breaks on your own attendance.' },
        { status: 403 },
      )
    }

    const existingBreaks = Array.isArray(existing.breaks) ? existing.breaks : []
    const newBreak = {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMinutes: Math.max(0, Math.round(durationMinutes)),
    }

    const doc = await payload.update({
      collection: 'attendance',
      id: attendanceId,
      data: {
        breaks: [...existingBreaks, newBreak],
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

    return NextResponse.json({ success: true, doc })
  } catch (error: any) {
    console.error('Record break error:', error)
    return NextResponse.json(
      { message: error?.message || 'Failed to record break.' },
      { status: error?.status || 500 },
    )
  }
}
