import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './(frontend)/styles.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
})

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
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  )
}
