'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  ArrowRight,
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  PartyPopper,
  Download,
  CalendarRange,
  XCircle,
  CheckCircle2,
  User,
} from 'lucide-react'
import {
  format,
  subDays,
  differenceInDays,
  differenceInMinutes,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
} from 'date-fns'
import type { User, Attendance, Leaf, Holiday } from '@/payload-types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getProfileImageUrl } from '@/lib/utils'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AdminDashboardViewEnhancedProps {
  allUsers: User[]
  allAttendance: Attendance[]
  pendingLeaves?: Leaf[]
  upcomingHolidays?: Holiday[]
}

function getDateStr(d: string): string {
  return typeof d === 'string' ? d.split('T')[0] : ''
}

/** Format ISO timestamp for display (e.g. "7:55 AM" in local time) */
function formatTimeForDisplay(isoString: string | undefined): string {
  if (!isoString) return '–'
  try {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return '–'
    return format(d, 'h:mm a')
  } catch {
    return '–'
  }
}

function formatWorkingHours(timeIn: string | undefined, timeOut: string | undefined): string {
  if (!timeIn || !timeOut) return '–'
  try {
    const start = new Date(timeIn)
    const end = new Date(timeOut)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '–'
    const mins = Math.max(0, differenceInMinutes(end, start))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  } catch {
    return '–'
  }
}

function LiveIndianClock() {
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      )
      setDateStr(
        now.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-500/10 via-slate-50 to-violet-500/10 dark:from-indigo-500/20 dark:via-card dark:to-violet-500/20 p-6">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
      <div className="relative flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
          India (IST)
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
        <p className="text-2xl font-black tabular-nums tracking-tight text-slate-900 dark:text-foreground">
          {time || '--:--:--'}
        </p>
        <p className="text-sm text-slate-600 dark:text-muted-foreground">{dateStr}</p>
      </div>
    </div>
  )
}

type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'year_to_date' | 'custom'

function getRangeForPreset(
  preset: DateRangePreset,
  customStart: string,
  customEnd: string,
): { start: string; end: string } {
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  if (preset === 'today') return { start: todayStr, end: todayStr }
  if (preset === 'this_week') {
    const start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    return { start, end }
  }
  if (preset === 'this_month') {
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }
  if (preset === 'year_to_date') {
    return {
      start: format(startOfYear(now), 'yyyy-MM-dd'),
      end: format(endOfYear(now), 'yyyy-MM-dd'),
    }
  }
  if (preset === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd }
  }
  return { start: todayStr, end: todayStr }
}

export function AdminDashboardViewEnhanced({
  allUsers,
  allAttendance,
  pendingLeaves = [],
  upcomingHolidays = [],
}: AdminDashboardViewEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'present' | 'late' | 'absent' | 'pending'
  >('all')
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null)
  const [staffLeaves, setStaffLeaves] = useState<Leaf[]>([])
  const [loadingLeaves, setLoadingLeaves] = useState(false)
  const [downloadDateRange, setDownloadDateRange] = useState<'weekly' | 'monthly' | 'custom'>(
    'weekly',
  )
  const [customDownloadStart, setCustomDownloadStart] = useState('')
  const [customDownloadEnd, setCustomDownloadEnd] = useState('')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Fetch leaves when staff is selected
  useEffect(() => {
    if (!selectedStaffId) {
      setStaffLeaves([])
      return
    }
    setLoadingLeaves(true)
    fetch(`/api/leaves?where[user][equals]=${selectedStaffId}&limit=1000&sort=-createdAt`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.docs) {
          setStaffLeaves(data.docs)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch leaves:', err)
        setStaffLeaves([])
      })
      .finally(() => setLoadingLeaves(false))
  }, [selectedStaffId])

  // Calculate stats for selected staff
  const selectedStaffStats = useMemo(() => {
    if (!selectedStaffId) return null

    const staffUser = allUsers.find((u) => u.id === selectedStaffId)
    if (!staffUser) return null

    const staffAttendance = allAttendance.filter((a) => {
      const userId = typeof a.user === 'object' ? a.user?.id : a.user
      return userId === selectedStaffId
    })

    const presentDays = staffAttendance.filter((a) => a.status === 'present').length
    const lateDays = staffAttendance.filter((a) => a.status === 'late').length
    const absentDays = staffAttendance.filter((a) => a.status === 'absent').length
    const halfDayDays = staffAttendance.filter((a) => a.status === 'half-day').length
    const totalAttendance = staffAttendance.length

    const approvedLeaves = staffLeaves.filter((l) => l.bookingStatus === 'approved').length
    const pendingLeaves = staffLeaves.filter((l) => l.bookingStatus === 'pending').length
    const rejectedLeaves = staffLeaves.filter((l) => l.bookingStatus === 'rejected').length
    const totalLeaves = staffLeaves.length

    return {
      user: staffUser,
      attendance: {
        presentDays,
        lateDays,
        absentDays,
        halfDayDays,
        totalAttendance,
      },
      leaves: {
        approved: approvedLeaves,
        pending: pendingLeaves,
        rejected: rejectedLeaves,
        total: totalLeaves,
      },
    }
  }, [selectedStaffId, allUsers, allAttendance, staffLeaves])

  // Get date range for download
  const getDownloadDateRange = (): { start: string; end: string } => {
    const now = new Date()
    if (downloadDateRange === 'weekly') {
      const start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      return { start, end }
    }
    if (downloadDateRange === 'monthly') {
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      }
    }
    if (downloadDateRange === 'custom' && customDownloadStart && customDownloadEnd) {
      return { start: customDownloadStart, end: customDownloadEnd }
    }
    // Default to weekly
    const start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const end = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    return { start, end }
  }

  // Download staff attendance CSV
  const handleDownloadStaffAttendance = () => {
    if (!selectedStaffId || !selectedStaffStats) return

    const { start, end } = getDownloadDateRange()
    const staffAttendance = allAttendance
      .filter((a) => {
        const userId = typeof a.user === 'object' ? a.user?.id : a.user
        return userId === selectedStaffId
      })
      .filter((a) => {
        const d = getDateStr(a.date)
        return d >= start && d <= end
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const headers = [
      'Date',
      'Status',
      'Check In',
      'Check Out',
      'Working Hours',
      'Location',
      'Early Checkout Reason',
    ]

    const rows = staffAttendance.map((att) => {
      const timeIn = att.timeIn ? formatTimeForDisplay(att.timeIn) : '–'
      const timeOut = att.timeOut ? formatTimeForDisplay(att.timeOut) : '–'
      const workingHours = formatWorkingHours(att.timeIn || undefined, att.timeOut || undefined)
      const location =
        att.location && typeof att.location === 'object'
          ? att.location.address || `${att.location.latitude}, ${att.location.longitude}`
          : '–'
      const status = att.status || 'pending'
      const earlyCheckoutReason = (att as any).earlyCheckoutReason || '–'

      return [
        format(parseISO(getDateStr(att.date)), 'dd MMM yyyy'),
        status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
        timeIn,
        timeOut,
        workingHours,
        location,
        earlyCheckoutReason,
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `${selectedStaffStats.user.name || 'staff'}-attendance-${start}-to-${end}.csv`,
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const staffUsers = useMemo(() => allUsers.filter((u) => u.role === 'staff'), [allUsers])

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getRangeForPreset(dateRangePreset, customStart, customEnd),
    [dateRangePreset, customStart, customEnd],
  )

  const attendanceInRange = useMemo(() => {
    return allAttendance.filter((a) => {
      const d = getDateStr(a.date)
      return d >= rangeStart && d <= rangeEnd
    })
  }, [allAttendance, rangeStart, rangeEnd])

  const todayAttendance = useMemo(
    () => allAttendance.filter((a) => getDateStr(a.date) === todayStr),
    [allAttendance, todayStr],
  )

  const stats = useMemo(() => {
    const present = attendanceInRange.filter((a) => a.status === 'present').length
    const late = attendanceInRange.filter((a) => a.status === 'late').length
    const absent = attendanceInRange.filter((a) => a.status === 'absent').length
    const halfDay = attendanceInRange.filter((a) => a.status === 'half-day').length
    const distinctUsersInRange = new Set(
      attendanceInRange.map((a) => (typeof a.user === 'object' ? a.user?.id : a.user)),
    ).size
    const pending = Math.max(0, staffUsers.length - distinctUsersInRange)

    return {
      total: staffUsers.length,
      present,
      late,
      absent,
      halfDay,
      pending,
      recordsInRange: attendanceInRange.length,
    }
  }, [attendanceInRange, staffUsers.length])

  const weeklyTrend = useMemo(() => {
    const startDate = parseISO(rangeStart)
    const endDate = parseISO(rangeEnd)
    const days: { day: string; fullDate: string; present: number; total: number; pct: number }[] =
      []
    const numDays = differenceInDays(endDate, startDate) + 1
    const maxPoints = 31
    const step = numDays <= maxPoints ? 1 : Math.ceil(numDays / maxPoints)
    for (let i = 0; i <= numDays - 1; i += step) {
      const d = subDays(endDate, numDays - 1 - i)
      const dStr = format(d, 'yyyy-MM-dd')
      const dayAtt = attendanceInRange.filter((a) => getDateStr(a.date) === dStr)
      const presentCount = dayAtt.filter((a) =>
        ['present', 'late', 'half-day'].includes(a.status),
      ).length
      days.push({
        day: format(d, 'EEE'),
        fullDate: dStr,
        present: presentCount,
        total: staffUsers.length,
        pct: staffUsers.length > 0 ? Math.round((presentCount / staffUsers.length) * 100) : 0,
      })
    }
    if (days.length === 0) {
      const d = parseISO(rangeStart)
      days.push({
        day: format(d, 'EEE'),
        fullDate: rangeStart,
        present: 0,
        total: staffUsers.length,
        pct: 0,
      })
    }
    return days
  }, [attendanceInRange, staffUsers.length, rangeStart, rangeEnd])

  const departmentData = useMemo(() => {
    const depts: Record<string, number> = {}
    staffUsers.forEach((u) => {
      const d = u.department || 'Unassigned'
      depts[d] = (depts[d] || 0) + 1
    })
    return Object.entries(depts).map(([name, count]) => ({ name, count }))
  }, [staffUsers])

  const tableRows = useMemo(() => {
    const rows = attendanceInRange
      .map((att) => {
        const userId = typeof att.user === 'object' ? (att.user as User)?.id : att.user
        const user = allUsers.find((u) => u.id === userId)
        return { att, user: user ?? null }
      })
      .filter((r) => r.user != null) as { att: Attendance; user: User }[]

    let list = rows.filter(
      (r) =>
        !searchQuery ||
        r.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    if (statusFilter !== 'all') {
      list = list.filter((r) => {
        if (statusFilter === 'pending') return !r.att.status
        return r.att.status === statusFilter
      })
    }
    return list.sort((a, b) => {
      const dA = getDateStr(a.att.date)
      const dB = getDateStr(b.att.date)
      if (dA !== dB) return dB.localeCompare(dA)
      return (a.user.name || '').localeCompare(b.user.name || '')
    })
  }, [attendanceInRange, allUsers, searchQuery, statusFilter])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  }

  const handleDownloadCSV = () => {
    const headers = [
      'Date',
      'Employee',
      'Email',
      'Department',
      'Check In',
      'Check Out',
      'Working Hours',
      'Breaks',
      'Status',
    ]
    const escape = (v: string) => {
      const s = String(v ?? '')
      if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const rows = tableRows.map(({ att, user }) => {
      const breaksList =
        (att as { breaks?: { startTime: string; endTime: string; durationMinutes: number }[] })
          ?.breaks ?? []
      const breaksStr = breaksList
        .map(
          (b) =>
            `${format(new Date(b.startTime), 'h:mm a')}–${format(new Date(b.endTime), 'h:mm a')} (${b.durationMinutes}m)`,
        )
        .join('; ')
      return [
        getDateStr(att.date),
        user.name || '',
        user.email || '',
        user.department || '',
        formatTimeForDisplay(att.timeIn as string),
        formatTimeForDisplay(att.timeOut as string),
        formatWorkingHours(att.timeIn as string, att.timeOut as string),
        breaksStr || '–',
        att.status || 'pending',
      ].map(escape)
    })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${rangeStart}-to-${rangeEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Date range filter */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-foreground">
                Date range
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['today', 'Today'],
                  ['this_week', 'This week'],
                  ['this_month', 'This month'],
                  ['year_to_date', 'Year to date'],
                  ['custom', 'Custom'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDateRangePreset(val)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    dateRangePreset === val
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateRangePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-xl border border-border px-3 py-2 text-sm bg-background"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-xl border border-border px-3 py-2 text-sm bg-background"
                />
              </div>
            )}
            <span className="text-sm text-slate-500 dark:text-muted-foreground">
              {rangeStart === rangeEnd
                ? format(parseISO(rangeStart), 'EEEE, dd MMM yyyy')
                : `${format(parseISO(rangeStart), 'dd MMM yyyy')} – ${format(parseISO(rangeEnd), 'dd MMM yyyy')}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards + Live Clock */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div variants={item}>
          <Card className="border-border overflow-hidden transition-all hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    Total Employees
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-foreground">
                    {stats.total}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border overflow-hidden transition-all hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    Present Today
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.present}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border overflow-hidden transition-all hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    Late
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
                    {stats.late}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border overflow-hidden transition-all hover:shadow-lg hover:border-red-200 dark:hover:border-red-800/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    Absent
                  </p>
                  <p className="mt-1 text-2xl font-black text-red-600 dark:text-red-400">
                    {stats.absent}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                  <UserX className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border overflow-hidden transition-all hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                    Pending
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-600 dark:text-slate-400">
                    {stats.pending}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <LiveIndianClock />
        </motion.div>
      </div>

      {/* Quick Actions + Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-foreground">
              Attendance Trend
            </CardTitle>
            <p className="text-sm text-slate-500">
              {rangeStart === rangeEnd ? 'Single day' : `${rangeStart} – ${rangeEnd}`}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Attendance']}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullDate
                      ? format(new Date(payload[0].payload.fullDate), 'dd MMM yyyy')
                      : ''
                  }
                />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                  {weeklyTrend.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        weeklyTrend[i].pct >= 80
                          ? '#22c55e'
                          : weeklyTrend[i].pct >= 60
                            ? '#f59e0b'
                            : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-foreground">
              Department Distribution
            </CardTitle>
            <p className="text-sm text-slate-500">Staff by department</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={departmentData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {departmentData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i % 3 === 0 ? '#06b6d4' : i % 3 === 1 ? '#6366f1' : '#8b5cf6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-foreground">
              {staffUsers.length} total staff
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="w-full justify-between h-12 font-semibold rounded-xl border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Payload Admin
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/collections/users">
              <Button
                variant="outline"
                className="w-full justify-between h-12 font-semibold rounded-xl"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage Employees
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/globals/work-settings">
              <Button
                variant="outline"
                className="w-full justify-between h-12 font-semibold rounded-xl"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Work Settings
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Pending Leaves & Upcoming Holidays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-foreground flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Pending Leave Requests
              </CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">Awaiting your approval</p>
            </div>
            {pendingLeaves.length > 0 && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                {pendingLeaves.length}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">
                No pending leave requests
              </p>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.slice(0, 5).map((leave) => {
                  const u = typeof leave.user === 'object' ? leave.user : null
                  const userName = u?.name || u?.email || 'Unknown'
                  const days =
                    differenceInDays(new Date(leave.endDate), new Date(leave.startDate)) + 1

                  return (
                    <Link
                      key={leave.id}
                      href={`/admin/collections/leaves/${leave.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-border p-4 transition-all hover:border-amber-300 hover:bg-amber-50/50 dark:hover:border-amber-700 dark:hover:bg-amber-500/10"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-foreground">
                          {userName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(leave.startDate), 'dd MMM')} –{' '}
                          {format(new Date(leave.endDate), 'dd MMM')} • {days} day
                          {days > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  )
                })}
                {pendingLeaves.length > 5 && (
                  <Link
                    href="/admin/collections/leaves?where[bookingStatus][equals]=pending"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View all {pendingLeaves.length} pending
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-foreground flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-violet-500" />
                Upcoming Holidays
              </CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">Next 10 holidays</p>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingHolidays.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">
                No upcoming holidays
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingHolidays.slice(0, 5).map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between rounded-xl border border-border p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-foreground">
                        {holiday.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(holiday.date), 'EEEE, dd MMM yyyy')} •{' '}
                        <span className="capitalize">{holiday.type}</span>
                      </p>
                    </div>
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
                {upcomingHolidays.length > 5 && (
                  <Link
                    href="/admin/collections/holidays"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View all holidays
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Attendance Table */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-foreground">
              Employee Attendance
            </CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
              {rangeStart === rangeEnd
                ? format(parseISO(rangeStart), 'EEEE, dd MMM yyyy')
                : `${format(parseISO(rangeStart), 'dd MMM yyyy')} – ${format(parseISO(rangeEnd), 'dd MMM yyyy')}`}{' '}
              • {tableRows.length} record{tableRows.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48 md:w-64 rounded-xl"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-1">
              {(
                [
                  ['all', 'All'],
                  ['present', 'Present'],
                  ['late', 'Late'],
                  ['absent', 'Absent'],
                  ['pending', 'Pending'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    statusFilter === val
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-muted-foreground dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="rounded-xl font-semibold"
              onClick={handleDownloadCSV}
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Link href="/admin/collections/attendance" target="_blank" rel="noopener noreferrer">
              <Button className="rounded-xl font-semibold">
                View All Attendance
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50">
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Department
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Working Hours
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Breaks
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ att, user }) => {
                  const status = (att.status ?? 'pending') as
                    | 'present'
                    | 'late'
                    | 'absent'
                    | 'half-day'
                    | 'pending'
                  const timeIn = formatTimeForDisplay(att.timeIn as string | undefined)
                  const timeOut = formatTimeForDisplay(att.timeOut as string | undefined)
                  const profileUrl = getProfileImageUrl(user.profileImage)

                  const userId = typeof user === 'object' ? user?.id : user
                  return (
                    <tr
                      key={String(att.id)}
                      onClick={() => setSelectedStaffId(userId as number)}
                      className="border-b border-border/60 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer"
                    >
                      <td className="py-4 px-4 text-sm font-medium tabular-nums text-slate-700 dark:text-foreground">
                        {format(parseISO(getDateStr(att.date)), 'dd MMM yyyy')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/20">
                            {profileUrl ? (
                              <Image
                                src={profileUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized={profileUrl.startsWith('http')}
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {user.name?.[0] || user.email?.[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-foreground">
                              {user.name || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-muted-foreground">
                        {user.department || '–'}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium tabular-nums text-slate-700 dark:text-foreground">
                        {timeIn}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium tabular-nums text-slate-700 dark:text-foreground">
                        {timeOut}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium tabular-nums text-slate-700 dark:text-foreground">
                        {formatWorkingHours(
                          att.timeIn as string | undefined,
                          att.timeOut as string | undefined,
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-muted-foreground max-w-[200px]">
                        {(() => {
                          const breaksList =
                            (
                              att as {
                                breaks?: {
                                  startTime: string
                                  endTime: string
                                  durationMinutes: number
                                }[]
                              }
                            )?.breaks ?? []
                          if (breaksList.length === 0) return '–'
                          return (
                            <ul className="space-y-0.5 text-xs">
                              {breaksList.map((b, i) => (
                                <li key={i} className="tabular-nums">
                                  {format(new Date(b.startTime), 'h:mm a')} –{' '}
                                  {format(new Date(b.endTime), 'h:mm a')} ({b.durationMinutes} min)
                                </li>
                              ))}
                            </ul>
                          )
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            status === 'present'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : status === 'late'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                : status === 'absent'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                  : status === 'half-day'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status === 'present'
                                ? 'bg-emerald-500'
                                : status === 'late'
                                  ? 'bg-amber-500'
                                  : status === 'absent'
                                    ? 'bg-red-500'
                                    : status === 'half-day'
                                      ? 'bg-blue-500'
                                      : 'bg-slate-400'
                            }`}
                          />
                          {status === 'pending'
                            ? 'Pending'
                            : status === 'late'
                              ? 'Late'
                              : status === 'present'
                                ? 'On Time'
                                : status === 'half-day'
                                  ? 'Half Day'
                                  : 'Absent'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          href={`/admin/collections/attendance?where[user][equals]=${user.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {tableRows.length === 0 && (
            <div className="py-16 text-center text-slate-500 dark:text-muted-foreground">
              No attendance records in this date range match your filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Details Modal */}
      <Dialog
        open={selectedStaffId !== null}
        onOpenChange={(open) => !open && setSelectedStaffId(null)}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <User className="w-6 h-6" />
              Staff Details
            </DialogTitle>
          </DialogHeader>

          {selectedStaffStats && (
            <div className="space-y-6 mt-4">
              {/* Staff Info */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/20">
                  {selectedStaffStats.user.profileImage ? (
                    <Image
                      src={getProfileImageUrl(selectedStaffStats.user.profileImage) || ''}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedStaffStats.user.name?.[0] ||
                        selectedStaffStats.user.email?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-foreground">
                    {selectedStaffStats.user.name || 'N/A'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-muted-foreground mt-1">
                    {selectedStaffStats.user.email}
                  </p>
                  {selectedStaffStats.user.department && (
                    <span className="inline-block mt-2 text-xs px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full font-semibold">
                      {selectedStaffStats.user.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Attendance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      Present Days
                    </span>
                  </div>
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                    {selectedStaffStats.attendance.presentDays}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Late Days
                    </span>
                  </div>
                  <p className="text-3xl font-black text-amber-700 dark:text-amber-300">
                    {selectedStaffStats.attendance.lateDays}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                      Absent Days
                    </span>
                  </div>
                  <p className="text-3xl font-black text-red-700 dark:text-red-300">
                    {selectedStaffStats.attendance.absentDays}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Half Days
                    </span>
                  </div>
                  <p className="text-3xl font-black text-blue-700 dark:text-blue-300">
                    {selectedStaffStats.attendance.halfDayDays}
                  </p>
                </div>
              </div>

              {/* Total Attendance */}
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      Total Attendance Records
                    </span>
                  </div>
                  <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                    {selectedStaffStats.attendance.totalAttendance}
                  </p>
                </div>
              </div>

              {/* Leave Stats */}
              <div className="space-y-3">
                <h4 className="text-lg font-black text-slate-900 dark:text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Leave Information
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">
                        Approved
                      </span>
                    </div>
                    <p className="text-2xl font-black text-green-700 dark:text-green-300">
                      {selectedStaffStats.leaves.approved}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        Pending
                      </span>
                    </div>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                      {selectedStaffStats.leaves.pending}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                        Rejected
                      </span>
                    </div>
                    <p className="text-2xl font-black text-red-700 dark:text-red-300">
                      {selectedStaffStats.leaves.rejected}
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Total Leave Requests
                    </span>
                    <p className="text-xl font-black text-slate-900 dark:text-foreground">
                      {selectedStaffStats.leaves.total}
                    </p>
                  </div>
                </div>
              </div>

              {/* Download Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-lg font-black text-slate-900 dark:text-foreground flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Download Attendance Report
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Select
                      value={downloadDateRange}
                      onValueChange={(v: 'weekly' | 'monthly' | 'custom') =>
                        setDownloadDateRange(v)
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly (This Week)</SelectItem>
                        <SelectItem value="monthly">Monthly (This Month)</SelectItem>
                        <SelectItem value="custom">Custom Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleDownloadStaffAttendance}
                      className="flex-shrink-0"
                      disabled={
                        downloadDateRange === 'custom' &&
                        (!customDownloadStart || !customDownloadEnd)
                      }
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>

                  {downloadDateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={customDownloadStart}
                          onChange={(e) => setCustomDownloadStart(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={customDownloadEnd}
                          onChange={(e) => setCustomDownloadEnd(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {downloadDateRange !== 'custom' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {downloadDateRange === 'weekly' && (
                        <>
                          Downloading attendance from{' '}
                          {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM dd')} to{' '}
                          {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                        </>
                      )}
                      {downloadDateRange === 'monthly' && (
                        <>Downloading attendance for {format(new Date(), 'MMMM yyyy')}</>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStaffId(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    window.open(
                      `/admin/collections/attendance?where[user][equals]=${selectedStaffId}`,
                      '_blank',
                    )
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View All Attendance
                </Button>
                <Button
                  onClick={() => {
                    window.open(
                      `/admin/collections/leaves?where[user][equals]=${selectedStaffId}`,
                      '_blank',
                    )
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View All Leaves
                </Button>
              </div>
            </div>
          )}

          {loadingLeaves && (
            <div className="py-8 text-center text-slate-500 dark:text-muted-foreground">
              Loading leave information...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
