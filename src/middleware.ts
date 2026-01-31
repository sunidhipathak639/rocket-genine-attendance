import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(_request: NextRequest) {
  // Middleware runs in Edge Runtime, so we can't use getPayload here
  // Protection is handled by:
  // 1. Collection access control (prevents staff from accessing admin panel)
  // 2. Admin layout component (handles redirects)
  
  // This middleware is kept minimal to avoid webpack/Edge Runtime issues
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
