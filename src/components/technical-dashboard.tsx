'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  LogOut,
  Wrench,
  FileText,
  TrendingUp,
  Download,
  Filter,
  User,
  Calendar,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import type { User, Task } from '@/payload-types'
import { SyncUserTheme } from '@/components/theme-provider'
import { Rocket } from 'lucide-react'
import { toast } from 'sonner'

interface TechnicalDashboardProps {
  user: User
  tasks: Task[]
}

export function TechnicalDashboard({ user, tasks: initialTasks }: TechnicalDashboardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'rejected'>(
    'all',
  )

  // Refresh tasks periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/tasks?assignedTo=' + user.id + '&limit=100', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setTasks(data.docs || data || [])
        }
      } catch (err) {
        console.error('Failed to refresh tasks:', err)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [user.id])

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)

  const stats = {
    total: tasks.length,
    open: tasks.filter((t) => t.status === 'open').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    rejected: tasks.filter((t) => t.status === 'rejected').length,
  }

  const handleStatusChange = async (taskId: number, newStatus: Task['status']) => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task status')
      }

      const updatedTask = await response.json()
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask.task : t)))
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask.task)
      }
      toast.success(`Task status updated to ${newStatus.replace('_', ' ')}`)
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task status')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddComment = async () => {
    if (!selectedTask || !comment.trim()) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/tasks/${selectedTask.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: comment.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const updatedTask = await response.json()
      // Refresh tasks to get updated data with populated relationships
      const refreshRes = await fetch('/api/tasks?assignedTo=' + user.id + '&limit=100', {
        credentials: 'include',
      })
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        setTasks(refreshData.docs || refreshData || [])
        // Update selected task from refreshed data
        const refreshedTask = (refreshData.docs || refreshData || []).find(
          (t: Task) => t.id === selectedTask.id,
        )
        if (refreshedTask) {
          setSelectedTask(refreshedTask)
        } else {
          setSelectedTask(updatedTask.task)
        }
      } else {
        setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updatedTask.task : t)))
        setSelectedTask(updatedTask.task)
      }
      setComment('')
      toast.success('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/technical/login')
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/40'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/40'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-500/40'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/40'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300 border-gray-200 dark:border-gray-500/40'
    }
  }

  const downloadCSV = () => {
    const headers = [
      'Task ID',
      'Title',
      'Status',
      'Priority',
      'Description',
      'Created At',
      'Created By',
      'Updated At',
    ]
    const rows = tasks.map((task) => [
      task.id,
      task.title,
      task.status,
      task.priority || 'N/A',
      task.description?.substring(0, 100) || '',
      task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      typeof task.createdBy === 'object' && task.createdBy?.name ? task.createdBy.name : 'N/A',
      task.updatedAt ? format(new Date(task.updatedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `my_tasks_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 dark:from-background dark:via-indigo-950/20 dark:to-background">
      <SyncUserTheme />

      {/* Premium Header with Gradient */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-card/70 backdrop-blur-[20px] border-b border-border/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <motion.div
                className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Wrench className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-foreground flex items-center gap-2">
                  <Rocket className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  Technical Support
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Welcome back,{' '}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {user.name}
                  </span>
                </p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -4 }}
          >
            <Card className="dashboard-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-100 mb-1">Total Tasks</p>
                    <p className="text-4xl font-black">{stats.total}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card className="dashboard-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100 mb-1">Open</p>
                    <p className="text-4xl font-black">{stats.open}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ y: -4 }}
          >
            <Card className="dashboard-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-yellow-500 to-amber-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-100 mb-1">In Progress</p>
                    <p className="text-4xl font-black">{stats.in_progress}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ y: -4 }}
          >
            <Card className="dashboard-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500 to-emerald-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-100 mb-1">Completed</p>
                    <p className="text-4xl font-black">{stats.completed}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            whileHover={{ y: -4 }}
          >
            <Card className="dashboard-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-500 to-rose-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-100 mb-1">Rejected</p>
                    <p className="text-4xl font-black">{stats.rejected}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <XCircle className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Task List */}
          <div className="lg:col-span-2">
            <Card className="dashboard-card border-0 shadow-lg">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-foreground flex items-center gap-2">
                    <Filter className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Assigned Tasks
                  </CardTitle>
                  <Button
                    onClick={downloadCSV}
                    variant="outline"
                    size="sm"
                    className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {(['all', 'open', 'in_progress', 'completed', 'rejected'] as const).map(
                    (status) => (
                      <motion.div
                        key={status}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={() => setFilter(status)}
                          variant={filter === status ? 'default' : 'outline'}
                          size="sm"
                          className={`text-xs font-semibold ${
                            filter === status
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {status === 'all'
                            ? 'All'
                            : status === 'in_progress'
                              ? 'In Progress'
                              : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Button>
                      </motion.div>
                    ),
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  <AnimatePresence mode="wait">
                    {filteredTasks.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-12 text-center"
                      >
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <FileText className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-semibold text-lg">
                          No tasks found
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                          {filter === 'all'
                            ? 'You have no assigned tasks yet.'
                            : `No ${filter.replace('_', ' ')} tasks.`}
                        </p>
                      </motion.div>
                    ) : (
                      filteredTasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedTask(task)}
                          className={`p-5 cursor-pointer transition-all duration-200 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 ${
                            selectedTask?.id === task.id
                              ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-l-4 border-indigo-500 shadow-sm'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-foreground truncate">
                                  {task.title}
                                </h3>
                                <Badge
                                  className={`${getStatusColor(task.status)} font-semibold border`}
                                >
                                  {task.status === 'in_progress'
                                    ? 'In Progress'
                                    : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                </Badge>
                                {task.priority && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-semibold border-slate-300 dark:border-slate-700"
                                  >
                                    {task.priority}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                {task.createdAt && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(task.createdAt), 'MMM dd, yyyy HH:mm')}
                                  </span>
                                )}
                                {task.createdBy &&
                                  typeof task.createdBy === 'object' &&
                                  task.createdBy?.name && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {task.createdBy.name}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Task Details Sidebar */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedTask ? (
                <motion.div
                  key={selectedTask.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="dashboard-card border-0 shadow-lg sticky top-24">
                    <CardHeader className="border-b border-border/50 pb-4">
                      <CardTitle className="text-xl font-black text-slate-900 dark:text-foreground flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Task Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                      <div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h3 className="text-xl font-black text-slate-900 dark:text-foreground">
                            {selectedTask.title}
                          </h3>
                          <Badge
                            className={`${getStatusColor(selectedTask.status)} font-semibold border`}
                          >
                            {selectedTask.status === 'in_progress'
                              ? 'In Progress'
                              : selectedTask.status.charAt(0).toUpperCase() +
                                selectedTask.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-4 leading-relaxed">
                          {selectedTask.description}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                              Priority
                            </span>
                            <p className="font-bold text-slate-900 dark:text-foreground mt-1">
                              {selectedTask.priority || 'Medium'}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                              Created
                            </span>
                            <p className="font-bold text-slate-900 dark:text-foreground mt-1">
                              {selectedTask.createdAt
                                ? format(new Date(selectedTask.createdAt), 'MMM dd, yyyy')
                                : 'N/A'}
                            </p>
                          </div>
                          {selectedTask.createdBy &&
                            typeof selectedTask.createdBy === 'object' &&
                            selectedTask.createdBy?.name && (
                              <div className="col-span-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                                  Created By
                                </span>
                                <p className="font-bold text-slate-900 dark:text-foreground mt-1 flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  {selectedTask.createdBy.name}
                                </p>
                              </div>
                            )}
                        </div>
                      </div>

                      {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            Attachments
                          </h4>
                          <div className="space-y-2">
                            {selectedTask.attachments.map((attachment, idx) => (
                              <motion.a
                                key={idx}
                                href={
                                  typeof attachment.file === 'object' && attachment.file?.url
                                    ? attachment.file.url
                                    : '#'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.02 }}
                                className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-indigo-600 dark:text-indigo-400 font-medium"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="truncate">
                                  {typeof attachment.file === 'object' && attachment.file?.filename
                                    ? attachment.file.filename
                                    : `Attachment ${idx + 1}`}
                                </span>
                              </motion.a>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedTask.comments && selectedTask.comments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            Comments ({selectedTask.comments.length})
                          </h4>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {selectedTask.comments.map((comment, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {typeof comment.author === 'object' && comment.author
                                      ? comment.author.name || comment.author.email || 'Unknown'
                                      : comment.author
                                        ? `User ${comment.author}`
                                        : 'Anonymous'}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {comment.createdAt
                                      ? format(new Date(comment.createdAt), 'MMM dd, HH:mm')
                                      : 'Unknown time'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {comment.comment}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Add Comment
                        </h4>
                        <Textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={4}
                          className="mb-3 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                          placeholder="Add an update or comment..."
                        />
                        <Button
                          onClick={handleAddComment}
                          disabled={!comment.trim() || isSubmitting}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md"
                          size="sm"
                        >
                          {isSubmitting ? (
                            <>
                              <Zap className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Add Comment
                            </>
                          )}
                        </Button>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Update Status
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedTask.status !== 'in_progress' && (
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                onClick={() => handleStatusChange(selectedTask.id, 'in_progress')}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-md"
                                size="sm"
                              >
                                <Clock className="w-4 h-4" />
                                In Progress
                              </Button>
                            </motion.div>
                          )}
                          {selectedTask.status !== 'completed' && (
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                onClick={() => handleStatusChange(selectedTask.id, 'completed')}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
                                size="sm"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Complete
                              </Button>
                            </motion.div>
                          )}
                          {selectedTask.status !== 'rejected' && (
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                onClick={() => handleStatusChange(selectedTask.id, 'rejected')}
                                disabled={isSubmitting}
                                variant="destructive"
                                className="w-full flex items-center justify-center gap-2 font-semibold shadow-md"
                                size="sm"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="dashboard-card border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 font-bold text-lg mb-2">
                        Select a task to view details
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-500">
                        Click on any task from the list to see full information and manage it.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
