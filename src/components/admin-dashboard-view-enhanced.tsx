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
} from 'lucide-react'
import { format, subDays, differenceInDays } from 'date-fns'
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

interface AdminDashboardViewEnhancedProps {
  allUsers: User[]
  allAttendance: Attendance[]
  pendingLeaves?: Leaf[]
  upcomingHolidays?: Holiday[]
}

function getDateStr(d: string): string {
  return typeof d === 'string' ? d.split('T')[0] : ''
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
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const staffUsers = useMemo(() => allUsers.filter((u) => u.role === 'staff'), [allUsers])

  const todayAttendance = useMemo(
    () => allAttendance.filter((a) => getDateStr(a.date) === todayStr),
    [allAttendance, todayStr],
  )

  const stats = useMemo(() => {
    const present = todayAttendance.filter((a) => a.status === 'present').length
    const late = todayAttendance.filter((a) => a.status === 'late').length
    const absent = todayAttendance.filter((a) => a.status === 'absent').length
    const halfDay = todayAttendance.filter((a) => a.status === 'half-day').length
    const checkedIn = present + late + halfDay
    const pending = Math.max(0, staffUsers.length - checkedIn - absent)

    return {
      total: staffUsers.length,
      present,
      late,
      absent,
      halfDay,
      checkedIn,
      pending,
    }
  }, [todayAttendance, staffUsers.length])

  const weeklyTrend = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const dStr = format(d, 'yyyy-MM-dd')
      const dayAtt = allAttendance.filter((a) => getDateStr(a.date) === dStr)
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
    return days
  }, [allAttendance, staffUsers.length])

  const departmentData = useMemo(() => {
    const depts: Record<string, number> = {}
    staffUsers.forEach((u) => {
      const d = u.department || 'Unassigned'
      depts[d] = (depts[d] || 0) + 1
    })
    return Object.entries(depts).map(([name, count]) => ({ name, count }))
  }, [staffUsers])

  const filteredStaff = useMemo(() => {
    let list = staffUsers.filter(
      (u) =>
        !searchQuery ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    if (statusFilter !== 'all') {
      list = list.filter((u) => {
        const att = todayAttendance.find(
          (a) => (typeof a.user === 'object' ? a.user.id : a.user) === u.id,
        )
        if (statusFilter === 'pending') return !att
        if (att) return att.status === statusFilter
        return false
      })
    }
    return list
  }, [staffUsers, searchQuery, statusFilter, todayAttendance])

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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
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
              Weekly Attendance Trend
            </CardTitle>
            <p className="text-sm text-slate-500">Last 7 days • Real data</p>
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
              Today&apos;s Employee Attendance
            </CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(new Date(), 'EEEE, dd MMM yyyy')}
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
                    Status
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((user) => {
                  const att = todayAttendance.find(
                    (a) => (typeof a.user === 'object' ? a.user.id : a.user) === user.id,
                  )
                  const status = att?.status || 'pending'
                  const timeIn = att?.timeIn || '–'
                  const timeOut = att?.timeOut || '–'
                  const profileUrl = getProfileImageUrl(user.profileImage)

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border/60 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
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
          {filteredStaff.length === 0 && (
            <div className="py-16 text-center text-slate-500 dark:text-muted-foreground">
              No employees match your filters
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
