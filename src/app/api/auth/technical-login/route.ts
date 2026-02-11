import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { APIError } from 'payload'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    // Use Payload's login method via Local API
    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
      req: {
        headers: request.headers,
        payload,
        user: null,
        url: request.url,
        method: 'POST',
      } as any,
    })

    // Check if user is technical staff
    if (result.user.role !== 'technical') {
      return NextResponse.json(
        {
          message:
            'This login is for Technical Staff only. Please use the appropriate login portal.',
        },
        { status: 403 },
      )
    }

    // Create response with cookies
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    })

    // Set the authentication cookie
    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    return response
  } catch (error: any) {
    // Handle Payload API errors
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message || 'Invalid email or password' },
        { status: error.status || 401 },
      )
    }

    // Handle other errors
    console.error('Technical login error:', error)
    return NextResponse.json(
      { message: error.message || 'An error occurred during login' },
      { status: 500 },
    )
  }
}
