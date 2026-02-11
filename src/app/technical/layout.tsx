import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import '@/app/(frontend)/styles.css'

export default async function TechnicalLayout({ children }: { children: React.ReactNode }) {
  // This layout applies to all routes under /technical except /technical/login
  // Login page handles its own auth check
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  // Don't apply auth check to login page
  if (pathname === '/technical/login') {
    return (
      <ThemeProvider>
        {children}
        <Toaster />
      </ThemeProvider>
    )
  }

  const payload = await getPayload({ config: await configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  // Redirect if not logged in or not technical staff
  if (!user || user.role !== 'technical') {
    redirect('/technical/login')
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 dark:from-background dark:via-indigo-950/20 dark:to-background">
        {children}
        <Toaster />
      </div>
    </ThemeProvider>
  )
}
