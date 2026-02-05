'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { format, isSameDay } from 'date-fns'
import { CalendarDays, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardCalendarProps {
  user: { id: string | number }
  workSettings?: {
    saturdayWorkingDay?: boolean | null
    workStartTime?: string | null
    workEndTime?: string | null
  }
}

interface AttendanceRecord {
  date: string
  status: 'present' | 'absent' | 'late' | 'half-day'
}

interface HolidayRecord {
  date: string
  name: string
  type: string
}

interface LeaveRecord {
  startDate: string
  endDate: string
  bookingStatus: 'pending' | 'approved' | 'rejected'
  type: 'full_day' | 'half_day' | 'paid' | 'unpaid'
}

export function DashboardCalendar({
  user,
  workSettings: propsWorkSettings,
}: DashboardCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [leaveType, setLeaveType] = useState('full_day')
  const [reason, setReason] = useState('')

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [holidays, setHolidays] = useState<HolidayRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [_workSettings, setWorkSettings] = useState<{
    saturdayWorkingDay?: boolean | null
    workStartTime?: string | null
    workEndTime?: string | null
  } | null>(propsWorkSettings || null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Fetch Attendance
        const attRes = await fetch(`/api/attendance?where[user][equals]=${user.id}&limit=100`, {
          credentials: 'include',
        })
        const attJson = await attRes.json()
        if (attJson.docs) {
          setAttendanceData(attJson.docs)
        }

        // Fetch Holidays
        const holRes = await fetch(`/api/holidays?limit=100`, { credentials: 'include' })
        const holJson = await holRes.json()
        if (holJson.docs) {
          setHolidays(holJson.docs)
        }

        // Fetch Approved Leaves
        const leaveRes = await fetch(
          `/api/leaves?where[user][equals]=${user.id}&where[bookingStatus][equals]=approved&limit=100`,
          { credentials: 'include' },
        )
        const leaveJson = await leaveRes.json()
        if (leaveJson.docs) {
          setLeaves(leaveJson.docs)
        }

        // Fetch Work Settings if not provided as prop
        if (!propsWorkSettings) {
          const settingsRes = await fetch(`/api/globals/work-settings`, { credentials: 'include' })
          const settingsJson = await settingsRes.json()
          if (settingsJson) {
            setWorkSettings(settingsJson)
          }
        }
      } catch (error) {
        console.error('Error fetching calendar data', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchData()
    }
  }, [user?.id, propsWorkSettings])

  // Function to render custom day content
  const modifiers = {
    booked: (date: Date) => attendanceData.some((att) => isSameDay(new Date(att.date), date)),
    holiday: (date: Date) => holidays.some((hol) => isSameDay(new Date(hol.date), date)),
    leave: (date: Date) =>
      leaves.some((leave) => {
        const start = new Date(leave.startDate)
        const end = new Date(leave.endDate)
        // Normalize to midnight UTC for comparison
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        const s = new Date(start)
        s.setHours(0, 0, 0, 0)
        const e = new Date(end)
        e.setHours(0, 0, 0, 0)
        return d >= s && d <= e
      }),
    present: (date: Date) =>
      attendanceData.some((att) => isSameDay(new Date(att.date), date) && att.status === 'present'),
    absent: (date: Date) =>
      attendanceData.some((att) => isSameDay(new Date(att.date), date) && att.status === 'absent'),
    late: (date: Date) =>
      attendanceData.some((att) => isSameDay(new Date(att.date), date) && att.status === 'late'),
    halfDay: (date: Date) =>
      attendanceData.some(
        (att) => isSameDay(new Date(att.date), date) && att.status === 'half-day',
      ),
  }

  // Custom classNames for modifiers
  const modifiersClassNames = {
    present: 'bg-green-100 text-green-700 hover:bg-green-200 rounded-md',
    absent: 'bg-red-100 text-red-700 hover:bg-red-200 rounded-md',
    leave: 'bg-red-500 text-white hover:bg-red-600 rounded-md font-bold shadow-sm',
    late: 'bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md',
    halfDay: 'bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md',
    holiday: 'bg-blue-50 text-blue-600 border border-blue-200 rounded-md font-bold',
    disabled: 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400',
  }

  // Check if a date is disabled for leave (past days, Sunday, or holiday only)
  const isDateDisabled = (day: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOnly = new Date(day)
    dayOnly.setHours(0, 0, 0, 0)
    if (dayOnly.getTime() < today.getTime()) return true // past
    if (day.getDay() === 0) return true // Sunday
    const isHoliday = holidays.some((h) => isSameDay(new Date(h.date), day))
    return isHoliday
  }

  const handleDayClick = (day: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOnly = new Date(day)
    dayOnly.setHours(0, 0, 0, 0)

    if (dayOnly.getTime() < today.getTime()) {
      // Past: show info only
      const att = attendanceData.find((a) => isSameDay(new Date(a.date), day))
      const hol = holidays.find((h) => isSameDay(new Date(h.date), day))
      if (att) toast.info(`Status: ${att.status.toUpperCase()}`)
      else if (hol) toast.info(`Holiday: ${hol.name}`)
      else toast.info(`No record for ${format(day, 'MMM dd')}`)
      setDate(day)
      return
    }
    if (isDateDisabled(day)) {
      if (day.getDay() === 0) {
        toast.error('Leave cannot be requested for Sundays.')
      } else {
        const holiday = holidays.find((h) => isSameDay(new Date(h.date), day))
        toast.error(
          holiday
            ? `"${holiday.name}" is a holiday. Leave cannot be requested on holidays.`
            : 'This date is a holiday.',
        )
      }
      return
    }

    setDate(day)
    setIsLeaveDialogOpen(true)
  }

  /** Extract a user-friendly error message from API response (Payload and generic shapes) */
  const getLeaveErrorMessage = (data: unknown): string => {
    if (!data || typeof data !== 'object') return 'Failed to submit leave request.'
    const d = data as Record<string, unknown>
    if (typeof d.message === 'string' && d.message.trim()) return d.message
    if (Array.isArray(d.errors) && d.errors.length > 0) {
      const first = d.errors[0]
      if (
        first &&
        typeof first === 'object' &&
        'message' in first &&
        typeof (first as { message: unknown }).message === 'string'
      ) {
        return (first as { message: string }).message
      }
    }
    if (typeof d.error === 'string' && d.error.trim()) return d.error
    if (typeof d.details === 'string' && d.details.trim()) return d.details
    return 'Failed to submit leave request. Please try again.'
  }

  const handleLeaveRequest = async () => {
    setLeaveError(null)
    if (!date) {
      const msg = 'Please select a date.'
      toast.error(msg)
      setLeaveError(msg)
      return
    }

    // Validate: only block past, Sunday, and holidays
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    if (dateOnly.getTime() < today.getTime()) {
      const msg = 'Leave cannot be requested for past dates.'
      toast.error(msg)
      setLeaveError(msg)
      setIsLeaveDialogOpen(false)
      return
    }
    if (isDateDisabled(date)) {
      let msg: string
      if (date.getDay() === 0) {
        msg = 'Leave cannot be requested for Sundays.'
      } else {
        const holiday = holidays.find((h) => isSameDay(new Date(h.date), date))
        msg = holiday
          ? `"${holiday.name}" is a holiday. Leave cannot be requested on holidays.`
          : 'This date is a holiday. Leave cannot be requested on holidays.'
      }
      toast.error(msg)
      setLeaveError(msg)
      setIsLeaveDialogOpen(false)
      return
    }

    setLeaveSubmitting(true)
    try {
      const res = await fetch('/api/request-leave', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: leaveType,
          startDate: format(date, 'yyyy-MM-dd'),
          endDate: format(date, 'yyyy-MM-dd'),
          reason: reason || '',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Leave requested for ${format(date, 'PPP')}`)
        setIsLeaveDialogOpen(false)
        setReason('')
        setLeaveType('full_day')
        setLeaveError(null)
        window.location.reload()
      } else {
        const msg =
          res.status === 403
            ? "You don't have permission to request leave. Please contact your admin."
            : res.status === 401
              ? 'Please log in again to request leave.'
              : getLeaveErrorMessage(data)
        setLeaveError(msg)
        toast.error(msg)
      }
    } catch (error) {
      console.error('Error submitting leave request:', error)
      const msg = 'Unable to connect. Please check your connection and try again.'
      setLeaveError(msg)
      toast.error(msg)
    } finally {
      setLeaveSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="shadow-none border-0 bg-transparent flex flex-col items-center p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-[400px] w-full max-w-[500px] rounded-3xl mb-8" />
        <div className="grid grid-cols-2 gap-4 w-full max-w-[500px]">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full shadow-md border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 italic">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              Session <span className="text-indigo-600">Calendar</span>
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Manage your schedule
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded-full text-white border border-red-600">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>Leave
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full text-green-600 border border-green-100">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>Present
            </div>
            <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-full text-red-600 border border-red-100">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>Absent
            </div>
            <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-full text-orange-600 border border-orange-100">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>Late
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-full text-blue-600 border border-blue-100">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>Holiday
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full text-slate-400 border border-slate-200">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>Sunday
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 flex justify-center -mx-4 sm:mx-0">
        <div className="w-full flex justify-center scale-[0.85] sm:scale-100 origin-top">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            onDayClick={handleDayClick}
            className="rounded-[24px] border border-slate-100 shadow-xl w-full max-w-full bg-white transition-all [&_table]:w-full [&_td]:p-0"
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            disabled={(day) => isDateDisabled(day)}
            components={{
              // @ts-expect-error - DayContent is a custom component prop
              DayContent: (props: { date: Date }) => {
                const isHol = holidays.find((h) => isSameDay(new Date(h.date), props.date))
                const isLeave = leaves.some((leave) => {
                  const start = new Date(leave.startDate)
                  const end = new Date(leave.endDate)
                  const d = new Date(props.date)
                  d.setHours(0, 0, 0, 0)
                  const s = new Date(start)
                  s.setHours(0, 0, 0, 0)
                  const e = new Date(end)
                  e.setHours(0, 0, 0, 0)
                  return d >= s && d <= e
                })
                const isSunday = props.date.getDay() === 0
                const isDisabled = isDateDisabled(props.date)
                return (
                  <div
                    className={`relative w-full h-full flex items-center justify-center p-2 sm:p-3 group transition-all ${isDisabled && !isLeave ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:scale-110'}`}
                  >
                    <span
                      className={`text-xs sm:text-sm font-bold ${isLeave ? 'text-white' : isDisabled ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                      {props.date.getDate()}
                    </span>
                    {isHol && (
                      <div
                        className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        title={isHol.name}
                      ></div>
                    )}
                    {isSunday && !isHol && (
                      <div
                        className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-slate-300 rounded-full"
                        title="Sunday"
                      ></div>
                    )}
                  </div>
                )
              },
            }}
          />
        </div>
      </CardContent>

      <Dialog
        open={isLeaveDialogOpen}
        onOpenChange={(open) => {
          setIsLeaveDialogOpen(open)
          if (!open) setLeaveError(null)
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full translate-y-12 -translate-x-12 blur-xl" />
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black italic mb-2">
                Request <span className="text-indigo-200">Leave</span>
              </DialogTitle>
              <DialogDescription className="text-indigo-100 font-medium opacity-90">
                Planning some time off? Submit your request for{' '}
                <span className="font-bold text-white underline decoration-indigo-300 underline-offset-4">
                  {date ? format(date, 'MMM dd, yyyy') : ''}
                </span>
              </DialogDescription>
            </div>
          </div>

          <div className="p-8 pb-10 space-y-6">
            {leaveError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Alert
                  variant="destructive"
                  className="bg-red-50 border-red-100 text-red-700 rounded-2xl"
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="font-bold">Submission Error</AlertTitle>
                  <AlertDescription className="text-xs">{leaveError}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="leave-type"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                >
                  Leave Type
                </Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger
                      id="leave-type"
                      className="pl-11 h-14 rounded-2xl border-slate-200 focus:ring-indigo-600/20 transition-all font-bold text-slate-700"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl p-1">
                      <SelectItem
                        value="full_day"
                        className="rounded-xl py-3 font-medium focus:bg-indigo-50 focus:text-indigo-700"
                      >
                        Full Working Day
                      </SelectItem>
                      <SelectItem
                        value="half_day"
                        className="rounded-xl py-3 font-medium focus:bg-indigo-50 focus:text-indigo-700"
                      >
                        Half Day (4 hrs)
                      </SelectItem>
                      <SelectItem
                        value="paid"
                        className="rounded-xl py-3 font-medium focus:bg-indigo-50 focus:text-indigo-700 font-bold"
                      >
                        Paid Leave
                      </SelectItem>
                      <SelectItem
                        value="unpaid"
                        className="rounded-xl py-3 font-medium focus:bg-indigo-50 focus:text-indigo-700"
                      >
                        Unpaid / LWP
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="reason"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                >
                  Reason for Leave
                </Label>
                <div className="relative">
                  <Textarea
                    id="reason"
                    placeholder="Briefly describe your reason for absence..."
                    className="min-h-[120px] rounded-2xl border-slate-200 focus:ring-indigo-600/20 transition-all p-4 pt-4 resize-none font-medium text-slate-700"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="absolute right-4 bottom-4 text-slate-300">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                onClick={() => {
                  setIsLeaveDialogOpen(false)
                  setReason('')
                  setLeaveError(null)
                }}
              >
                Discard
              </Button>
              <Button
                className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white font-bold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] group disabled:opacity-50"
                onClick={handleLeaveRequest}
                disabled={isDateDisabled(date || new Date()) || leaveSubmitting}
              >
                {leaveSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Submit Request</span>
                    <AlertCircle className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
