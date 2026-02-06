'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MoreHorizontal, ArrowRight, Plus } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import type { User, Attendance } from '@/payload-types'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'

interface AdminDashboardViewEnhancedProps {
  allUsers: User[]
  allAttendance: Attendance[]
}

export function AdminDashboardViewEnhanced({
  allUsers,
  allAttendance,
}: AdminDashboardViewEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Calculate stats
  const staffUsers = useMemo(() => allUsers.filter((u) => u.role === 'staff'), [allUsers])
  const todayAttendance = useMemo(
    () => allAttendance.filter((a) => a.date === todayStr),
    [allAttendance, todayStr],
  )

  // Company Performance Data (Radar Chart)
  const performanceData = useMemo(() => {
    const last30Days = allAttendance.filter((a) => {
      const attDate = new Date(a.date)
      const thirtyDaysAgo = subDays(new Date(), 30)
      return attDate >= thirtyDaysAgo
    })

    const onTimeCount = last30Days.filter((a) => a.status === 'present').length
    const totalCount = last30Days.length
    const punctuality = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0
    const attendance =
      totalCount > 0
        ? Math.round((last30Days.filter((a) => a.status !== 'absent').length / totalCount) * 100)
        : 0

    return [
      { metric: 'Diversity', value: 75 },
      { metric: 'Investment', value: 82 },
      { metric: 'Campaign', value: punctuality },
      { metric: 'Sustainability', value: 88 },
      { metric: 'Workload', value: 70 },
      { metric: 'Salary', value: 85 },
      { metric: 'Satisfaction', value: attendance },
      { metric: 'Ovr Performance', value: 80 },
    ]
  }, [allAttendance])

  // Company Job Levels Data
  const jobLevelsData = useMemo(() => {
    const departments: { [key: string]: number } = {}
    staffUsers.forEach((user) => {
      const dept = user.department || 'Unassigned'
      departments[dept] = (departments[dept] || 0) + 1
    })

    return Object.entries(departments).map(([name, count]) => ({
      name,
      count,
    }))
  }, [staffUsers])

  // Attendance Heatmap Data
  const heatmapData = useMemo(() => {
    const weeks = []
    for (let i = 4; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 })
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

      weeks.push(
        daysInWeek.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const dayAttendance = allAttendance.filter((a) => a.date === dayStr)
          const presentCount = dayAttendance.filter((a) =>
            ['present', 'late', 'half-day'].includes(a.status),
          ).length
          const totalStaff = staffUsers.length
          const percentage = totalStaff > 0 ? (presentCount / totalStaff) * 100 : 0

          return {
            date: format(day, 'd'),
            fullDate: dayStr,
            day: format(day, 'EEE'),
            percentage,
            hour: format(day, 'HH:mm'),
            status:
              percentage >= 90
                ? 'excellent'
                : percentage >= 75
                  ? 'good'
                  : percentage >= 50
                    ? 'average'
                    : 'low',
          }
        }),
      )
    }
    return weeks
  }, [allAttendance, staffUsers])

  // Mock task data
  const tasks = [
    { title: 'Creating new broadcast message for new Employee', endIn: 2, type: 'days' },
    { title: 'Creating campaign task for Digital Marketing', endIn: 6, type: 'days' },
    { title: 'Creating conference meet with stakeholders', endIn: 9, type: 'days' },
    { title: 'Move all finance files to new directory', endIn: 24, type: 'days' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button className="bg-white text-slate-900 border border-border hover:bg-slate-50 font-semibold">
          Create New Task
        </Button>
        <Button className="bg-white text-slate-900 border border-border hover:bg-slate-50 font-semibold">
          New Tracker
        </Button>
        <Button className="bg-white text-slate-900 border border-border hover:bg-slate-50 font-semibold">
          Add Payroll
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Performance */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Company Performance
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Company monthly analyzed performance</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={performanceData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Company Job Levels */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Company Job Levels
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Job level distribution in your company</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={jobLevelsData} layout="horizontal">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {jobLevelsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 3 === 0 ? '#06b6d4' : index % 3 === 1 ? '#3b82f6' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              <div className="text-3xl font-bold text-slate-900">
                {staffUsers.length}
                <span className="text-sm font-normal text-slate-500 ml-2">
                  Total employee and staff
                </span>
              </div>
              {jobLevelsData.slice(0, 3).map((dept, idx) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        idx === 0 ? 'bg-cyan-500' : idx === 1 ? 'bg-blue-500' : 'bg-indigo-500'
                      }`}
                    />
                    <span className="text-sm text-slate-700">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {dept.count} People
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {staffUsers.length > 0
                        ? Math.round((dept.count / staffUsers.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Report */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Attendance Report
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Real-time employee attendance report</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Time labels */}
              <div className="grid grid-cols-6 gap-2 text-xs text-slate-500 font-medium">
                <div className="col-span-1"></div>
                {['11:00', '10:00', '09:00', '08:30'].map((time) => (
                  <div key={time} className="text-right">
                    {time}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              {heatmapData.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-6 gap-2">
                  <div className="text-xs font-medium text-slate-600 flex items-center">
                    {week[0]?.day}
                  </div>
                  {week.slice(0, 5).map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`aspect-square rounded-lg transition-all hover:scale-105 cursor-pointer ${
                        day.status === 'excellent'
                          ? 'bg-blue-600'
                          : day.status === 'good'
                            ? 'bg-blue-500'
                            : day.status === 'average'
                              ? 'bg-blue-300'
                              : 'bg-slate-100'
                      }`}
                      title={`${day.fullDate}: ${Math.round(day.percentage)}% attendance`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tasks.map((task, idx) => (
          <Card key={idx} className="border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-sm text-slate-700 mb-4 min-h-[40px]">{task.title}</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">End in</div>
                  <div className="text-lg font-bold text-slate-900">
                    {task.endIn} {task.type === 'days' ? 'Days' : 'Hours'}
                  </div>
                </div>
                <Button size="icon" className="bg-blue-600 hover:bg-blue-700 rounded-lg h-10 w-10">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee Attendance Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Employer Attendance
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">Employee arrival details on this day</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Late Attendance
            </Button>
            <Button variant="outline" className="font-semibold">
              Day-Off Request
            </Button>
            <Button variant="outline" className="font-semibold">
              Time Tracker
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                    Employee ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                    Full Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                    Schedule In
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                    Schedule Out
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffUsers
                  .filter(
                    (user) =>
                      !searchQuery ||
                      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .slice(0, 10)
                  .map((user) => {
                    const userTodayAtt = todayAttendance.find(
                      (a) => (typeof a.user === 'object' ? a.user.id : a.user) === user.id,
                    )
                    const status = userTodayAtt?.status || 'not-checked-in'
                    const scheduleIn = userTodayAtt?.timeIn || '-'
                    const scheduleOut = userTodayAtt?.timeOut || '-'

                    return (
                      <tr key={user.id} className="border-b border-border hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-900">EM-{user.id}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {user.name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(), 'dd MMM yyyy')}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{scheduleIn}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{scheduleOut}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              status === 'present' || status === 'late'
                                ? 'bg-blue-100 text-blue-700'
                                : status === 'absent'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            ●{' '}
                            {status === 'not-checked-in'
                              ? 'Pending'
                              : status === 'late'
                                ? 'On-Time'
                                : status === 'present'
                                  ? 'On-Time'
                                  : 'Late'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
