import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolve profile image URL from user.profileImage (object with url/thumbnailURL).
 * Prefers url, falls back to thumbnailURL. Makes relative URLs absolute for display.
 */
export function getProfileImageUrl(
  profileImage: { url?: string | null; thumbnailURL?: string | null } | number | null | undefined,
): string | null {
  if (!profileImage || typeof profileImage === 'number') return null
  const raw = profileImage.url || profileImage.thumbnailURL || null
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

/** Format time deterministically (same on server and client) to avoid hydration mismatch */
export function formatTime(date: Date, hour12: boolean): string {
  const h = date.getHours()
  const m = date.getMinutes()
  if (hour12) {
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
