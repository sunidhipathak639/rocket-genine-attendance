'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'

/**
 * Admin protection component that redirects staff users away from admin routes
 * This component should be added to the admin layout via Payload's component system
 */
export function AdminProtection() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    // Only check if we're on an admin route
    if (pathname?.startsWith('/admin')) {
      if (user) {
        // If user is staff, redirect to frontend
        if (user.role === 'staff') {
          router.replace('/')
        }
        // If user is admin and on login page, redirect to admin dashboard
        else if (user.role === 'admin' && pathname === '/admin/login') {
          router.replace('/admin')
        }
      }
    }
  }, [user, pathname, router])

  return null
}
