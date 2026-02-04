'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, FileText, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

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
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-800 text-sm">
        {error}
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchLeaves}>
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          My Leave Status
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchLeaves} className="text-indigo-600">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {leaves.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">
          No leave requests yet. Request leave from the calendar below.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Card View for Mobile */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3"
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {leave.bookingStatus}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
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
                    <p className="text-xs font-medium text-slate-500 mt-1 italic line-clamp-2">
                      &quot;{leave.reason}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table View for Desktop */}
          <div className="hidden sm:block rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Date Range
                    </th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Type
                    </th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Reason
                    </th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr
                      key={leave.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {format(new Date(leave.startDate), 'dd MMM yyyy')}
                        {leave.startDate !== leave.endDate && (
                          <> – {format(new Date(leave.endDate), 'dd MMM yyyy')}</>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                          {typeLabels[leave.type] || leave.type}
                        </span>
                      </td>
                      <td
                        className="py-4 px-6 text-slate-500 italic max-w-[200px] truncate"
                        title={leave.reason || ''}
                      >
                        {leave.reason || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            leave.bookingStatus === 'approved'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : leave.bookingStatus === 'rejected'
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {leave.bookingStatus === 'approved' && (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {leave.bookingStatus === 'rejected' && (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {leave.bookingStatus === 'pending' && <Clock className="w-3.5 h-3.5" />}
                          {leave.bookingStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
