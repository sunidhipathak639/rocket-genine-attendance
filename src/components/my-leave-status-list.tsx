'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, FileText, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

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
        { credentials: 'include' }
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
        <p className="text-gray-500 text-sm py-4">No leave requests yet. Request leave from the calendar below.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date Range</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Reason</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-900">
                      {format(new Date(leave.startDate), 'dd MMM yyyy')}
                      {leave.startDate !== leave.endDate && (
                        <> – {format(new Date(leave.endDate), 'dd MMM yyyy')}</>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{typeLabels[leave.type] || leave.type}</td>
                    <td className="py-3 px-4 text-gray-600 hidden sm:table-cell max-w-[200px] truncate" title={leave.reason || ''}>
                      {leave.reason || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          leave.bookingStatus === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : leave.bookingStatus === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {leave.bookingStatus === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {leave.bookingStatus === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                        {leave.bookingStatus === 'pending' && <Clock className="w-3.5 h-3.5" />}
                        {leave.bookingStatus === 'approved' ? 'Approved' : leave.bookingStatus === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
