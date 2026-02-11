'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  LogOut,
  Download,
  User as UserIcon,
  Calendar,
  Sparkles,
  Zap,
  Target,
  Search,
  LayoutGrid,
  ListTodo,
  Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import type { User, Task } from '@/payload-types'
import { SyncUserTheme } from '@/components/theme-provider'
import { toast } from 'sonner'
import Image from 'next/image'
import Typewriter from 'typewriter-effect'
import gsap from 'gsap'
import { CustomCursor } from 'cursor-style'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

interface TechnicalDashboardProps {
  user: User
  tasks: Task[]
}

export function TechnicalDashboard({ user, tasks: initialTasks }: TechnicalDashboardProps) {
  const router = useRouter()
  const bgRef = useRef<HTMLDivElement>(null)

  // Floating animation like Staff Dashboard
  useEffect(() => {
    if (!bgRef.current) return

    const ctx = gsap.context(() => {
      gsap.to('.bg-blob-1', {
        x: '+=60',
        y: '+=40',
        rotation: 45,
        scale: 1.1,
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      gsap.to('.bg-blob-2', {
        x: '-=50',
        y: '+=70',
        rotation: -30,
        scale: 1.2,
        duration: 15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1,
      })
      gsap.to('.bg-blob-3', {
        x: '+=30',
        y: '-=50',
        rotation: 15,
        scale: 1.15,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      })
    }, bgRef)

    return () => ctx.revert()
  }, [])

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
    <div className="min-h-screen bg-transparent relative" ref={bgRef}>
      <SyncUserTheme theme={user.theme ?? undefined} />
      <CustomCursor type="five" showImages imageSize={30} imageFollowDelay={20} />

      {/* Floating Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="bg-blob-1 absolute -top-24 -left-24 w-96 h-96 bg-indigo-300/15 dark:bg-indigo-500/10 rounded-full blur-[100px]" />
        <div className="bg-blob-2 absolute top-1/2 -right-24 w-[500px] h-[500px] bg-blue-300/12 dark:bg-indigo-500/8 rounded-full blur-[120px]" />
        <div className="bg-blob-3 absolute -bottom-24 left-1/3 w-80 h-80 bg-violet-300/15 dark:bg-violet-500/10 rounded-full blur-[90px]" />
      </div>

      {/* Premium Header */}
      <header className="fixed top-0 inset-x-0 z-50 w-full bg-white/50 dark:bg-card/60 backdrop-blur-[20px] border-b border-border/80 px-4 md:px-8 py-3 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 md:gap-4 group cursor-pointer"
        >
          <motion.div
            className="w-11 h-11 md:w-14 md:h-14 relative flex-shrink-0"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/rocket-genine-logo.webp"
              alt="Rocket Genie"
              fill
              className="object-contain"
            />
          </motion.div>
          <span className="font-black text-xl md:text-2xl tracking-tighter text-indigo-600 flex items-center">
            <Typewriter
              options={{
                strings: ['Tech Lead'],
                autoStart: true,
                loop: true,
                delay: 50,
                deleteSpeed: 25,
                cursor: '',
              }}
            />
          </span>
        </motion.div>

        <div className="flex items-center gap-4">
          {/* Focus Mode Mock */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl w-10 h-10 hover:bg-indigo-50 dark:hover:bg-primary/10"
          >
            <Zap className="w-5 h-5 text-amber-500" />
          </Button>

          <div className="flex items-center gap-2 md:gap-3 pl-4 md:pl-6 border-l border-border">
            <div className="text-right hidden sm:block">
              <span className="block text-xs md:text-sm font-bold text-slate-900 dark:text-foreground truncate max-w-[100px] md:max-w-none">
                {user.name}
              </span>
              <span className="block text-[8px] md:text-[10px] uppercase tracking-widest font-black text-slate-400">
                TECHNICAL LEAD
              </span>
            </div>
            <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-border text-xs md:text-base z-10 overflow-hidden">
              {user.profileImage &&
              typeof user.profileImage === 'object' &&
              user.profileImage.url ? (
                <Image src={user.profileImage.url} alt="" fill className="object-cover" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 pt-24 pb-10 max-w-[1600px] relative z-10">
        <div className="mb-8 md:mb-12 text-center md:text-left">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-foreground mb-2"
          >
            Technical Overview
          </motion.h1>
          <p className="text-slate-500 dark:text-muted-foreground font-medium">
            Manage your assigned tasks and track development velocity.
          </p>
        </div>

        {/* Enhanced Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            {
              label: 'Total Tasks',
              value: stats.total,
              icon: Target,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50 dark:bg-indigo-500/10',
            },
            {
              label: 'Pending',
              value: stats.open,
              icon: Clock,
              color: 'text-blue-600',
              bg: 'bg-blue-50 dark:bg-blue-500/10',
            },
            {
              label: 'In Progress',
              value: stats.in_progress,
              icon: Zap,
              color: 'text-amber-600',
              bg: 'bg-amber-50 dark:bg-amber-500/10',
            },
            {
              label: 'Completed',
              value: stats.completed,
              icon: CheckCircle2,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="dashboard-card p-6 bg-white/60 dark:bg-card/40 backdrop-blur-md border border-white/20 dark:border-border rounded-3xl shadow-xl shadow-indigo-500/5 relative overflow-hidden group"
            >
              <div
                className={`absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity`}
              >
                <stat.icon className={`w-12 h-12 ${stat.color} opacity-10`} />
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-inner`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black text-slate-900 dark:text-foreground tabular-nums">
                    {stat.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Task List Section */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-foreground">
                <ListTodo className="w-6 h-6 text-indigo-600" />
                Action Items
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCSV}
                  className="rounded-xl h-9 border-slate-200 hover:bg-slate-50 dark:border-slate-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
              {(['all', 'open', 'in_progress', 'completed', 'rejected'] as const).map((status) => (
                <motion.button
                  key={status}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filter === status
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                      : 'bg-white dark:bg-card border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {status === 'all'
                    ? 'All Tasks'
                    : status === 'in_progress'
                      ? 'In Progress'
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                </motion.button>
              ))}
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredTasks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-12 text-center bg-white/40 dark:bg-card/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Rocket className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No tasks found for this filter.</p>
                  </motion.div>
                ) : (
                  filteredTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedTask(task)}
                      className={`group p-5 rounded-2xl cursor-pointer border transition-all duration-300 relative overflow-hidden ${
                        selectedTask?.id === task.id
                          ? 'bg-white dark:bg-card border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500'
                          : 'bg-white/60 dark:bg-card/40 border-white/40 dark:border-border hover:bg-white dark:hover:bg-card hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge
                              className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(task.status)} border-0`}
                            >
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs font-bold text-slate-400">#{task.id}</span>
                            {task.priority && (
                              <span
                                className={`text-[10px] font-black uppercase tracking-widest ${
                                  task.priority === 'high'
                                    ? 'text-red-500'
                                    : task.priority === 'medium'
                                      ? 'text-amber-500'
                                      : 'text-blue-500'
                                }`}
                              >
                                {task.priority} Priority
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-foreground mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {task.title}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 max-w-2xl">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {task.createdAt
                                ? format(new Date(task.createdAt), 'MMM d, yyyy')
                                : 'N/A'}
                            </span>
                            {task.createdBy && typeof task.createdBy === 'object' && (
                              <span className="flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5" />
                                {task.createdBy.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:border-indigo-200 transition-colors">
                          <Search className="w-4 h-4" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Task Details & Productivity Sidebar */}
          <div className="xl:col-span-1 space-y-8">
            {/* Productivity Card */}
            <div className="dashboard-card bg-indigo-600 text-white p-8 relative overflow-hidden rounded-3xl shadow-xl shadow-indigo-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <h3 className="relative z-10 text-xs font-bold uppercase tracking-widest text-indigo-200 mb-6">
                Productivity Pulse
              </h3>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <div className="text-4xl font-black mb-1">
                    {Math.round((stats.completed / Math.max(stats.total, 1)) * 100)}%
                  </div>
                  <div className="text-sm font-medium text-indigo-100">Completion Rate</div>
                </div>
                <div className="w-16 h-16">
                  <CircularProgressbar
                    value={(stats.completed / Math.max(stats.total, 1)) * 100}
                    strokeWidth={12}
                    styles={buildStyles({
                      pathColor: '#ffffff',
                      trailColor: 'rgba(255,255,255,0.2)',
                      strokeLinecap: 'round',
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10 text-center">
                <div className="bg-white/10 rounded-2xl p-3 border border-indigo-400/30">
                  <div className="text-2xl font-bold">{stats.completed}</div>
                  <div className="text-[10px] uppercase font-bold text-indigo-200">Done</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-indigo-400/30">
                  <div className="text-2xl font-bold">{stats.total - stats.completed}</div>
                  <div className="text-[10px] uppercase font-bold text-indigo-200">Pending</div>
                </div>
              </div>
            </div>

            {/* Sticky Task Details */}
            <AnimatePresence mode="wait">
              {selectedTask ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="sticky top-28"
                >
                  <div className="bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-white/20 dark:border-border rounded-3xl p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Task Details
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 rounded-full p-0"
                        onClick={() => setSelectedTask(null)}
                      >
                        <XCircle className="w-5 h-5 text-slate-400" />
                      </Button>
                    </div>

                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      <div>
                        <h4 className="text-lg font-black leading-tight mb-2 text-slate-900 dark:text-foreground">
                          {selectedTask.title}
                        </h4>
                        <Badge
                          className={`${getStatusColor(selectedTask.status)} border-0 rounded-lg`}
                        >
                          {selectedTask.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {selectedTask.description}
                      </div>

                      {/* Comments Section */}
                      <div>
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-slate-400" />
                          Discussion
                        </h4>
                        <div className="space-y-3 mb-4">
                          {selectedTask.comments?.map((c, i) => (
                            <div
                              key={i}
                              className="bg-white dark:bg-card border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm shadow-sm"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-indigo-600">
                                  {typeof c.author === 'object' ? c.author?.name : 'User'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {c.createdAt
                                    ? format(new Date(c.createdAt), 'MMM d, h:mm a')
                                    : ''}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300">{c.comment}</p>
                            </div>
                          ))}
                          {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                            <p className="text-center text-xs text-slate-400 italic py-2">
                              No comments yet
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="min-h-[80px] text-sm bg-white dark:bg-card"
                          />
                        </div>
                        <Button
                          className="w-full mt-2 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl"
                          size="sm"
                          onClick={handleAddComment}
                          disabled={isSubmitting || !comment.trim()}
                        >
                          {isSubmitting ? 'Posting...' : 'Post Comment'}
                        </Button>
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-sm mb-3 text-slate-500">Update Status</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {['in_progress', 'completed', 'rejected'].map(
                            (s) =>
                              selectedTask.status !== s && (
                                <Button
                                  key={s}
                                  size="sm"
                                  variant="outline"
                                  className={`justify-start h-9 rounded-lg font-semibold text-xs capitalize ${
                                    s === 'completed'
                                      ? 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                                      : s === 'rejected'
                                        ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                        : 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                                  }`}
                                  onClick={() =>
                                    handleStatusChange(selectedTask.id, s as Task['status'])
                                  }
                                >
                                  Mark {s.replace('_', ' ')}
                                </Button>
                              ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="dashboard-card bg-white/40 dark:bg-card/40 border-dashed border-2 border-slate-200 dark:border-slate-700 p-8 rounded-3xl text-center"
                >
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <LayoutGrid className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-slate-500">Select a task to view details</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
