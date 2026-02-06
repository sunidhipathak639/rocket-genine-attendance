'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth, useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

const baseClass = 'graphic-account'

function DefaultPlaceholder({ active }: { active: boolean }) {
  return (
    <svg
      className={[baseClass, active && `${baseClass}--active`].filter(Boolean).join(' ')}
      height="25"
      viewBox="0 0 25 25"
      width="25"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className={`${baseClass}__bg`} cx="12.5" cy="12.5" r="11.5" />
      <circle className={`${baseClass}__head`} cx="12.5" cy="10.73" r="3.98" />
      <path
        className={`${baseClass}__body`}
        d="M12.5,24a11.44,11.44,0,0,0,7.66-2.94c-.5-2.71-3.73-4.8-7.66-4.8s-7.16,2.09-7.66,4.8A11.44,11.44,0,0,0,12.5,24Z"
      />
    </svg>
  )
}

function getProfileImageUrl(profileImage: unknown): string | null {
  if (!profileImage || typeof profileImage !== 'object') return null
  const o = profileImage as { url?: string | null; thumbnailURL?: string | null }
  const raw = o.url || o.thumbnailURL || null
  if (!raw || typeof raw !== 'string') return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  const base =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SERVER_URL
      ? process.env.NEXT_PUBLIC_SERVER_URL
      : typeof window !== 'undefined'
        ? window.location.origin
        : ''
  return base ? `${base.replace(/\/$/, '')}${raw.startsWith('/') ? raw : `/${raw}`}` : raw
}

export function AdminAccountAvatar() {
  const { user, fetchFullUser } = useAuth()
  const { config } = useConfig()
  const pathname = usePathname()
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  const adminRoute = config?.routes?.admin ?? '/admin'
  const accountRoute = config?.admin?.routes?.account ?? 'account'
  const isOnAccountPage = pathname === formatAdminURL({ adminRoute, path: accountRoute })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      try {
        const fullUser = await fetchFullUser()
        if (cancelled || !fullUser) return
        const url = getProfileImageUrl(
          (fullUser as unknown as { profileImage?: unknown })?.profileImage,
        )
        if (url) setProfileImageUrl(url)
      } catch {
        // fallback to default icon
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, fetchFullUser])

  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt=""
        width={25}
        height={25}
        style={{
          width: 25,
          height: 25,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    )
  }

  return <DefaultPlaceholder active={isOnAccountPage} />
}

export default AdminAccountAvatar
