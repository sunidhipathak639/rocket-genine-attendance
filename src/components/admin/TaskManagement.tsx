'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle2, Clock, XCircle, User, FileText } from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import type { Task } from '@/payload-types'

interface TaskStats {
  total: number
  open: number
  in_progress: number
  completed: number
  rejected: number
}

interface TasksPerStaff {
  id: number
  name: string
  email: string
  totalTasks: number
  open: number
  in_progress: number
  completed: number
  rejected: number
}

interface TaskAnalyticsData {
  stats: TaskStats
  tasksPerStaff: TasksPerStaff[]
}

const COLORS = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  rejected: '#ef4444',
}

export default function TaskManagement() {
  const [data, setData] = useState<TaskAnalyticsData | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<TasksPerStaff | null>(null)
  const [selectedStaffTasks, setSelectedStaffTasks] = useState<Task[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const base = typeof window !== 'undefined' ? window.location.origin : ''

      // Fetch analytics
      const analyticsRes = await fetch(`${base}/api/admin/tasks/analytics`, {
        credentials: 'include',
      })
      if (!analyticsRes.ok) throw new Error('Failed to load analytics')
      const analyticsData = await analyticsRes.json()
      setData(analyticsData)

      // Fetch all tasks
      const tasksRes = await fetch(`${base}/api/tasks?limit=1000`, {
        credentials: 'include',
      })
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setAllTasks(tasksData.docs || tasksData || [])
      }

      // Fetch technical staff (for future use if needed)
      // const staffRes = await fetch(`${base}/api/users?role=technical&limit=100`, {
      //   credentials: 'include',
      // })
      // if (staffRes.ok) {
      //   const staffData = await staffRes.json()
      //   // setTechnicalStaff(staffData.docs || staffData || [])
      // }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load task data')
    } finally {
      setLoading(false)
    }
  }

  const handleStaffClick = async (staff: TasksPerStaff) => {
    setSelectedStaff(staff)
    // Fetch tasks for this staff member
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${base}/api/tasks?assignedTo=${staff.id}&limit=100`, {
        credentials: 'include',
      })
      if (res.ok) {
        const tasksData = await res.json()
        setSelectedStaffTasks(tasksData.docs || tasksData || [])
      }
    } catch (err) {
      console.error('Failed to load staff tasks:', err)
      setSelectedStaffTasks([])
    }
  }

  const downloadCSV = (type: 'tasks' | 'staff') => {
    if (type === 'tasks') {
      const headers = [
        'ID',
        'Title',
        'Status',
        'Priority',
        'Created By',
        'Assigned To',
        'Created At',
        'Updated At',
      ]
      const rows = allTasks.map((task) => [
        task.id,
        task.title,
        task.status,
        task.priority || 'N/A',
        typeof task.createdBy === 'object' ? task.createdBy.name || task.createdBy.email : 'N/A',
        typeof task.assignedTo === 'object' ? task.assignedTo.name || task.assignedTo.email : 'N/A',
        task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        task.updatedAt ? format(new Date(task.updatedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `tasks_${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()
    } else if (type === 'staff' && data) {
      const headers = [
        'Name',
        'Email',
        'Total Tasks',
        'Open',
        'In Progress',
        'Completed',
        'Rejected',
        'Completion Rate',
      ]
      const rows = data.tasksPerStaff.map((staff) => [
        staff.name,
        staff.email,
        staff.totalTasks,
        staff.open,
        staff.in_progress,
        staff.completed,
        staff.rejected,
        staff.totalTasks > 0 ? `${Math.round((staff.completed / staff.totalTasks) * 100)}%` : '0%',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `technical_staff_${format(new Date(), 'yyyy-MM-dd')}.csv`
      link.click()
    }
  }

  const chartData = useMemo(() => {
    if (!data) return []
    return [
      { name: 'Open', value: data.stats.open, color: COLORS.open },
      { name: 'In Progress', value: data.stats.in_progress, color: COLORS.in_progress },
      { name: 'Completed', value: data.stats.completed, color: COLORS.completed },
      { name: 'Rejected', value: data.stats.rejected, color: COLORS.rejected },
    ]
  }, [data])

  const staffChartData = useMemo(() => {
    if (!data) return []
    return data.tasksPerStaff.map((staff) => ({
      name: staff.name.split(' ')[0], // First name only for chart
      total: staff.totalTasks,
      completed: staff.completed,
      inProgress: staff.in_progress,
      open: staff.open,
    }))
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-slate-500">Loading task data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-red-500">{error}</div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground">Task Management</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => downloadCSV('tasks')}
            variant="outline"
            className="rounded-xl h-10 px-4 font-semibold border-slate-200"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Tasks CSV
          </Button>
          <Button
            onClick={() => downloadCSV('staff')}
            variant="outline"
            className="rounded-xl h-10 px-4 font-semibold border-slate-200"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Staff CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground">
                  Total Tasks
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-foreground mt-2">
                  {data.stats.total}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground">
                  Pending
                </p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {data.stats.open + data.stats.in_progress}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground">
                  Completed
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {data.stats.completed}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground">
                  Rejected
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {data.stats.rejected}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) =>
                    percent !== undefined && percent > 0
                      ? `${name}: ${(percent * 100).toFixed(0)}%`
                      : null
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks Per Staff Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks Per Technical Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={staffChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="open" stackId="a" fill={COLORS.open} name="Open" />
                <Bar
                  dataKey="inProgress"
                  stackId="a"
                  fill={COLORS.in_progress}
                  name="In Progress"
                />
                <Bar dataKey="completed" stackId="a" fill={COLORS.completed} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Technical Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Staff Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Staff Member
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Total
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Open
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    In Progress
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Completed
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Rejected
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Completion Rate
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.tasksPerStaff.map((staff) => {
                  const completionRate =
                    staff.totalTasks > 0
                      ? Math.round((staff.completed / staff.totalTasks) * 100)
                      : 0
                  return (
                    <tr
                      key={staff.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                      onClick={() => handleStaffClick(staff)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-foreground">
                              {staff.name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-foreground">
                        {staff.totalTasks}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {staff.open}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          {staff.in_progress}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          {staff.completed}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          {staff.rejected}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {completionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStaffClick(staff)
                          }}
                        >
                          View Details
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

      {/* Technical Staff Details Modal */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedStaff?.name} - Task Details
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              {/* Staff Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                  <p className="font-medium text-slate-900 dark:text-foreground">
                    {selectedStaff.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Tasks</p>
                  <p className="font-medium text-slate-900 dark:text-foreground">
                    {selectedStaff.totalTasks}
                  </p>
                </div>
              </div>

              {/* Task List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Assigned Tasks</h3>
                <div className="space-y-3">
                  {selectedStaffTasks.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No tasks found</p>
                  ) : (
                    selectedStaffTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900 dark:text-foreground">
                                {task.title}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  task.status === 'completed'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : task.status === 'in_progress'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                      : task.status === 'rejected'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                }`}
                              >
                                {task.status === 'in_progress'
                                  ? 'In Progress'
                                  : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                              </span>
                              {task.priority && (
                                <span className="text-xs text-slate-500">
                                  Priority: {task.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              {task.createdAt && (
                                <span>
                                  Created: {format(new Date(task.createdAt), 'MMM dd, yyyy HH:mm')}
                                </span>
                              )}
                              {task.createdBy &&
                                typeof task.createdBy === 'object' &&
                                task.createdBy.name && <span>By: {task.createdBy.name}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Download Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={() => {
                    const headers = [
                      'Task ID',
                      'Title',
                      'Status',
                      'Priority',
                      'Description',
                      'Created At',
                      'Created By',
                    ]
                    const rows = selectedStaffTasks.map((task) => [
                      task.id,
                      task.title,
                      task.status,
                      task.priority || 'N/A',
                      task.description?.substring(0, 100) || '',
                      task.createdAt
                        ? format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss')
                        : 'N/A',
                      typeof task.createdBy === 'object' && task.createdBy.name
                        ? task.createdBy.name
                        : 'N/A',
                    ])

                    const csvContent = [
                      headers.join(','),
                      ...rows.map((row) =>
                        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
                      ),
                    ].join('\n')

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = `${selectedStaff.name.replace(/\s+/g, '_')}_tasks_${format(new Date(), 'yyyy-MM-dd')}.csv`
                    link.click()
                  }}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Tasks CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
