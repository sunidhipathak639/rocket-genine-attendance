import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // Get current user before logout
    const { user } = await payload.auth({ headers: request.headers })
    const userRole = user?.role

    // Logout by clearing the token cookie
    const response = NextResponse.json({ message: 'Logged out successfully' })

    // Clear the authentication cookie
    response.cookies.delete('payload-token')
    response.cookies.set('payload-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expire immediately
    })

    // Redirect based on user role
    if (userRole === 'staff') {
      response.headers.set('Location', '/login')
    } else {
      response.headers.set('Location', '/admin/login')
    }

    return response
  } catch (error) {
    console.error('Logout error:', error)
    // Even if there's an error, clear cookies and redirect
    const response = NextResponse.json({ message: 'Logged out' })
    response.cookies.delete('payload-token')
    response.cookies.set('payload-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    response.headers.set('Location', '/login')
    return response
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests (for direct navigation)
  return POST(request)
}
