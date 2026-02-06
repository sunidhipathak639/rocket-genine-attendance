import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from '@/components/profile-page-client'
import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Profile | Rocket Genie',
  description: 'View your profile and update your profile picture',
}

export default async function ProfilePage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect('/login')
  }

  const fullUser = (await payload.findByID({
    collection: 'users',
    id: typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10),
    depth: 1,
  })) as User & { profileImage?: { url: string; alt?: string } | null }

  return <ProfilePageClient user={fullUser} />
}
