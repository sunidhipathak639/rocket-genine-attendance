'use client'

import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { Button } from '@payloadcms/ui'
import { Loader2, Mail } from 'lucide-react'

/**
 * Renders on Leave edit view. Lets admin resend the approval/rejection email to the employee.
 */
export function ResendLeaveEmailButton() {
  const { id, data } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!id || !data) return null

  // Only show if the status is approved or rejected
  const isApprovedOrRejected =
    data.bookingStatus === 'approved' || data.bookingStatus === 'rejected'
  if (!isApprovedOrRejected) return null

  const handleResend = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${base}/api/resend-leave-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Email resent successfully.' })
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to resend email.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <Button
        buttonStyle="secondary"
        size="small"
        onClick={handleResend}
        disabled={loading}
        icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
      >
        {loading ? 'Resending…' : 'Resend Status Email'}
      </Button>
      {message && (
        <span
          className={
            message.type === 'success'
              ? 'text-green-600 text-sm font-bold'
              : 'text-red-600 text-sm font-bold'
          }
        >
          {message.text}
        </span>
      )}
    </div>
  )
}
