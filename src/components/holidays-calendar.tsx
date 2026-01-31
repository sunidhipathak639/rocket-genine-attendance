'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { format, isSameDay, isSameMonth } from 'date-fns'
import { CalendarDays, Info, Sparkles } from 'lucide-react'

interface HolidaysCalendarProps {
  user?: {
    id: number
    name?: string
    email?: string
    role?: string
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
  const currentMonthHolidays = holidays.filter(hol => {
    if (!date) return false
    const holidayDate = new Date(hol.date)
    return isSameMonth(holidayDate, date)
  })

  // Get upcoming holidays (next 30 days)
  const upcomingHolidays = holidays
    .filter(hol => {
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
    holiday: (date: Date) => holidays.some(hol => isSameDay(new Date(hol.date), date)),
  }

  const modifiersClassNames = {
    holiday: 'bg-blue-50 text-blue-700 border-2 border-blue-300 rounded-md font-semibold',
  }

  const handleDayClick = (day: Date) => {
    const holiday = holidays.find(h => isSameDay(new Date(h.date), day))
    if (holiday) {
      setSelectedHoliday(holiday)
      setIsHolidayDialogOpen(true)
    }
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
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              onDayClick={handleDayClick}
              className="rounded-md border shadow-sm w-full max-w-full"
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              components={{
                // @ts-expect-error - DayContent is a custom component prop
                DayContent: (props: { date: Date }) => {
                  const holiday = holidays.find(h => isSameDay(new Date(h.date), props.date))
                  const tooltipText = holiday 
                    ? `${holiday.name} - ${getHolidayTypeLabel(holiday.type)}${holiday.description ? `: ${holiday.description}` : ''}`
                    : undefined
                  return (
                    <div 
                      className={`relative w-full h-full flex flex-col items-center justify-center p-2 group transition-all ${holiday ? 'cursor-pointer hover:scale-105' : ''}`}
                      title={tooltipText}
                      onClick={() => holiday && handleDayClick(props.date)}
                    >
                      <span className={holiday ? 'font-bold' : ''}>{props.date.getDate()}</span>
                      {holiday && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  )
                }
              }}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-300 rounded"></div>
              <span className="text-sm text-gray-600">Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">Public</Badge>
              <span className="text-sm text-gray-600">Public Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">Company</Badge>
              <span className="text-sm text-gray-600">Company Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Optional</Badge>
              <span className="text-sm text-gray-600">Optional Holiday</span>
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
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedHoliday(holiday)
                        setIsHolidayDialogOpen(true)
                      }}
                    >
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900">{holiday.name}</h4>
                      <Badge className={getHolidayTypeColor(holiday.type)}>
                        {getHolidayTypeLabel(holiday.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(new Date(holiday.date), 'EEEE, MMMM dd, yyyy')}
                    </p>
                    {holiday.description && (
                      <p className="text-sm text-gray-700 mt-2 font-medium">
                        {holiday.description}
                      </p>
                    )}
                    {!holiday.description && (
                      <p className="text-xs text-gray-400 mt-2 italic">Click to view details</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-indigo-600">
                      {format(new Date(holiday.date), 'MMM dd')}
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
            <CardTitle className="text-lg">
              {date && format(date, 'MMMM yyyy')} Holidays
            </CardTitle>
            <CardDescription>
              {currentMonthHolidays.length} {currentMonthHolidays.length === 1 ? 'holiday' : 'holidays'} this month
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
