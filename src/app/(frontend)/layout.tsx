import React from 'react'
import { Toaster } from '@/components/ui/sonner'
import './styles.css'

export const metadata = {
  title: 'Rocket Genie Attendance',
  description: 'Manage your attendance and payroll with Rocket Genie.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
