'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { format, isSameDay, isSameMonth } from 'date-fns'
import { CalendarDays, Info, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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
}

export function HolidaysCalendar({ user: _user }: HolidaysCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [holidays, setHolidays] = useState<HolidayRecord[]>([])
  const [_loading, setLoading] = useState(true)
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayRecord | null>(null)
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false)

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true)
        // Fetch all holidays
        const res = await fetch(`/api/holidays?limit=100&sort=date`)
        const data = await res.json()

        if (data.docs) {
          setHolidays(data.docs)
        }
      } catch (error) {
        console.error('Error fetching holidays:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHolidays()
  }, [])

  // Get holidays for the current month
  const currentMonthHolidays = holidays.filter((hol) => {
    if (!date) return false
    const holidayDate = new Date(hol.date)
    return isSameMonth(holidayDate, date)
  })

  // Get upcoming holidays (next 30 days)
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
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
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
  }

  const modifiersClassNames = {
    holiday: 'bg-blue-50 text-blue-700 border-2 border-blue-300 rounded-md font-semibold',
  }

  const handleDayClick = (day: Date) => {
    const holiday = holidays.find((h) => isSameDay(new Date(h.date), day))
    if (holiday) {
      setSelectedHoliday(holiday)
      setIsHolidayDialogOpen(true)
    }
  }

  if (_loading) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-[400px] w-full rounded-3xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-3xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="w-full shadow-lg border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                Holidays Calendar
              </CardTitle>
              <CardDescription>View all company holidays and public holidays</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calendar */}
          <div className="flex justify-center -mx-4 sm:mx-0">
            <div className="w-full overflow-x-auto sm:overflow-visible flex justify-center p-1">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                onDayClick={handleDayClick}
                className="rounded-xl border border-slate-100 shadow-sm w-full max-w-full bg-white scale-[0.85] sm:scale-100 origin-top"
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                components={{
                  // @ts-expect-error - DayContent is a custom component prop
                  DayContent: (props: { date: Date }) => {
                    const holiday = holidays.find((h) => isSameDay(new Date(h.date), props.date))
                    const tooltipText = holiday
                      ? `${holiday.name} - ${getHolidayTypeLabel(holiday.type)}${holiday.description ? `: ${holiday.description}` : ''}`
                      : undefined
                    return (
                      <div
                        className={`relative w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 group transition-all ${holiday ? 'cursor-pointer hover:scale-105' : ''}`}
                        title={tooltipText}
                        onClick={() => holiday && handleDayClick(props.date)}
                      >
                        <span
                          className={`text-xs sm:text-sm ${holiday ? 'font-black text-indigo-600' : ''}`}
                        >
                          {props.date.getDate()}
                        </span>
                        {holiday && (
                          <div className="absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                        )}
                      </div>
                    )
                  },
                }}
              />
            </div>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 md:gap-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-50 border-2 border-indigo-300 rounded-md"></div>
              <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                Holiday
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] uppercase font-black">
                Public
              </Badge>
              <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                Public
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] uppercase font-black">
                Company
              </Badge>
              <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                Company
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] uppercase font-black">
                Optional
              </Badge>
              <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                Optional
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Holidays List */}
      {upcomingHolidays.length > 0 && (
        <Card className="w-full shadow-lg border-0 bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="w-5 h-5 text-indigo-600" />
              Upcoming Holidays
            </CardTitle>
            <CardDescription>Next 5 upcoming holidays</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 bg-white rounded-2xl md:rounded-[24px] border border-slate-100 hover:border-indigo-100 transition-all shadow-sm hover:shadow-md group/hol"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedHoliday(holiday)
                      setIsHolidayDialogOpen(true)
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5">
                      <h4 className="font-black text-base md:text-lg text-slate-900 leading-tight">
                        {holiday.name}
                      </h4>
                      <Badge
                        className={`${getHolidayTypeColor(holiday.type)} text-[10px] font-black uppercase tracking-wider`}
                      >
                        {getHolidayTypeLabel(holiday.type)}
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                      <CalendarDays className="w-3 h-3" />
                      {format(new Date(holiday.date), 'EEEE, MMM dd, yyyy')}
                    </p>
                    {holiday.description && (
                      <p className="text-sm text-slate-600 mt-3 font-medium border-l-2 border-indigo-100 pl-3">
                        {holiday.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 sm:mt-0 text-left sm:text-right border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
                    <p className="text-lg md:text-2xl font-black text-indigo-600 tracking-tighter">
                      {format(new Date(holiday.date), 'MMM dd')}
                    </p>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Marked Day
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Month Holidays Summary */}
      {currentMonthHolidays.length > 0 && (
        <Card className="w-full shadow-lg border-0 bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">{date && format(date, 'MMMM yyyy')} Holidays</CardTitle>
            <CardDescription>
              {currentMonthHolidays.length}{' '}
              {currentMonthHolidays.length === 1 ? 'holiday' : 'holidays'} this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentMonthHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedHoliday(holiday)
                    setIsHolidayDialogOpen(true)
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">{holiday.name}</span>
                      <Badge variant="outline" className={getHolidayTypeColor(holiday.type)}>
                        {getHolidayTypeLabel(holiday.type)}
                      </Badge>
                    </div>
                    {holiday.description && (
                      <p className="text-xs text-gray-600 ml-5 mt-1">{holiday.description}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-600">
                    {format(new Date(holiday.date), 'MMM dd')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holiday Details Dialog */}
      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              {selectedHoliday?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedHoliday && format(new Date(selectedHoliday.date), 'EEEE, MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedHoliday && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={getHolidayTypeColor(selectedHoliday.type)}>
                  {getHolidayTypeLabel(selectedHoliday.type)}
                </Badge>
              </div>

              {selectedHoliday.description ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    What is this holiday for?
                  </h4>
                  <p className="text-gray-700 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    {selectedHoliday.description}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No additional details available for this holiday.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
