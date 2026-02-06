'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'

interface LeaveDoc {
  id: string
  startDate: string
  endDate: string
  type: string
  reason?: string | null
  bookingStatus: 'pending' | 'approved' | 'rejected'
}

interface MyLeaveStatusListProps {
  user: { id: string | number }
}

const typeLabels: Record<string, string> = {
  full_day: 'Full Day',
  half_day: 'Half Day',
  paid: 'Paid Leave',
  unpaid: 'Unpaid Leave',
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
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export function MyLeaveStatusList({ user }: MyLeaveStatusListProps) {
  const [leaves, setLeaves] = useState<LeaveDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaves = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/leaves?where[user][equals]=${user.id}&sort=-createdAt&limit=100`,
        { credentials: 'include' },
      )
      const data = await res.json()
      if (res.ok && data.docs) {
        setLeaves(data.docs)
      } else {
        setError('Failed to load leave requests.')
      }
    } catch {
      setError('Failed to load leave requests.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-800 text-sm"
      >
        {error}
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchLeaves}>
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          Leave History
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLeaves}
          className="text-indigo-600 hover:bg-indigo-50 font-bold uppercase tracking-widest text-[10px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {leaves.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-400 text-sm py-10 text-center font-medium bg-slate-50/50 rounded-3xl border border-dashed border-border"
          >
            No leave records found in the archive.
          </motion.p>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {/* Card View for Mobile */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {leaves.map((leave) => (
                <motion.div
                  key={leave.id}
                  variants={item}
                  whileHover={{ scale: 1.01 }}
                  className="p-5 bg-white rounded-2xl border border-border shadow-sm space-y-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          leave.bookingStatus === 'approved'
                            ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                            : leave.bookingStatus === 'rejected'
                              ? 'bg-red-500'
                              : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        }`}
                      />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {leave.bookingStatus}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                      {typeLabels[leave.type] || leave.type}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-900 leading-tight">
                      {format(new Date(leave.startDate), 'dd MMM yyyy')}
                      {leave.startDate !== leave.endDate && (
                        <> – {format(new Date(leave.endDate), 'dd MMM yyyy')}</>
                      )}
                    </p>
                    {leave.reason && (
                      <p className="text-xs font-medium text-slate-500 mt-2 italic line-clamp-2 leading-relaxed">
                        &quot;{leave.reason}&quot;
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Table View for Desktop */}
            <div className="hidden sm:block rounded-[32px] border border-border overflow-hidden bg-white/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-border/50">
                      <th className="text-left py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Date Range
                      </th>
                      <th className="text-left py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Type
                      </th>
                      <th className="text-left py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Reason
                      </th>
                      <th className="text-left py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaves.map((leave) => (
                      <motion.tr
                        key={leave.id}
                        variants={item}
                        className="hover:bg-white transition-all group/row"
                      >
                        <td className="py-5 px-8 font-black text-slate-900 group-hover/row:text-indigo-600 transition-colors">
                          {format(new Date(leave.startDate), 'dd MMM yyyy')}
                          {leave.startDate !== leave.endDate && (
                            <span className="text-slate-300 mx-2"> – </span>
                          )}
                          {leave.startDate !== leave.endDate &&
                            format(new Date(leave.endDate), 'dd MMM yyyy')}
                        </td>
                        <td className="py-5 px-8">
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 uppercase tracking-widest shadow-sm">
                            {typeLabels[leave.type] || leave.type}
                          </span>
                        </td>
                        <td
                          className="py-5 px-8 text-slate-500 font-medium italic max-w-[200px] truncate group-hover/row:text-slate-900 transition-colors"
                          title={leave.reason || ''}
                        >
                          {leave.reason || '—'}
                        </td>
                        <td className="py-5 px-8">
                          <span
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                              leave.bookingStatus === 'approved'
                                ? 'bg-green-50 text-green-700 border-green-100'
                                : leave.bookingStatus === 'rejected'
                                  ? 'bg-red-50 text-red-700 border-red-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            {leave.bookingStatus === 'approved' && (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {leave.bookingStatus === 'rejected' && (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {leave.bookingStatus === 'pending' && (
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                            )}
                            {leave.bookingStatus}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
