'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  User,
  Mail,
  Briefcase,
  Building2,
  Banknote,
  Loader2,
  Camera,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { User as UserType } from '@/payload-types'

const MAX_PROFILE_IMAGE_BYTES = 1024 * 1024 // 1 MB

function getProfileImageUrl(user: UserWithProfileImage): string | null {
  const img = user.profileImage
  if (!img) return null
  if (typeof img === 'object' && img !== null && 'url' in img && img.url) return img.url
  return null
}

type UserWithProfileImage = Omit<UserType, 'profileImage'> & {
  profileImage?: { url: string; alt?: string } | number | null
}

interface ProfilePageClientProps {
  user: UserWithProfileImage
}

export function ProfilePageClient({ user: initialUser }: ProfilePageClientProps) {
  const [user, setUser] = useState(initialUser)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const profileImageUrl = getProfileImageUrl(user)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, or WebP).')
      return
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error('Profile picture must be under 1 MB. Please choose a smaller image.')
      return
    }

    setUploading(true)
    try {
      const uploadRes = await fetch(
        `/api/upload?filename=profile-${user.id}-${Date.now()}-${file.name}`,
        {
          method: 'POST',
          body: file,
          credentials: 'include',
        },
      )
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { url } = await uploadRes.json()

      const mediaRes = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          filename: file.name,
          alt: `Profile picture of ${user.name || 'user'}`,
        }),
      })
      if (!mediaRes.ok) throw new Error('Failed to create media record')
      const mediaDoc = await mediaRes.json()
      const mediaId = mediaDoc.doc?.id ?? mediaDoc.id

      const updateRes = await fetch('/api/profile-image', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImage: mediaId, userId: user.id }),
      })
      if (!updateRes.ok) {
        const err = await updateRes.json()
        throw new Error(err.message || 'Failed to update profile')
      }
      setUser(
        (prev) => ({ ...prev, profileImage: { url, alt: file.name } }) as UserWithProfileImage,
      )
      toast.success('Profile picture updated.')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to update profile picture.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-8 py-4 max-w-[900px] flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">My Profile</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-[900px]">
        <div className="dashboard-card p-6 md:p-10 bg-white/80 backdrop-blur-xl border-white/20 shadow-xl rounded-3xl">
          {/* Profile picture */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative group">
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-indigo-100 border-4 border-white shadow-lg flex items-center justify-center text-indigo-600 text-3xl md:text-4xl font-black">
                {profileImageUrl ? (
                  <Image
                    src={profileImageUrl}
                    alt={user.name || 'Profile'}
                    fill
                    className="object-cover"
                    sizes="144px"
                    unoptimized={
                      profileImageUrl.startsWith('http') &&
                      !profileImageUrl.includes(process.env.NEXT_PUBLIC_APP_URL || '')
                    }
                  />
                ) : (
                  <span>{user.name?.[0] || user.email?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">Max 1 MB • JPEG, PNG or WebP</p>
          </div>

          {/* Read-only details */}
          <div className="space-y-6">
            <DetailRow icon={User} label="Name" value={user.name ?? '—'} />
            <DetailRow icon={Mail} label="Email" value={user.email ?? '—'} />
            <DetailRow
              icon={Briefcase}
              label="Role"
              value={
                user.role
                  ? String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1)
                  : '—'
              }
            />
            <DetailRow icon={Building2} label="Department" value={user.department ?? '—'} />
            {user.salary != null && (
              <DetailRow
                icon={Banknote}
                label="Monthly salary (INR)"
                value={`₹${Number(user.salary).toLocaleString('en-IN')}`}
              />
            )}
          </div>

          {/* Contact admin notice */}
          <div className="mt-10 p-4 md:p-6 rounded-2xl bg-amber-50 border border-amber-200 flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Need to change any of these details?</p>
              <p className="text-sm text-amber-800 mt-1">
                To update your name, email, role, department or salary, please contact your
                administrator.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link href="/">
              <Button variant="outline" className="rounded-xl font-bold">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-base font-bold text-slate-900 break-words">{value}</p>
      </div>
    </div>
  )
}
