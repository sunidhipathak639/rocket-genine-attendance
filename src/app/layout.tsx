import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  // Custom admin login at /admin/login uses our document + Tailwind; only Payload panel uses fragment.
  const isPayloadAdmin = pathname.startsWith('/admin') && pathname !== '/admin/login'

  // Payload admin has its own RootLayout with <html>/<body>; do not nest another document.
  if (isPayloadAdmin) {
    return <>{children}</>
  }

  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body
        className="min-h-screen antialiased font-sans bg-background text-foreground"
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
