import React from 'react'
import '@/app/(frontend)/styles.css'

/**
 * Layout for custom admin routes (e.g. /admin/login).
 * Imports the same global Tailwind/styles as the staff login so the UI matches.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
