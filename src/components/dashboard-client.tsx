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
} from 'lucide-react'
import { HolidaysCalendar } from './holidays-calendar'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { usePathname } from 'next/navigation'

import type { Attendance, User } from '@/payload-types'
import { AdminDashboardView } from './admin-dashboard-view'
import { MyLeaveStatusList } from './my-leave-status-list'
import { formatTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardClientProps {
  user: {
    id: string | number
    name?: string | null
    email?: string | null
    role?: string | null
    salary?: number | null
  }
  initialTab?: 'dashboard' | 'history' | 'leaves' | 'holidays'
  allUsers?: User[]
  allAttendance?: Attendance[]
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

export function DashboardClient({
  user,
  initialTab = 'dashboard',
  allUsers,
  allAttendance,
  workSettings: workSettingsProp,
  userAttendance = [],
}: DashboardClientProps) {
  const [timeFormat] = useState<'12h' | '24h'>('12h')
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [approvedLeavesThisMonth, setApprovedLeavesThisMonth] = useState<
    { startDate: string; endDate: string; type?: string }[]
  >([])
  const [workSettingsLocal, setWorkSettingsLocal] = useState<typeof workSettingsProp>(undefined)
  const pathname = usePathname()

  const workSettings = workSettingsProp ?? workSettingsLocal

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

  // Monthly earnings: base salary minus approved leave days (live)
  const baseSalary = user.salary || 0
  const { estimatedSalary, dailyRate, payableDays } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const saturdayWorking = !!workSettings?.saturdayWorkingDay
    const total = totalWorkingDaysInMonth(year, month, saturdayWorking)
    const leaveDays = approvedLeaveDaysInMonth(
      approvedLeavesThisMonth,
      year,
      month,
      saturdayWorking,
    )
    const payable = Math.max(0, total - leaveDays)
    const daily = total > 0 ? baseSalary / total : baseSalary / 30
    const estimated = total > 0 ? baseSalary * (payable / total) : daily * 22
    return {
      estimatedSalary: estimated.toFixed(2),
      dailyRate: total > 0 ? baseSalary / total : baseSalary / 30,
      payableDays: payable,
    }
  }, [baseSalary, workSettings?.saturdayWorkingDay, approvedLeavesThisMonth])

  // Week summary variables were unused and removed

  // Activity Monitor Logic
  const [showActivityPopup, setShowActivityPopup] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<number>(() => Date.now())
  const lastCheckTimeRef = useRef(lastCheckTime)
  const showActivityPopupRef = useRef(showActivityPopup)
  lastCheckTimeRef.current = lastCheckTime
  showActivityPopupRef.current = showActivityPopup

  const handleActivityResponse = useCallback(
    async (status: 'active' | 'inactive', customDuration?: number) => {
      setShowActivityPopup(false)
      const now = Date.now()
      setLastCheckTime(now)
      lastCheckTimeRef.current = now
      localStorage.setItem('lastActivityCheck', now.toString())

      const duration = customDuration ?? workSettings?.activityCheckInterval ?? 10

      try {
        await fetch('/api/activity-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            timestamp: new Date().toISOString(),
            duration,
          }),
        })
      } catch (_error) {
        console.error('Failed to log activity:', _error)
      }
    },
    [workSettings],
  )

  // Timer for activity check — use refs so interval always sees latest values and doesn't reset
  useEffect(() => {
    // Today in local date (YYYY-MM-DD) so timezone doesn't break the check
    const now = new Date()
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const isCheckedIn = userAttendance?.some((a) => {
      let dateStr: string
      if (typeof a.date === 'string') dateStr = a.date
      else if (a.date) {
        const d = new Date(a.date as string | Date)
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      } else dateStr = ''
      return dateStr === todayLocal && a.timeIn && !a.timeOut
    })

    if (!isCheckedIn) return

    const intervalMinutes = workSettings?.activityCheckInterval ?? 10
    const CHECK_INTERVAL_MS = intervalMinutes * 60 * 1000
    const RESPONSE_TIMEOUT = 60 * 1000

    // When testing with short intervals (≤2 min), don't restore from localStorage so popup starts from "now"
    const skipRestore = intervalMinutes <= 2
    if (!skipRestore) {
      const storedLastCheck = localStorage.getItem('lastActivityCheck')
      if (storedLastCheck) {
        const timestamp = parseInt(storedLastCheck, 10)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setLastCheckTime(timestamp)
          lastCheckTimeRef.current = timestamp
        }
      }
    }

    // Check every 1s when interval is short (faster feedback for 1-min testing), else every 5s
    const tickMs = intervalMinutes <= 2 ? 1000 : 5000

    const timer = setInterval(() => {
      const now = Date.now()
      const last = lastCheckTimeRef.current
      const popupOpen = showActivityPopupRef.current
      if (!popupOpen && now - last >= CHECK_INTERVAL_MS) {
        setShowActivityPopup(true)
        showActivityPopupRef.current = true

        try {
          const audio = new Audio('/notification.mp3')
          audio.play().catch(() => {})
        } catch {}

        setTimeout(() => {
          setShowActivityPopup((currentShow) => {
            if (currentShow) {
              handleActivityResponse('inactive', intervalMinutes)
              showActivityPopupRef.current = false
              return false
            }
            return currentShow
          })
        }, RESPONSE_TIMEOUT)
      }
    }, tickMs)

    return () => clearInterval(timer)
  }, [userAttendance, workSettings, handleActivityResponse])

  // Show admin dashboard if user is admin
  if (user.role === 'admin' && allUsers && allAttendance) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]/50 text-slate-900 font-sans selection:bg-indigo-100">
        {/* Premium Header */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 relative">
                <Image
                  src="/rocket-genie-logo.webp"
                  alt="Rocket Genie"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="font-black text-2xl tracking-tighter text-slate-900">
                Rocket <span className="text-indigo-600">Genie</span>
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
              <button
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${pathname === '/' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
                className="pl-10 pr-4 py-2.5 bg-slate-100/50 border border-slate-200/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
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

            <div className="flex items-center gap-2 md:gap-3 pl-4 md:pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <span className="block text-xs md:text-sm font-bold text-slate-900 truncate max-w-[100px] md:max-w-none">
                  {user.name || user.email}
                </span>
                <span className="block text-[8px] md:text-[10px] uppercase tracking-widest font-black text-slate-400">
                  ADMINISTRATOR
                </span>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-indigo-50 text-xs md:text-base">
                {user.name?.[0] || user.email?.[0]?.toUpperCase()}
              </div>
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
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 mb-1 md:mb-2 italic">
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

          <AdminDashboardView allUsers={allUsers} allAttendance={allAttendance} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]/50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Activity Check Popup */}
      <Dialog
        open={showActivityPopup}
        onOpenChange={(open) => {
          if (!open) handleActivityResponse('inactive')
        }}
      >
        <DialogContent
          className="sm:max-w-md rounded-3xl border-none shadow-2xl overflow-hidden p-0"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="bg-indigo-600 p-8 text-white">
            <h2 className="text-2xl font-black mb-2">Are you still working?</h2>
            <p className="opacity-80 font-medium">
              We monitor activity to ensure accurate time logs.
            </p>
          </div>
          <div className="p-8 space-y-4">
            <div className="flex flex-col items-center justify-center mb-12 py-16 bg-white rounded-[48px] border border-slate-100 shadow-[0_20px_50px_rgba(79,70,229,0.05)] relative overflow-hidden group/clock">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/10 via-transparent to-transparent opacity-0 group-hover/clock:opacity-100 transition-opacity duration-700" />
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl group-hover/clock:bg-indigo-600/10 transition-colors duration-700" />
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Activity Check</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Please confirm presence within 60 seconds.
                </p>
              </div>
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl py-6 font-bold text-base shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5"
              onClick={() => handleActivityResponse('active')}
            >
              Yes, I&apos;m Working
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Navigation */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4 group cursor-pointer">
          <div className="w-8 h-8 md:w-10 md:h-10 relative">
            <Image
              src="/rocket-genie-logo.webp"
              alt="Rocket Genie"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-black text-xl md:text-2xl tracking-tighter text-slate-900">
            Rocket <span className="text-indigo-600">Genie</span>
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
          {[
            { label: 'Dashboard', href: '/', id: 'overview' },
            { label: 'History', href: '/history', id: 'history' },
            { label: 'Leaves', href: '/leaves', id: 'leaves' },
            { label: 'Holidays', href: '/holidays', id: 'holidays' },
          ].map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${pathname === item.href ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Navigation Trigger */}
        <div className="lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-slate-200 lg:hidden"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[85vw] left-[7.5vw] top-4 translate-y-0 rounded-2xl border-none shadow-2xl p-6 lg:hidden">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-xl tracking-tighter text-slate-900">
                    Rocket <span className="text-indigo-600">Genie</span>
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
                      className={`px-4 py-3 text-base font-bold rounded-xl transition-all ${pathname === item.href ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 active:bg-slate-50'}`}
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
          <div className="flex items-center gap-2 md:gap-3 md:pl-6 md:border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <span className="block text-sm font-bold text-slate-900 line-clamp-1">
                {user.name || user.email}
              </span>
              <span className="block text-[10px] uppercase tracking-widest font-black text-slate-400">
                {user.role?.toUpperCase()}
              </span>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold border-2 border-indigo-50 flex-shrink-0 text-xs md:text-sm">
              {user.name?.[0] || user.email?.[0]?.toUpperCase()}
            </div>
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

      <main className="container mx-auto px-4 md:px-8 py-6 md:py-10 max-w-[1600px]">
        <div className="flex flex-col xl:flex-row gap-6 md:gap-10">
          {/* Main Dashboard Area */}
          <div className="flex-1 space-y-8 md:space-y-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-1 md:mb-2">
                  Hello, {user.name?.split(' ')[0] || 'Staff'}
                </h1>
                <p className="text-sm md:text-base text-slate-500 font-medium">
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
                    <Button className="w-full sm:w-auto bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold px-6 md:px-8 py-5 md:py-6 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5">
                      <CalendarIcon className="w-5 h-5 mr-3" />
                      My Calendar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] md:max-w-5xl rounded-2xl md:rounded-3xl p-0 border-none shadow-2xl">
                    <DashboardCalendar user={user} />
                  </DialogContent>
                </Dialog>

                <Link href="/leaves" className="w-full sm:w-auto">
                  <Button className="w-full bg-indigo-600 text-white hover:bg-slate-900 font-bold px-6 md:px-8 py-5 md:py-6 rounded-2xl shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5">
                    Apply Leave
                  </Button>
                </Link>
              </div>
            </div>

            {initialTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Attendance Hero Card */}
                <div className="lg:col-span-8">
                  <AttendanceCard user={user} timeFormat={timeFormat} />
                </div>

                {/* Quick Stats Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Salary Card Skeleton or Real */}
                  <div className="dashboard-card p-8 bg-white/40 backdrop-blur-xl border-white/20 relative overflow-hidden">
                    {!workSettings ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="w-10 h-10 rounded-xl" />
                        </div>
                        <div className="space-y-4">
                          <Skeleton className="h-16 w-full rounded-2xl" />
                          <Skeleton className="h-16 w-full rounded-2xl" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="flex items-center justify-between mb-8 relative z-10">
                          <h4 className="font-black text-slate-900 tracking-tighter uppercase text-xs opacity-50">
                            Standard Schedule
                          </h4>
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Clock className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="space-y-6">
                          {/* Schedule entries */}
                          <div className="p-5 bg-white/60 rounded-[28px] border border-white/40 shadow-sm relative group/stat transition-all hover:bg-white hover:shadow-md">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                <Clock className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Shift Start
                                </p>
                                <p className="text-lg font-black text-slate-900 tracking-tighter">
                                  {workSettings?.workStartTime
                                    ? formatTime(
                                        new Date(workSettings.workStartTime),
                                        timeFormat === '12h',
                                      )
                                    : '09:00 AM'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-5 bg-white/60 rounded-[28px] border border-white/40 shadow-sm relative group/stat transition-all hover:bg-white hover:shadow-md">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                <Clock className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Shift End
                                </p>
                                <p className="text-lg font-black text-slate-900 tracking-tighter">
                                  {workSettings?.workEndTime
                                    ? formatTime(
                                        new Date(workSettings.workEndTime),
                                        timeFormat === '12h',
                                      )
                                    : '06:00 PM'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {user.role === 'staff' && (
                    <div className="dashboard-card p-8 bg-indigo-600 text-white relative overflow-hidden group">
                      {!approvedLeavesThisMonth ? (
                        <div className="space-y-6">
                          <Skeleton className="h-4 w-24 bg-white/20" />
                          <Skeleton className="h-10 w-48 bg-white/20" />
                          <Skeleton className="h-4 w-32 bg-white/20" />
                        </div>
                      ) : (
                        <>
                          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/20 transition-colors duration-700" />
                          <div className="relative z-10">
                            <h4 className="font-black text-indigo-200 tracking-widest uppercase text-[10px] mb-6">
                              Estimated Salary •{' '}
                              {new Date().toLocaleDateString('en-US', { month: 'long' })}
                            </h4>
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-4xl font-black tracking-tighter">
                                ₹{estimatedSalary.toLocaleString()}
                              </span>
                              <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">
                                Net
                              </span>
                            </div>
                            <p className="text-xs font-bold text-indigo-100/80 mb-8 flex items-center gap-2">
                              <Briefcase className="w-3 h-3" />
                              {payableDays} payable days this month
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-1">
                                  Daily Rate
                                </p>
                                <p className="text-sm font-black">₹{dailyRate.toFixed(0)}</p>
                              </div>
                              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-1">
                                  Base Pay
                                </p>
                                <p className="text-sm font-black">₹{baseSalary.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {initialTab === 'history' && (
              <div className="dashboard-card p-6 md:p-10 bg-white/50 backdrop-blur-sm border-white/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-4">
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
              </div>
            )}

            {initialTab === 'leaves' && (
              <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
                  <div className="lg:col-span-12 dashboard-card p-6 md:p-10 border-white/20 bg-white/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-4">
                          Leave <span className="text-indigo-600">Ledger</span>
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                          Monitor the status of your submitted requests.
                        </p>
                      </div>
                    </div>
                    <MyLeaveStatusList user={user} />
                  </div>
                  <div className="lg:col-span-12 dashboard-card p-6 md:p-10 border-white/20 bg-white/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-4">
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
              </div>
            )}

            {initialTab === 'holidays' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <HolidaysCalendar user={user} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
