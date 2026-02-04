'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export const AdminStyleHandler = () => {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.includes('/login')) {
      document.body.classList.add('admin-login-page')
    } else {
      document.body.classList.remove('admin-login-page')
    }
  }, [pathname])

  return null
}
