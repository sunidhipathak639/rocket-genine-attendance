'use client'

import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { Button } from '@payloadcms/ui'
import { Loader2, DollarSign } from 'lucide-react'

/**
 * Renders on User edit view. Lets admin generate payroll for this user for the current month.
 */
export function GeneratePayrollButton() {
  const { id } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!id) return null

  const handleGenerate = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${base}/api/admin/generate-payroll`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Payroll created for this month.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate payroll.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        buttonStyle="secondary"
        size="small"
        onClick={handleGenerate}
        disabled={loading}
        icon={
          loading ? (
            <Loader2 className="w-4 h-4 animate-spin !text-white" />
          ) : (
            <DollarSign className="w-4 h-4 !text-white" />
          )
        }
      >
        <span style={{ color: 'white' }}>
          {loading ? 'Generating…' : 'Generate payroll for this month'}
        </span>
      </Button>
      {message && (
        <span
          className={message.type === 'success' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}
        >
          {message.text}
        </span>
      )}
    </div>
  )
}
