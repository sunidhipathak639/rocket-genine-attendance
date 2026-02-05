'use client'

import React, { useState } from 'react'
import { useDocumentInfo, Button } from '@payloadcms/ui'
import { Loader2, Send } from 'lucide-react'

export function SendMeetingButton() {
  const { id, data } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!id || !data) return null

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this meeting link to all selected participants?')) {
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${base}/api/send-meeting-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: id }),
      })
      const result = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage({ type: 'success', text: result.message || 'Meeting links sent successfully!' })
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to send emails.' })
      }
    } catch (error) {
      console.error('Error sending meeting emails:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
      <Button
        buttonStyle="primary"
        size="small"
        onClick={handleSend}
        disabled={loading}
        icon={
          loading ? (
            <Loader2 className="w-4 h-4 animate-spin !text-white" />
          ) : (
            <Send className="w-4 h-4 !text-white" />
          )
        }
      >
        <span style={{ color: 'white' }}>
          {loading ? 'Sending invitations...' : 'Send Invitations to All'}
        </span>
      </Button>
      {message && (
        <div
          style={{
            marginTop: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: message.type === 'success' ? '#10b981' : '#ef4444',
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
