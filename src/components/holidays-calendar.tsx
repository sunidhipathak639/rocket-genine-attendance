'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { format, isSameDay, isSameMonth } from 'date-fns'
import { CalendarDays, Info, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { CalendarDayButton } from '@/components/ui/calendar'

interface HolidaysCalendarProps {
  user?: {
    id: string | number
    name?: string | null
    email?: string | null
    role?: string | null
  }
}

interface HolidayRecord {
  id: number
  date: string
  name: string
  type: 'public' | 'company' | 'optional'
  description?: string | null
  iconType?: 'lucide' | 'upload' | 'svg'
  lucideIcon?: string
  uploadedIcon?: string | { url: string }
  svgCode?: string
}

interface LeaveRecord {
  id: string | number
  startDate: string
  endDate: string
  bookingStatus: 'pending' | 'approved' | 'rejected'
  type: string
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
}

const RenderHolidayIcon = ({
  holiday,
  size = 16,
  className,
}: {
  holiday: HolidayRecord
  size?: number
  className?: string
}) => {
  const getIconContent = () => {
    if (holiday.iconType === 'lucide' && holiday.lucideIcon) {
      const Icon = (LucideIcons as any)[holiday.lucideIcon]
      return Icon ? <Icon size={size} className={className} strokeWidth={2} /> : null
    }
    if (holiday.iconType === 'svg' && holiday.svgCode) {
      return (
        <div
          style={!className ? { width: size, height: size } : {}}
          className={`[&>svg]:w-full [&>svg]:h-full ${className || ''}`}
          dangerouslySetInnerHTML={{ __html: holiday.svgCode }}
        />
      )
    }
    if (holiday.iconType === 'upload' && holiday.uploadedIcon) {
      const url =
        typeof holiday.uploadedIcon === 'object' ? holiday.uploadedIcon.url : holiday.uploadedIcon
      return (
        <img
          src={url}
          alt={holiday.name}
          style={
            !className
              ? { width: size, height: size, objectFit: 'contain' }
              : { objectFit: 'contain' }
          }
          className={className}
        />
      )
    }
    return null
  }

  const iconContent = getIconContent()
  if (!iconContent) return null

  return (
    <div style={{ perspective: '800px' }} className="relative drop-shadow-2xl">
      <motion.div
        animate={{
          y: [0, -4, 0],
          rotateY: [-10, 10, -10],
          rotateX: [5, -5, 5],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {iconContent}
      </motion.div>
      <motion.div
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full blur-[2px]"
      />
    </div>
  )
}

export function HolidaysCalendar({ user }: HolidaysCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [holidays, setHolidays] = useState<HolidayRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayRecord | null>(null)
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false)

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/holidays?limit=100&sort=date&depth=1`)
        const data = await res.json()
        if (data.docs) {
          setHolidays(data.docs)
        }

        if (user?.id) {
          const leaveRes = await fetch(
            `/api/leaves?where[user][equals]=${user.id}&where[bookingStatus][equals]=approved&limit=100`,
            { credentials: 'include' },
          )
          const leaveData = await leaveRes.json()
          if (leaveData.docs) {
            setLeaves(leaveData.docs)
          }
        }
      } catch (error) {
        console.error('Error fetching holidays:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchHolidays()
  }, [user?.id])

  const currentMonthHolidays = holidays.filter((hol) => {
    if (!date) return false
    const holidayDate = new Date(hol.date)
    return isSameMonth(holidayDate, date)
  })

  const upcomingHolidays = holidays
    .filter((hol) => {
      const holidayDate = new Date(hol.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return holidayDate >= today
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const getHolidayTypeColor = (type: string) => {
    switch (type) {
      case 'public':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'company':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'optional':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getHolidayTypeLabel = (type: string) => {
    switch (type) {
      case 'public':
        return 'Public Holiday'
      case 'company':
        return 'Company Holiday'
      case 'optional':
        return 'Optional Holiday'
      default:
        return 'Holiday'
    }
  }

  const modifiers = {
    holiday: (date: Date) => holidays.some((hol) => isSameDay(new Date(hol.date), date)),
    leave: (date: Date) =>
      leaves.some((leave) => {
        const start = new Date(leave.startDate)
        const end = new Date(leave.endDate)
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        const s = new Date(start)
        s.setHours(0, 0, 0, 0)
        const e = new Date(end)
        e.setHours(0, 0, 0, 0)
        return d >= s && d <= e
      }),
  }

  const modifiersClassNames = {
    holiday: 'bg-indigo-50 text-indigo-700 border-2 border-indigo-300 rounded-md font-bold',
    leave: 'bg-red-500 text-white border-2 border-red-600 rounded-md font-bold shadow-sm',
  }

  const handleDayClick = (day: Date) => {
    const holiday = holidays.find((h) => isSameDay(new Date(h.date), day))
    if (holiday) {
      setSelectedHoliday(holiday)
      setIsHolidayDialogOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full rounded-[40px]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[32px]" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Calendar Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-12 xl:col-span-7"
        >
          <Card className="w-full shadow-2xl shadow-slate-200/50 border-0 bg-white/60 backdrop-blur-xl rounded-[40px] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase">
                    <div style={{ perspective: '800px' }}>
                      <motion.div
                        animate={{
                          y: [0, -4, 0],
                          rotateY: [-15, 15, -15],
                          rotateX: [10, -10, 10],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <CalendarDays className="w-6 h-6 text-indigo-600 drop-shadow-lg" />
                      </motion.div>
                    </div>
                    Holiday <span className="text-indigo-600">Explorer</span>
                  </CardTitle>
                  <CardDescription className="pl-5 text-slate-500 font-medium">
                    Browse company sanctioned breaks and public holidays.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
              <div className="flex justify-center -mx-4 sm:mx-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  onDayClick={handleDayClick}
                  className="rounded-3xl border border-slate-100 shadow-sm w-full max-w-full bg-white p-6 [--cell-size:2.5rem] sm:[--cell-size:3rem]"
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  components={{
                    DayButton: (props) => {
                      const isHol = holidays.find((h) =>
                        isSameDay(new Date(h.date), props.day.date),
                      )
                      const isLeave = leaves.some((leave) => {
                        const start = new Date(leave.startDate)
                        const end = new Date(leave.endDate)
                        const d = new Date(props.day.date)
                        d.setHours(0, 0, 0, 0)
                        const s = new Date(start)
                        s.setHours(0, 0, 0, 0)
                        const e = new Date(end)
                        e.setHours(0, 0, 0, 0)
                        return d >= s && d <= e
                      })
                      const isSunday = props.day.date.getDay() === 0

                      if (isHol) {
                        return (
                          <CalendarDayButton {...props}>
                            <div className="flex flex-col items-center justify-center w-full h-full relative p-1">
                              <div className="flex items-center justify-center animate-in zoom-in duration-300 transform group-hover:scale-125 transition-transform w-full h-full">
                                <RenderHolidayIcon
                                  holiday={isHol}
                                  className="w-8 h-8 sm:w-10 sm:h-10"
                                />
                              </div>
                            </div>
                          </CalendarDayButton>
                        )
                      }

                      return (
                        <CalendarDayButton {...props}>
                          <div className="relative w-full h-full flex items-center justify-center">
                            <span
                              className={`text-xs font-bold ${
                                isLeave
                                  ? 'text-white'
                                  : isSunday
                                    ? 'text-slate-300'
                                    : 'text-slate-700'
                              }`}
                            >
                              {props.day.date.getDate()}
                            </span>
                          </div>
                        </CalendarDayButton>
                      )
                    },
                  }}
                />
              </div>
              <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-4 pt-8 border-t border-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-indigo-50 border-2 border-indigo-300 rounded-lg"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Holiday
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 border-2 border-red-600 rounded-lg"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Approved Leave
                  </span>
                </div>
                {['public', 'company', 'optional'].map((type) => (
                  <div key={type} className="flex items-center gap-3">
                    <Badge
                      className={`${getHolidayTypeColor(type)} text-[9px] uppercase font-black border-none px-3`}
                    >
                      {type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar: Upcoming & Month Summary */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-8">
          {upcomingHolidays.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="w-full shadow-2xl shadow-slate-200/50 border-0 bg-white/60 backdrop-blur-xl rounded-[40px] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Upcoming
                  </CardTitle>
                  <CardDescription className="pl-5 font-bold uppercase tracking-widest text-[10px] text-slate-400">
                    Next breaks on the horizon
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                  >
                    {upcomingHolidays.map((holiday) => (
                      <motion.div
                        key={holiday.id}
                        variants={item}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 transition-all shadow-sm hover:shadow-md cursor-pointer group/hol"
                        onClick={() => {
                          setSelectedHoliday(holiday)
                          setIsHolidayDialogOpen(true)
                        }}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded-xl group-hover/hol:bg-white transition-colors">
                            <RenderHolidayIcon holiday={holiday} size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-base text-slate-900 truncate mb-1">
                              {holiday.name}
                            </h4>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 group-hover/hol:bg-white inline-block px-2 py-0.5 rounded-full border border-indigo-100 transition-colors">
                              {format(new Date(holiday.date), 'EEEE, MMM dd')}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-xl font-black text-indigo-600 leading-none">
                            {format(new Date(holiday.date), 'dd')}
                          </p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                            {format(new Date(holiday.date), 'MMM')}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentMonthHolidays.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="w-full shadow-lg border-0 bg-white/40 backdrop-blur-xl rounded-[40px] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                    {date && format(date, 'MMMM yyyy')} Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">
                      {currentMonthHolidays.length}
                    </span>
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                      Holidays this month
                    </span>
                  </div>
                  <div className="space-y-2">
                    {currentMonthHolidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between p-3 bg-white/50 rounded-2xl border border-slate-100 hover:border-indigo-50 cursor-pointer transition-all"
                        onClick={() => {
                          setSelectedHoliday(holiday)
                          setIsHolidayDialogOpen(true)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <RenderHolidayIcon holiday={holiday} size={14} />
                          <span className="font-bold text-slate-700 text-sm">{holiday.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-400">
                          {format(new Date(holiday.date), 'MMM dd')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] p-0 shadow-2xl overflow-hidden">
          <div className="bg-slate-900 p-10 text-white relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"
            />
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                {selectedHoliday && <RenderHolidayIcon holiday={selectedHoliday} size={32} />}
              </div>
              <div>
                <h2 className="text-3xl font-black mb-1">{selectedHoliday?.name}</h2>
                <p className="opacity-60 text-base font-medium">
                  {selectedHoliday && format(new Date(selectedHoliday.date), 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-3">
              <Badge
                className={`${getHolidayTypeColor(selectedHoliday?.type || '')} px-4 py-2 rounded-full font-black uppercase tracking-widest text-[10px]`}
              >
                {selectedHoliday && getHolidayTypeLabel(selectedHoliday.type)}
              </Badge>
            </div>
            {selectedHoliday?.description ? (
              <div className="space-y-4">
                <h4 className="font-black text-slate-400 uppercase tracking-widest text-[10px] flex items-center gap-2">
                  Holiday Insight
                </h4>
                <p className="text-slate-700 bg-slate-50 p-6 rounded-3xl border border-slate-100 font-medium leading-relaxed">
                  {selectedHoliday.description}
                </p>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-[10px]">
                  Registry details pending
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
