'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { AttendanceCard } from '@/components/attendance-card'
import { DashboardCalendar } from '@/components/dashboard-calendar'
import { 
    LayoutDashboard, 
    LogOut, 
    History, 
    Calendar as CalendarIcon, 
    ChevronRight, 
    Briefcase,
    Clock,
    PartyPopper,
    Loader2
} from 'lucide-react'
import { HolidaysCalendar } from './holidays-calendar'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePathname } from 'next/navigation'

import type { Attendance, User } from '@/payload-types'
import { AdminDashboardView } from './admin-dashboard-view'
import { MyLeaveStatusList } from './my-leave-status-list'
import { formatTime } from '@/lib/utils'

interface DashboardClientProps {
    user: { id: string | number; name?: string | null; email?: string | null; role?: string | null; salary?: number | null }
    initialTab?: 'dashboard' | 'history' | 'leaves' | 'holidays'
    allUsers?: User[]
    allAttendance?: Attendance[]
    workSettings?: {
      saturdayWorkingDay?: boolean | null
      workStartTime?: string | null
      workEndTime?: string | null
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
    saturdayWorking: boolean
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

export function DashboardClient({ user, initialTab = 'dashboard', allUsers, allAttendance, workSettings: workSettingsProp, userAttendance = [] }: DashboardClientProps) {
    const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h')
    const [logoutLoading, setLogoutLoading] = useState(false)
    const [approvedLeavesThisMonth, setApprovedLeavesThisMonth] = useState<{ startDate: string; endDate: string; type?: string }[]>([])
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
            { credentials: 'include' }
        )
            .then((r) => r.json())
            .then((data) => { if (data.docs) setApprovedLeavesThisMonth(data.docs) })
            .catch(() => {})
    }, [user?.id, user?.role, pathname])

    useEffect(() => {
        if (workSettingsProp != null) return
        fetch('/api/globals/work-settings', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => { if (data) setWorkSettingsLocal(data) })
            .catch(() => {})
    }, [workSettingsProp])

    // Monthly earnings: base salary minus approved leave days (live)
    const baseSalary = user.salary || 0
    const { estimatedSalary, dailyRate, totalWorkingDays, approvedLeaveDays, payableDays } = useMemo(() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const saturdayWorking = !!workSettings?.saturdayWorkingDay
        const total = totalWorkingDaysInMonth(year, month, saturdayWorking)
        const leaveDays = approvedLeaveDaysInMonth(approvedLeavesThisMonth, year, month, saturdayWorking)
        const payable = Math.max(0, total - leaveDays)
        const daily = total > 0 ? baseSalary / total : baseSalary / 30
        const estimated = total > 0 ? (baseSalary * (payable / total)) : (daily * 22)
        return {
            estimatedSalary: estimated.toFixed(2),
            dailyRate: total > 0 ? baseSalary / total : baseSalary / 30,
            totalWorkingDays: total,
            approvedLeaveDays: leaveDays,
            payableDays: payable,
        }
    }, [baseSalary, workSettings?.saturdayWorkingDay, approvedLeavesThisMonth])

    // This week and today summary from userAttendance
    const todayStr = new Date().toISOString().split('T')[0]
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const thisWeekRecords = (userAttendance || []).filter(
      (a: Attendance) => a.date >= weekStartStr && a.date <= todayStr
    )
    const todayRecord = (userAttendance || []).find((a: Attendance) => a.date === todayStr)
    const weekPresent = thisWeekRecords.filter((a: Attendance) => ['present', 'late', 'half-day'].includes(a.status)).length
    const weekLate = thisWeekRecords.filter((a: Attendance) => a.status === 'late').length
    const weekHalfDay = thisWeekRecords.filter((a: Attendance) => a.status === 'half-day').length

    const toggleTimeFormat = (checked: boolean) => {
        setTimeFormat(checked ? '24h' : '12h')
    }

    // Show admin dashboard if user is admin
    if (user.role === 'admin' && allUsers && allAttendance) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans selection:bg-indigo-100">
                {/* Premium Header */}
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between transition-all duration-300">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-lg flex items-center justify-center transform group-hover:rotate-3 transition-all duration-300">
                            <span className="text-white font-bold text-xl">R</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg tracking-tight text-gray-900 leading-none">Rocket Genine</span>
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Admin Dashboard</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
                        <div className="text-right">
                            <span className="block text-sm font-bold text-gray-900">{user.name || user.email}</span>
                            <span className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500">Admin</span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                            disabled={logoutLoading}
                            onClick={async () => {
                              setLogoutLoading(true)
                              try {
                                await fetch('/api/auth/logout', { method: 'POST' })
                                window.location.href = '/admin/login'
                              } catch (error) {
                                console.error('Logout error:', error)
                                window.location.href = '/admin/login'
                              }
                            }}
                        >
                            {logoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                        </Button>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8 max-w-7xl">
                    <AdminDashboardView allUsers={allUsers} allAttendance={allAttendance} />
                </main>
            </div>
        )
    }

    return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans selection:bg-indigo-100">
      {/* Premium Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-lg flex items-center justify-center transform group-hover:rotate-3 transition-all duration-300">
                <span className="text-white font-bold text-xl">R</span>
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-gray-900 leading-none">Rocket Genine</span>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Attendance</span>
            </div>
        </div>
        
        <div className="flex items-center gap-6">
             {/* Time Format Toggle */}
             <div className="hidden md:flex items-center gap-2 bg-gray-100/50 p-1 rounded-full border border-gray-200/50">
                <Label htmlFor="time-format" className={`text-xs font-semibold px-2 py-1 rounded-full transition-all cursor-pointer ${timeFormat === '12h' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`} onClick={() => setTimeFormat('12h')}>12H</Label>
                <Switch 
                    id="time-format" 
                    checked={timeFormat === '24h'}
                    onCheckedChange={toggleTimeFormat}
                    className="data-[state=checked]:bg-indigo-600 hidden" // Hiding the actual switch visually, using labels as tabs
                /> 
                {/* Custom Toggle UI */}
                 <Label htmlFor="time-format" className={`text-xs font-semibold px-2 py-1 rounded-full transition-all cursor-pointer ${timeFormat === '24h' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`} onClick={() => setTimeFormat('24h')}>24H</Label>
             </div>

             <div className="hidden md:flex items-center gap-4 pl-6 border-l border-gray-200">
                 <div className="text-right">
                    <span className="block text-sm font-bold text-gray-900">{user.name || user.email}</span>
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500">{user.role}</span>
                 </div>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                    disabled={logoutLoading}
                    onClick={async () => {
                      setLogoutLoading(true)
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' })
                        window.location.href = user.role === 'staff' ? '/login' : '/admin/login'
                      } catch (error) {
                        console.error('Logout error:', error)
                        window.location.href = user.role === 'staff' ? '/login' : '/admin/login'
                      }
                    }}
                 >
                    {logoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                 </Button>
             </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar / Navigation (Desktop) */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
                <nav className="space-y-1">
                    <Link href="/" className={`group flex items-center justify-between px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${pathname === '/' ? 'bg-white shadow-md text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-3">
                            <LayoutDashboard className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span>Overview</span>
                        </div>
                        {pathname === '/' && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    </Link>
                     <Link href="/history" className={`group flex items-center justify-between px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${pathname === '/history' ? 'bg-white shadow-md text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-3">
                            <History className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span>History</span>
                        </div>
                        {pathname === '/history' && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    </Link>
                     <Link href="/leaves" className={`group flex items-center justify-between px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${pathname === '/leaves' ? 'bg-white shadow-md text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-3">
                            <CalendarIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span>Leaves</span>
                        </div>
                        {pathname === '/leaves' && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    </Link>
                     <Link href="/holidays" className={`group flex items-center justify-between px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${pathname === '/holidays' ? 'bg-white shadow-md text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-3">
                            <PartyPopper className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span>Holidays</span>
                        </div>
                        {pathname === '/holidays' && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                    </Link>
                </nav>
                
                 {/* Premium Salary Card */}
                 <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] p-6 rounded-3xl text-white shadow-xl ring-1 ring-black/5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
                    
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-gray-300 tracking-wide uppercase">Monthly Earnings</h3>
                            <Briefcase className="w-4 h-4 text-indigo-400" />
                        </div>
                        
                        <div className="space-y-1">
                            <div className="text-4xl font-bold tracking-tight text-white flex items-baseline gap-1">
                                <span className="text-2xl text-gray-400">₹</span>
                                {estimatedSalary}
                            </div>
                            <p className="text-xs text-gray-400 font-medium">
                                Estimated for {new Date().toLocaleString('default', { month: 'long' })}
                                {approvedLeaveDays > 0 && (
                                    <span className="block mt-0.5 text-amber-300/90">After {approvedLeaveDays} approved leave day{approvedLeaveDays !== 1 ? 's' : ''} deducted</span>
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/10">
                            <div className="bg-white/5 p-2 rounded-xl backdrop-blur-sm">
                                <span className="block text-[10px] text-gray-400 uppercase font-bold">Base</span>
                                <span className="block text-sm font-semibold">₹{user.salary || 0}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl backdrop-blur-sm">
                                <span className="block text-[10px] text-gray-400 uppercase font-bold">Daily Rate</span>
                                <span className="block text-sm font-semibold">₹{dailyRate.toFixed(2)}</span>
                            </div>
                        </div>
                        {approvedLeaveDays > 0 && (
                            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                                <span className="block text-[10px] text-gray-400 uppercase font-bold">This month</span>
                                <span className="block text-sm text-white">{payableDays} payable days</span>
                                <span className="block text-xs text-gray-400">{totalWorkingDays} working days − {approvedLeaveDays} leave</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="col-span-1 lg:col-span-9 space-y-8">
                {initialTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight sm:text-2xl md:text-3xl">Good Morning, {user.name ? user.name.split(' ')[0] : 'Staff'}!</h2>
                                    {todayRecord && (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium sm:px-3 sm:py-1 sm:text-sm ${
                                          todayRecord.status === 'present' ? 'bg-green-100 text-green-800' :
                                          todayRecord.status === 'late' ? 'bg-amber-100 text-amber-800' :
                                          todayRecord.status === 'half-day' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            Today: {todayRecord.status === 'present' ? 'On time' : todayRecord.status === 'late' ? 'Late' : todayRecord.status === 'half-day' ? 'Half day' : todayRecord.status}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-500 mt-1 text-sm sm:text-base">Ready to start your day? Don&apos;t forget to check in.</p>
                            </div>
                            
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="lg" className="w-full shrink-0 rounded-full bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm font-medium transition-all hover:shadow-md sm:w-auto">
                                        <CalendarIcon className="w-4 h-4 mr-2 text-indigo-600 shrink-0" />
                                        <span className="truncate">View Full Schedule</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-2xl">
                                    <DialogHeader className="sr-only">
                                        <DialogTitle className="sr-only">Full Schedule Calendar</DialogTitle>
                                    </DialogHeader>
                                    <DashboardCalendar user={user} />
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Hero Section */}
                        <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-2 xl:gap-8">
                            {/* Attendance Hero Card */}
                            <div className="space-y-6 min-w-0">
                                <AttendanceCard
                                  user={user}
                                  timeFormat={timeFormat}
                                  workStartTime={workSettings?.workStartTime}
                                  workEndTime={workSettings?.workEndTime}
                                />
                            </div>

                            {/* Quick Stats Grid - 1 column on all screen sizes */}
                            <div className="grid grid-cols-1 min-w-0 gap-3 sm:gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow min-w-0 sm:rounded-3xl sm:p-6">
                                    <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center mb-2 sm:mb-4 sm:w-10 sm:h-10">
                                        <Clock className="w-4 h-4 text-green-600 sm:w-5 sm:h-5" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">
                                      {workSettings?.workStartTime 
                                        ? formatTime(new Date(workSettings.workStartTime), timeFormat === '12h')
                                        : '09:00 AM'}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-medium truncate sm:text-sm">Standard Start Time</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow min-w-0 sm:rounded-3xl sm:p-6">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center mb-2 sm:mb-4 sm:w-10 sm:h-10">
                                        <Briefcase className="w-4 h-4 text-indigo-600 sm:w-5 sm:h-5" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">{weekPresent}</h4>
                                    <p className="text-xs text-gray-500 font-medium line-clamp-2 sm:text-sm">This week: days present</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow min-w-0 sm:rounded-3xl sm:p-6">
                                    <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center mb-2 sm:mb-4 sm:w-10 sm:h-10">
                                        <Clock className="w-4 h-4 text-amber-600 sm:w-5 sm:h-5" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">{weekLate}</h4>
                                    <p className="text-xs text-gray-500 font-medium truncate sm:text-sm">This week: late</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow min-w-0 sm:rounded-3xl sm:p-6">
                                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mb-2 sm:mb-4 sm:w-10 sm:h-10">
                                        <Briefcase className="w-4 h-4 text-blue-600 sm:w-5 sm:h-5" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">{weekHalfDay}</h4>
                                    <p className="text-xs text-gray-500 font-medium truncate sm:text-sm">This week: half days</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {initialTab === 'history' && (
                    <Card className="border-none shadow-lg bg-white/50 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle>Attendance History</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <DashboardCalendar user={user} workSettings={workSettings} />
                        </CardContent>
                    </Card>
                )}

                 {initialTab === 'leaves' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Card className="border-none shadow-lg bg-white/50 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Leave Status</CardTitle>
                                <p className="text-sm text-gray-500 font-normal">See whether your leave requests are approved or pending.</p>
                            </CardHeader>
                            <CardContent>
                                <MyLeaveStatusList user={user} />
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-lg bg-white/50 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Request New Leave</CardTitle>
                                <p className="text-sm text-gray-500 font-normal">Click a date on the calendar to request leave.</p>
                            </CardHeader>
                            <CardContent>
                                <DashboardCalendar user={user} workSettings={workSettings} />
                            </CardContent>
                        </Card>
                    </div>
                )}

                 {initialTab === 'holidays' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <HolidaysCalendar user={user} />
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  )
}
