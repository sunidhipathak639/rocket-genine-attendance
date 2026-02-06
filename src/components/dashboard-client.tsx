'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AttendanceCard } from '@/components/attendance-card'
import Image from 'next/image'
import { DashboardCalendar } from '@/components/dashboard-calendar'
import {
  LogOut,
  History,
  Calendar as CalendarIcon,
  Briefcase,
  Clock,
  Loader2,
  Menu,
  Bell,
} from 'lucide-react'
import { HolidaysCalendar } from './holidays-calendar'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePathname } from 'next/navigation'

import type { Attendance, User, Leaf, Holiday } from '@/payload-types'
import { AdminDashboardViewEnhanced } from './admin-dashboard-view-enhanced'
import { MyLeaveStatusList } from './my-leave-status-list'
import { formatTime, getProfileImageUrl } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { CustomCursor } from 'cursor-style'
import { useIdleTimer } from 'react-idle-timer'
import Typewriter from 'typewriter-effect'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import { SyncUserTheme, useTheme } from '@/components/theme-provider'
import 'react-circular-progressbar/dist/styles.css'

interface DashboardClientProps {
  user: Pick<
    User,
    'id' | 'name' | 'email' | 'role' | 'salary' | 'profileImage' | 'timeFormat' | 'theme'
  >
  initialTab?: 'dashboard' | 'history' | 'leaves' | 'holidays'
  allUsers?: User[]
  allAttendance?: Attendance[]
  pendingLeaves?: Leaf[]
  upcomingHolidays?: Holiday[]
  workSettings?: {
    saturdayWorkingDay?: boolean | null
    workStartTime?: string | null
    workEndTime?: string | null
    activityCheckInterval?: number | null
  }
  userAttendance?: Attendance[]
}

// Working days in a month (Mon–Fri, optionally Sat)
function totalWorkingDaysInMonth(year: number, month: number, saturdayWorking: boolean): number {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    const day = d.getDay()
    if (day !== 0 && (day !== 6 || saturdayWorking)) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// Count working days in month that fall inside approved leave ranges (half_day = 0.5)
function approvedLeaveDaysInMonth(
  leaves: { startDate: string; endDate: string; type?: string }[],
  year: number,
  month: number,
  saturdayWorking: boolean,
): number {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0)
  const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  let days = 0
  for (const leave of leaves) {
    const start = new Date(leave.startDate)
    const end = new Date(leave.endDate)
    const rangeStart = start < new Date(firstDay) ? new Date(firstDay) : start
    const rangeEnd = end > new Date(lastDayStr) ? new Date(lastDayStr) : end
    const d = new Date(rangeStart)
    while (d <= rangeEnd) {
      const day = d.getDay()
      if (day !== 0 && (day !== 6 || saturdayWorking)) {
        days += leave.type === 'half_day' ? 0.5 : 1
      }
      d.setDate(d.getDate() + 1)
    }
  }
  return days
}

// Parse work-settings time (ISO string) to today's date at that local time
function getTodayAtTime(isoTime: string | null | undefined): Date | null {
  if (!isoTime) return null
  const d = new Date(isoTime)
  if (Number.isNaN(d.getTime())) return null
  const t = new Date()
  t.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), 0)
  return t
}

export function DashboardClient({
  user,
  initialTab = 'dashboard',
  allUsers,
  allAttendance,
  pendingLeaves,
  upcomingHolidays,
  workSettings: workSettingsProp,
  userAttendance = [],
}: DashboardClientProps) {
  const timeFormat = user.timeFormat ?? '12h'
  const { effectiveDark } = useTheme()
  const [, setShiftTick] = useState(0)
  const [logoutLoading, setLogoutLoading] = useState(false)
  type NotificationDoc = {
    id: string
    title?: string
    body?: string
    link?: string
    read?: boolean
    createdAt: string
  }
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [notificationsUnread, setNotificationsUnread] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [approvedLeavesThisMonth, setApprovedLeavesThisMonth] = useState<
    { startDate: string; endDate: string; type?: string }[]
  >([])
  const [workSettingsLocal, setWorkSettingsLocal] = useState<typeof workSettingsProp>(undefined)
  const pathname = usePathname()

  const workSettings = workSettingsProp ?? workSettingsLocal
  const profileImageUrl = getProfileImageUrl(user.profileImage)

  // Fetch approved leaves for current month (staff) and work settings when not provided
  useEffect(() => {
    if (!user?.id || user.role !== 'staff') return
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const first = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0)
    const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    fetch(
      `/api/leaves?where[user][equals]=${user.id}&where[bookingStatus][equals]=approved&where[startDate][less_than_equal]=${last}&where[endDate][greater_than_equal]=${first}&limit=50`,
      { credentials: 'include' },
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.docs) setApprovedLeavesThisMonth(data.docs)
      })
      .catch(() => {})
  }, [user?.id, user?.role, pathname])

  useEffect(() => {
    if (workSettingsProp != null) return
    fetch('/api/globals/work-settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data) setWorkSettingsLocal(data)
      })
      .catch(() => {})
  }, [workSettingsProp])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=30', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.docs ?? [])
      setNotificationsUnread(data.unreadCount ?? 0)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 12 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setNotificationsUnread((c) => Math.max(0, c - 1))
    } catch {
      // ignore
    }
  }, [])

  const handleNotificationClick = useCallback(
    (n: NotificationDoc) => {
      markNotificationRead(n.id)
      setNotificationsOpen(false)
      if (n.link) window.open(n.link, '_blank')
    },
    [markNotificationRead],
  )

  // Re-render every minute so Shift Status circle updates
  useEffect(() => {
    const id = setInterval(() => setShiftTick((t) => t + 1), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bgRef.current) return

    const ctx = gsap.context(() => {
      gsap.to('.bg-blob-1', {
        x: '+=60',
        y: '+=40',
        rotation: 45,
        scale: 1.1,
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      gsap.to('.bg-blob-2', {
        x: '-=50',
        y: '+=70',
        rotation: -30,
        scale: 1.2,
        duration: 15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1,
      })
      gsap.to('.bg-blob-3', {
        x: '+=30',
        y: '-=50',
        rotation: 15,
        scale: 1.15,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      })
    }, bgRef)

    return () => ctx.revert()
  }, [])

  // Monthly earnings: base salary minus approved leave days (live)
  const baseSalary = user.salary || 0
  const { estimatedSalary, dailyRate, payableDays, totalWorkingDays } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const saturdayWorking = !!workSettings?.saturdayWorkingDay
    const total = totalWorkingDaysInMonth(year, month, saturdayWorking)
    const leaveDays = approvedLeaveDaysInMonth(
      approvedLeavesThisMonth ?? [],
      year,
      month,
      saturdayWorking,
    )
    const payable = Math.max(0, total - leaveDays)
    const daily = total > 0 ? baseSalary / total : baseSalary / 30
    const estimated = total > 0 ? baseSalary * (payable / total) : daily * 22
    return {
      estimatedSalary: estimated,
      dailyRate: total > 0 ? baseSalary / total : baseSalary / 30,
      payableDays: payable,
      totalWorkingDays: total,
    }
  }, [baseSalary, workSettings?.saturdayWorkingDay, approvedLeavesThisMonth])

  // Shift Status: labels from work settings (memoized); percent computed in render for live updates
  const shiftLabels = useMemo(() => {
    const start =
      getTodayAtTime(workSettings?.workStartTime ?? undefined) ??
      (() => {
        const t = new Date()
        t.setHours(9, 0, 0, 0)
        return t
      })()
    const end =
      getTodayAtTime(workSettings?.workEndTime ?? undefined) ??
      (() => {
        const t = new Date()
        t.setHours(18, 0, 0, 0)
        return t
      })()
    const hour12 = timeFormat === '12h'
    return {
      startLabel: formatTime(start, hour12),
      endLabel: formatTime(end, hour12),
      start,
      end,
    }
  }, [workSettings?.workStartTime, workSettings?.workEndTime, timeFormat])

  function getShiftPercent(): number {
    const now = new Date()
    if (now < shiftLabels.start) return 0
    if (now > shiftLabels.end) return 100
    const totalMs = shiftLabels.end.getTime() - shiftLabels.start.getTime()
    const elapsedMs = now.getTime() - shiftLabels.start.getTime()
    return Math.round((elapsedMs / totalMs) * 100)
  }

  // Week summary variables were unused and removed

  // Activity Monitor Logic using react-idle-timer
  const [showActivityPopup, setShowActivityPopup] = useState(false)
  const [timeToResponse, setTimeToResponse] = useState(60)
  const [activityPopupSummary, setActivityPopupSummary] = useState('')

  const handleActivityResponse = useCallback(
    async (status: 'active' | 'inactive', customDuration?: number, intervalSummary?: string) => {
      console.log(`[Activity] API Call: Logging as ${status}`)
      setShowActivityPopup(false)
      const duration = customDuration ?? workSettings?.activityCheckInterval ?? 10

      try {
        const res = await fetch('/api/activity-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            timestamp: new Date().toISOString(),
            duration,
            ...(typeof intervalSummary === 'string' && intervalSummary.trim()
              ? { intervalSummary: intervalSummary.trim() }
              : {}),
          }),
        })
        const data = await res.json()
        console.log('[Activity] Logged to server:', data)
      } catch (_error) {
        console.error('[Activity] Failed to log activity:', _error)
      }
    },
    [workSettings],
  )

  const onPrompt = () => {
    console.log('[Activity] Triggering Prompt Popup!')
    setShowActivityPopup(true)
    setTimeToResponse(60)
    setActivityPopupSummary('')
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.play().catch(() => {})
    } catch {}
  }

  const onIdle = () => {
    console.log('[Activity] User went Idle (No response to prompt)')
    handleActivityResponse('inactive')
  }

  const confirmedByButtonRef = useRef(false)
  const onActive = () => {
    console.log('[Activity] User is back Active')
    if (confirmedByButtonRef.current) {
      confirmedByButtonRef.current = false
      return
    }
    if (showActivityPopup) {
      handleActivityResponse('active')
    }
  }

  // Check if user is checked in TODAY (server data or local callback from AttendanceCard)
  const [localCheckedInToday, setLocalCheckedInToday] = useState<boolean | null>(null)
  const nowStr = new Date().toISOString().split('T')[0]
  const serverCheckedInToday = userAttendance?.some((a) => {
    const aDate = typeof a.date === 'string' ? a.date.split('T')[0] : ''
    return aDate === nowStr && a.timeIn && !a.timeOut
  })
  const isCheckedInToday = localCheckedInToday ?? serverCheckedInToday ?? false

  const intervalMinutesFromSettings = workSettings?.activityCheckInterval ?? 10
  const intervalMs = intervalMinutesFromSettings * 60 * 1000
  const intervalDisplayText = `${intervalMinutesFromSettings} min`

  const promptBeforeIdleMs = 60 * 1000 // 60 seconds to respond
  // Timeout is the TOTAL time (Idle + Prompt). Prompt shows after interval of idleness.
  const timeoutMs = intervalMs + promptBeforeIdleMs

  const { getRemainingTime, getLastActiveTime, activate } = useIdleTimer({
    onPrompt,
    onIdle,
    onActive,
    timeout: timeoutMs,
    promptBeforeIdle: promptBeforeIdleMs,
    throttle: 250,
    disabled: !isCheckedInToday,
    crossTab: false,
    leaderElection: false,
    syncTimers: 200,
  })

  // Sync countdown UI with remaining prompt time
  useEffect(() => {
    if (!showActivityPopup) return

    const interval = setInterval(() => {
      const remaining = Math.ceil(getRemainingTime() / 1000)
      setTimeToResponse(remaining > 0 ? remaining : 0)
    }, 1000)

    return () => clearInterval(interval)
  }, [showActivityPopup, getRemainingTime])

  // When tab becomes visible again, show prompt if user was idle longer than the interval
  // (timers are throttled in background tabs, so onPrompt may never fire until they return)
  useEffect(() => {
    if (!isCheckedInToday) return

    const handleVisibility = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
      if (showActivityPopup) return

      const lastActive = getLastActiveTime()
      if (!lastActive) return

      const idleMs = Date.now() - lastActive.getTime()
      if (idleMs >= intervalMs) {
        setShowActivityPopup(true)
        setTimeToResponse(60)
        setActivityPopupSummary('')
        try {
          const audio = new Audio(
            'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
          )
          audio.play().catch(() => {})
        } catch {}
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isCheckedInToday, showActivityPopup, intervalMs, getLastActiveTime])

  // Reliable polling fallback: show popup when idle time exceeds configured duration
  // (react-idle-timer's onPrompt can miss when tab is backgrounded or due to browser throttling)
  useEffect(() => {
    if (!isCheckedInToday || showActivityPopup) return

    const pollIntervalMs =
      intervalMs <= 60 * 1000 ? 2000 : intervalMs <= 2 * 60 * 1000 ? 5000 : 10000

    const poll = () => {
      const lastActive = getLastActiveTime()
      if (!lastActive) return

      const idleMs = Date.now() - lastActive.getTime()
      if (idleMs >= intervalMs) {
        setShowActivityPopup(true)
        setTimeToResponse(60)
        setActivityPopupSummary('')
        try {
          const audio = new Audio(
            'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
          )
          audio.play().catch(() => {})
        } catch {}
      }
    }

    const id = setInterval(poll, pollIntervalMs)
    return () => clearInterval(id)
  }, [isCheckedInToday, showActivityPopup, intervalMs, getLastActiveTime])

  const handleConfirmPresence = () => {
    console.log('[Activity] User confirmed presence')
    confirmedByButtonRef.current = true
    handleActivityResponse('active', undefined, activityPopupSummary)
    setActivityPopupSummary('')
    activate() // Reset idle timer
  }

  // Show admin dashboard if user is admin
  if (user.role === 'admin' && allUsers && allAttendance) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-foreground font-sans selection:bg-indigo-100">
        <SyncUserTheme theme={user.theme ?? undefined} />
        <CustomCursor type="five" showImages imageSize={30} imageFollowDelay={20} />
        {/* Premium Header */}
        <header className="sticky top-0 z-30 bg-white/50 dark:bg-card/60 backdrop-blur-[20px] border-b border-border/80 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 md:gap-3">
              <motion.div
                className="w-11 h-11 md:w-14 md:h-14 relative flex-shrink-0"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/rocket-genie-logo.webp"
                  alt="Rocket Genie"
                  fill
                  className="object-contain"
                />
              </motion.div>
              <span className="font-black text-2xl tracking-tighter text-indigo-600 flex items-center">
                <Typewriter
                  options={{
                    strings: ['Rocket Genie'],
                    autoStart: true,
                    loop: true,
                    delay: 50,
                    deleteSpeed: 25,
                    cursor: '',
                  }}
                />
              </span>
            </div>

            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-border/80 absolute left-1/2 -translate-x-1/2">
              <button
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${pathname === '/' ? 'bg-white dark:bg-muted text-indigo-600 dark:text-primary shadow-sm' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground'}`}
              >
                Dashboard
              </button>
              <Link
                href="/admin/collections/users"
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 rounded-lg"
              >
                Employees
              </Link>
              <Link
                href="/admin/globals/work-settings"
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 rounded-lg"
              >
                Work Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden xl:block">
              <input
                type="text"
                placeholder="Search anything..."
                className="pl-10 pr-4 py-2.5 bg-slate-100/50 border border-border/80 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 pl-4 md:pl-6 border-l border-border">
              <div className="text-right hidden sm:block">
                <span className="block text-xs md:text-sm font-bold text-slate-900 dark:text-foreground truncate max-w-[100px] md:max-w-none">
                  {user.name || user.email}
                </span>
                <span className="block text-[8px] md:text-[10px] uppercase tracking-widest font-black text-slate-400">
                  ADMINISTRATOR
                </span>
              </div>
              <Link
                href="/profile"
                className="relative block focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full"
              >
                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                <div className="absolute -inset-1 bg-indigo-500/20 rounded-full animate-pulse" />
                <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-border text-xs md:text-base z-10 transition-transform hover:scale-105 overflow-hidden">
                  {profileImageUrl ? (
                    <Image
                      src={profileImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                      unoptimized={profileImageUrl.startsWith('http')}
                    />
                  ) : (
                    user.name?.[0] || user.email?.[0]?.toUpperCase()
                  )}
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                disabled={logoutLoading}
                onClick={async () => {
                  setLogoutLoading(true)
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' })
                    window.location.href = '/admin/login'
                  } catch (_error) {
                    window.location.href = '/admin/login'
                  }
                }}
              >
                {logoutLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-8 py-6 md:py-10 max-w-[1600px]">
          <div className="mb-6 md:mb-10 text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-foreground mb-1 md:mb-2 italic">
              Hello, {user.name?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-slate-500 font-medium">
              Its{' '}
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <AdminDashboardViewEnhanced
            allUsers={allUsers}
            allAttendance={allAttendance}
            pendingLeaves={pendingLeaves}
            upcomingHolidays={upcomingHolidays}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent relative" ref={bgRef}>
      <SyncUserTheme theme={user.theme ?? undefined} />
      <CustomCursor type="five" showImages imageSize={30} imageFollowDelay={20} />
      {/* Extra moving blobs (on top of layout fluid) for more depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="bg-blob-1 absolute -top-24 -left-24 w-96 h-96 bg-indigo-300/15 dark:bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="bg-blob-2 absolute top-1/2 -right-24 w-[500px] h-[500px] bg-blue-300/12 dark:bg-indigo-500/8 rounded-full blur-[120px]" />
        <div className="bg-blob-3 absolute -bottom-24 left-1/3 w-80 h-80 bg-violet-300/15 dark:bg-violet-500/10 rounded-full blur-[90px]" />
      </div>

      {/* Activity Check Popup */}
      <Dialog
        open={showActivityPopup}
        onOpenChange={(open) => {
          if (!open) handleActivityResponse('inactive')
        }}
      >
        <DialogContent
          className="sm:max-w-md rounded-3xl border-none shadow-2xl overflow-hidden p-0 bg-white/80 dark:bg-card/90 backdrop-blur-xl border dark:border-border"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="bg-indigo-600 dark:bg-primary p-8 text-white">
            <DialogTitle className="text-2xl font-black mb-2 text-white">
              Are you still working?
            </DialogTitle>
            <p className="opacity-80 font-medium">
              We monitor activity to ensure accurate time logs.
            </p>
          </div>
          <div className="p-8 space-y-4 bg-white/70 dark:bg-card/80 backdrop-blur-xl">
            <div className="flex flex-col items-center justify-center mb-6 py-12 bg-white/60 dark:bg-muted/40 backdrop-blur-lg rounded-[48px] border border-border shadow-[0_20px_50px_rgba(79,70,229,0.05)] relative overflow-hidden group/clock">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/10 dark:from-primary/10 via-transparent to-transparent opacity-0 group-hover/clock:opacity-100 transition-opacity duration-700" />
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-600/5 dark:bg-primary/10 rounded-full blur-3xl group-hover/clock:bg-indigo-600/10 transition-colors duration-700" />
              <div
                className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeToResponse / 60) * 100}%` }}
              />
              <div className="w-16 h-16 bg-indigo-50 dark:bg-primary/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-primary mb-4 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-black text-4xl text-slate-900 dark:text-foreground tabular-nums">
                  00:{String(timeToResponse).padStart(2, '0')}
                </p>
                <p className="text-xs text-slate-400 dark:text-muted-foreground font-black uppercase tracking-widest mt-2">
                  Seconds Remaining
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="activity-interval-summary"
                className="text-sm font-bold text-slate-700 dark:text-foreground"
              >
                What did you work on in the last {intervalDisplayText}? (optional)
              </label>
              <textarea
                id="activity-interval-summary"
                value={activityPopupSummary}
                onChange={(e) => setActivityPopupSummary(e.target.value)}
                placeholder="e.g. Code review, emails, design mockups..."
                className="w-full min-h-[88px] px-4 py-3 rounded-xl border border-border bg-white dark:bg-muted/50 text-slate-900 dark:text-foreground placeholder:text-slate-400 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={2000}
              />
            </div>
            <Button
              className="w-full bg-indigo-600 dark:bg-primary hover:bg-slate-900 dark:hover:bg-primary/90 text-white rounded-2xl py-6 font-bold text-base shadow-lg shadow-indigo-100 dark:shadow-none transition-all hover:-translate-y-0.5"
              onClick={handleConfirmPresence}
            >
              Yes, I&apos;m Working
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 w-full bg-white/50 dark:bg-card/60 backdrop-blur-[20px] border-b border-border/80 px-4 md:px-8 py-3 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 md:gap-4 group cursor-pointer"
        >
          <motion.div
            className="w-11 h-11 md:w-14 md:h-14 relative flex-shrink-0"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/rocket-genie-logo.webp"
              alt="Rocket Genie"
              fill
              className="object-contain"
            />
          </motion.div>
          <span className="font-black text-xl md:text-2xl tracking-tighter text-indigo-600 flex items-center">
            <Typewriter
              options={{
                strings: ['Rocket Genie'],
                autoStart: true,
                loop: true,
                delay: 50,
                deleteSpeed: 25,
                cursor: '',
              }}
            />
          </span>
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden lg:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-border/80 dark:border-border absolute left-1/2 -translate-x-1/2"
        >
          {[
            { label: 'Dashboard', href: '/', id: 'overview' },
            { label: 'History', href: '/history', id: 'history' },
            { label: 'Leaves', href: '/leaves', id: 'leaves' },
            { label: 'Holidays', href: '/holidays', id: 'holidays' },
          ].map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${pathname === item.href ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {item.label}
            </Link>
          ))}
        </motion.nav>

        {/* Mobile Navigation Trigger */}
        <div className="lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-border lg:hidden"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] w-full left-1/2 -translate-x-1/2 top-4 translate-y-0 rounded-2xl border-none shadow-2xl p-6 lg:hidden bg-white/80 dark:bg-card/90 backdrop-blur-xl border dark:border-border">
              <DialogTitle className="sr-only">Navigation menu</DialogTitle>
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-foreground">
                    Rocket{' '}
                    <motion.span
                      animate={{
                        color: ['#4f46e5', '#8b5cf6', '#ec4899', '#4f46e5'],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      Genie
                    </motion.span>
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Dashboard', href: '/', id: 'overview' },
                    { label: 'History', href: '/history', id: 'history' },
                    { label: 'Leaves', href: '/leaves', id: 'leaves' },
                    { label: 'Holidays', href: '/holidays', id: 'holidays' },
                  ].map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`px-4 py-3 text-base font-bold rounded-xl transition-all ${pathname === item.href ? 'bg-indigo-50 dark:bg-primary/20 text-indigo-600 dark:text-primary' : 'text-slate-500 dark:text-muted-foreground active:bg-slate-50 dark:active:bg-muted'}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2 md:gap-6">
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl w-8 h-8 md:w-10 md:h-10"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
                {notificationsUnread > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {notificationsUnread > 99 ? '99+' : notificationsUnread}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(90vw,360px)] p-0 rounded-xl shadow-xl"
              align="end"
              sideOffset={8}
            >
              <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-foreground">
                  Notifications
                </span>
                {notificationsUnread > 0 && (
                  <span className="text-xs text-slate-500 dark:text-muted-foreground">
                    {notificationsUnread} unread
                  </span>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-border/60 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-muted/50 ${!n.read ? 'bg-indigo-50/80 dark:bg-primary/10' : ''}`}
                    >
                      <p className="font-semibold text-sm text-slate-900 dark:text-foreground line-clamp-1">
                        {n.title || 'Notification'}
                      </p>
                      {n.body && (
                        <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 dark:text-muted-foreground mt-1">
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2 md:gap-3 md:pl-6 md:border-l border-border">
            <div className="hidden sm:block text-right">
              <span className="block text-sm font-bold text-slate-900 dark:text-foreground line-clamp-1">
                {user.name || user.email}
              </span>
              <span className="block text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-muted-foreground">
                {user.role?.toUpperCase()}
              </span>
            </div>
            <Link
              href="/profile"
              className="relative block focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full flex-shrink-0"
            >
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-full animate-pulse" />
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold border-2 border-border text-xs md:text-sm z-10 transition-transform hover:scale-105 overflow-hidden">
                {profileImageUrl ? (
                  <Image
                    src={profileImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized={profileImageUrl.startsWith('http')}
                  />
                ) : (
                  user.name?.[0] || user.email?.[0]?.toUpperCase()
                )}
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl w-8 h-8 md:w-10 md:h-10 hover:bg-red-50 hover:text-red-500 transition-colors"
              disabled={logoutLoading}
              onClick={async () => {
                setLogoutLoading(true)
                try {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  window.location.href = '/login'
                } catch (_error) {
                  window.location.href = '/login'
                }
              }}
            >
              {logoutLoading ? (
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 pt-24 pb-10 max-w-[1600px] relative z-10">
        <div className="flex flex-col xl:flex-row gap-6 md:gap-10">
          {/* Main Dashboard Area */}
          <div className="flex-1 space-y-8 md:space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
            >
              <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-foreground mb-1 md:mb-2">
                  Hello, {user.name?.split(' ')[0] || 'Staff'}
                </h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-muted-foreground font-medium">
                  Its{' '}
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="w-full sm:w-auto bg-white dark:bg-card border-2 border-indigo-100 dark:border-border text-indigo-600 dark:text-primary hover:bg-indigo-50 dark:hover:bg-muted font-bold px-6 md:px-8 py-5 md:py-6 rounded-2xl shadow-sm transition-all">
                        <CalendarIcon className="w-5 h-5 mr-3" />
                        My Calendar
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] md:max-w-5xl rounded-2xl md:rounded-3xl p-0 border-none shadow-2xl bg-white/85 dark:bg-card/90 backdrop-blur-xl border dark:border-border">
                    <DialogTitle className="sr-only">My Calendar</DialogTitle>
                    <DashboardCalendar user={user} />
                  </DialogContent>
                </Dialog>

                <Link href="/leaves" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="w-full bg-indigo-600 dark:bg-primary text-white hover:bg-slate-900 dark:hover:bg-primary/90 font-bold px-6 md:px-8 py-5 md:py-6 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all">
                      Apply Leave
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {initialTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                >
                  {/* Attendance Hero Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', damping: 20 }}
                    className="lg:col-span-8"
                  >
                    <AttendanceCard
                      user={user}
                      timeFormat={timeFormat}
                      onCheckInSuccess={() => setLocalCheckedInToday(true)}
                      onCheckOutSuccess={() => setLocalCheckedInToday(false)}
                    />
                  </motion.div>

                  {/* Quick Stats Sidebar */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-4 space-y-6"
                  >
                    {/* Popup duration from backend (Work Settings) */}
                    {/* {workSettings != null && (
                      <div className="rounded-xl border border-border bg-slate-50/80 dark:bg-slate-900/50 px-4 py-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Activity popup: after{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {intervalMinutesFromSettings} min
                          </span>{' '}
                          of no activity (from Work Settings)
                        </p>
                      </div>
                    )} */}

                    <div className="dashboard-card p-8 border border-border relative overflow-hidden">
                      {!workSettings ? (
                        <div className="space-y-6">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-40 w-full rounded-full" />
                        </div>
                      ) : (
                        <>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                          <div className="flex items-center justify-between mb-8 relative z-10">
                            <h4 className="font-black text-slate-900 dark:text-muted-foreground tracking-tighter uppercase text-xs opacity-50">
                              Shift Status
                            </h4>
                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Clock className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="w-48 h-48 mb-6 relative">
                              <CircularProgressbar
                                value={getShiftPercent()}
                                text={`${getShiftPercent()}%`}
                                styles={buildStyles({
                                  textSize: '16px',
                                  pathColor: '#6366f1',
                                  textColor: effectiveDark ? '#e2e8f0' : '#0f172a',
                                  trailColor: effectiveDark ? '#2d3548' : '#e2e8f0',
                                  pathTransitionDuration: 1,
                                })}
                              />
                              <div className="absolute inset-0 flex items-center justify-center flex-col pt-8 pointer-events-none">
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-muted-foreground">
                                  Shift elapsed
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                              <div className="p-4 bg-white/60 dark:bg-muted rounded-2xl border border-border text-center">
                                <p className="text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest mb-1">
                                  Start
                                </p>
                                <p className="text-lg font-black text-slate-900 dark:text-foreground">
                                  {shiftLabels.startLabel}
                                </p>
                              </div>
                              <div className="p-4 bg-white/60 dark:bg-muted rounded-2xl border border-border text-center">
                                <p className="text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest mb-1">
                                  End
                                </p>
                                <p className="text-lg font-black text-slate-900 dark:text-foreground">
                                  {shiftLabels.endLabel}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {user.role === 'staff' && (
                      <div className="dashboard-card p-8 bg-indigo-600 text-white relative overflow-hidden group">
                        {!workSettings ? (
                          <div className="space-y-6">
                            <Skeleton className="h-4 w-24 bg-white/20" />
                            <Skeleton className="h-40 w-full rounded-full bg-white/10" />
                          </div>
                        ) : (
                          <>
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/20 transition-colors duration-700" />
                            <div className="relative z-10 flex flex-col items-center">
                              <h4 className="font-black text-indigo-200 tracking-widest uppercase text-[10px] mb-8 self-start">
                                Estimated Salary •{' '}
                                {new Date().toLocaleDateString('en-US', { month: 'long' })}
                              </h4>

                              <div className="w-48 h-48 mb-8 relative">
                                <CircularProgressbar
                                  value={
                                    totalWorkingDays > 0
                                      ? (payableDays / totalWorkingDays) * 100
                                      : 0
                                  }
                                  text={`${totalWorkingDays > 0 ? Math.round((payableDays / totalWorkingDays) * 100) : 0}%`}
                                  styles={buildStyles({
                                    textSize: '16px',
                                    pathColor: '#ffffff',
                                    textColor: '#ffffff',
                                    trailColor: 'rgba(255,255,255,0.2)',
                                    pathTransitionDuration: 1.5,
                                  })}
                                />
                                <div className="absolute inset-0 flex items-center justify-center flex-col pt-8 pointer-events-none">
                                  <span className="text-[10px] font-black uppercase text-indigo-200">
                                    Working days
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-center gap-1 mb-8">
                                <span className="text-4xl font-black tracking-tighter">
                                  ₹
                                  {typeof estimatedSalary === 'number'
                                    ? estimatedSalary.toLocaleString('en-IN', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                      })
                                    : String(estimatedSalary)}
                                </span>
                                <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">
                                  Net Payable
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-indigo-400/50 text-center">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-1">
                                    Daily rate
                                  </p>
                                  <p className="text-sm font-black">
                                    ₹{Math.round(dailyRate).toLocaleString('en-IN')}
                                  </p>
                                </div>
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-indigo-400/50 text-center">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-1">
                                    Payable days
                                  </p>
                                  <p className="text-sm font-black">
                                    {payableDays} of {totalWorkingDays}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}

              {initialTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-card p-6 md:p-10 border-white/20 dark:border-border"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-foreground border-l-4 border-indigo-600 dark:border-primary pl-4">
                        Session <span className="text-indigo-600">Archive</span>
                      </h2>
                      <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                        Detailed log of your presence and activity.
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <History className="w-10 h-10 text-slate-200" />
                    </div>
                  </div>
                  <DashboardCalendar user={user} workSettings={workSettings} />
                </motion.div>
              )}

              {initialTab === 'leaves' && (
                <motion.div
                  key="leaves"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 md:space-y-8"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
                    <div className="lg:col-span-12 dashboard-card p-6 md:p-10 border-white/20 dark:border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                          <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-foreground border-l-4 border-indigo-600 dark:border-primary pl-4">
                            Leave <span className="text-indigo-600">Ledger</span>
                          </h2>
                          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                            Monitor the status of your submitted requests.
                          </p>
                        </div>
                      </div>
                      <MyLeaveStatusList user={user} />
                    </div>
                    <div className="lg:col-span-12 dashboard-card p-6 md:p-10 border-white/20 dark:border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                          <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-foreground border-l-4 border-indigo-600 dark:border-primary pl-4">
                            Request <span className="text-indigo-600">Time Off</span>
                          </h2>
                          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                            Select dates on the calendar to begin your application.
                          </p>
                        </div>
                      </div>
                      <DashboardCalendar user={user} workSettings={workSettings} />
                    </div>
                  </div>
                </motion.div>
              )}

              {initialTab === 'holidays' && (
                <motion.div
                  key="holidays"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <HolidaysCalendar user={user} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
