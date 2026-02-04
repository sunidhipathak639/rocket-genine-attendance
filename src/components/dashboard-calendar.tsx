'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
                const isSunday = props.date.getDay() === 0
                const isDisabled = isDateDisabled(props.date)
                return (
                  <div
                    className={`relative w-full h-full flex items-center justify-center p-2 sm:p-3 group transition-all ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:scale-110'}`}
                  >
                    <span
                      className={`text-xs sm:text-sm font-bold ${isDisabled ? 'text-slate-300' : 'text-slate-700'}`}
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

      {/* Leave Request Dialog */}
      <Dialog
        open={isLeaveDialogOpen}
        onOpenChange={(open) => {
          setIsLeaveDialogOpen(open)
          if (!open) setLeaveError(null)
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Submit a leave request for {date ? format(date, 'PPPP') : ''}.
            </DialogDescription>
          </DialogHeader>
          {leaveError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{leaveError}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leave-type" className="text-right">
                Type
              </Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full Day</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="paid">Paid Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="Why are you taking leave?"
                className="col-span-3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLeaveDialogOpen(false)
                setReason('')
                setLeaveError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLeaveRequest}
              disabled={isDateDisabled(date || new Date()) || leaveSubmitting}
            >
              {leaveSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
