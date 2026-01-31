import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Holidays | Rocket Genine',
  description: 'View company holidays and public holidays',
}

export default async function HolidaysPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardClient user={user} initialTab="holidays" />
  )
}
