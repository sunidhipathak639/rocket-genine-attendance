import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './(frontend)/styles.css'

export const metadata: Metadata = {
  title: {
    default: 'Rocket Genie Attendance',
    template: '%s | Rocket Genie',
  },
  description: 'Manage your attendance and payroll with Rocket Genie.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isPayloadAdmin = pathname.startsWith('/admin')

  // Payload admin has its own RootLayout with <html>/<body>; do not nest another document.
  if (isPayloadAdmin) {
    return <>{children}</>
  }

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
