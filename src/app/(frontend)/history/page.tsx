import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Attendance History | Rocket Genie',
  description: 'View your attendance history',
}

export default async function HistoryPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect('/login')
  }

  // Reuse DashboardClient but we will add logic there to show specific content based on route if needed,
  // OR we can create a dedicated client component. 
  // For simplicity and reusing the sidebar, using DashboardClient with a 'view' prop is best.
  // But DashboardClient is currently a full page wrapper. 
  // Let's pass a 'tab' prop to it.
  
  return (
    <DashboardClient user={user} initialTab="history" />
  )
}
