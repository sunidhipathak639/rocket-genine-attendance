'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'

/**
 * Custom login redirect component that redirects users based on their role
 * - Admin users: Stay in /admin or redirect to /admin
 * - Staff users: Redirect to frontend dashboard (/)
 * 
 * This component should be placed in the admin layout to handle redirects
 * after login for staff users.
 */
export function LoginRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    // Only redirect if user is logged in and on admin routes
    if (user && pathname?.startsWith('/admin')) {
      if (user.role === 'staff') {
        // Staff users should be redirected to frontend
        router.replace('/')
      }
      // Admin users can stay in admin panel
    }
  }, [user, pathname, router])

  return null
}
