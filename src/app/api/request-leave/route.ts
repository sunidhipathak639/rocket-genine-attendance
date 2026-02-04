import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

/**
 * Custom route to create a leave request with auth from cookie.
 * Staff users get 403 on POST /api/leaves because Payload REST may not receive the cookie;
 * this route uses payload.auth({ headers }) so the user is loaded from the cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const token = request.cookies.get('payload-token')?.value
    const authHeaders = new Headers(request.headers)
    if (token) authHeaders.set('Authorization', `Bearer ${token}`)
    const { user } = await payload.auth({ headers: authHeaders })

    if (!user) {
      return NextResponse.json(
        { message: 'You must be logged in to request leave.' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { type, startDate, endDate, reason } = body

    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { message: 'type, startDate and endDate are required.' },
        { status: 400 },
      )
    }

    // Staff must be able to request leave; custom route uses cookie auth so we bypass
    // collection access here and enforce that users only create leave for themselves.
    const doc = await payload.create({
      collection: 'leaves',
      data: {
        user: user.id,
        type,
        startDate,
        endDate,
        reason: reason || '',
      },
      req: {
        user,
        payload,
        headers: request.headers,
        url: request.url,
        method: 'POST',
      } as any,
      overrideAccess: true,
    } as any)

    return NextResponse.json({ doc })
  } catch (error: any) {
    console.error('Request leave error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message, errors: (error as any).errors },
        { status: error.status },
      )
    }
    const message = error?.message || 'Failed to submit leave request.'
    const status = (error as any)?.status || 500
    return NextResponse.json({ message, errors: (error as any)?.errors }, { status })
  }
}
