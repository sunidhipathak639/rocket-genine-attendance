'use client'

import { useState } from 'react'
import { Calendar, Loader2 } from 'lucide-react'

interface MeetingRequestFormProps {
  onSuccess?: () => void
  isAuthenticated?: boolean
}

export function MeetingRequestForm({ onSuccess, isAuthenticated = true }: MeetingRequestFormProps) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!isAuthenticated && !email.trim()) {
        throw new Error('Email is required to verify your staff account')
      }
      if (!isAuthenticated && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new Error('Please enter a valid email address')
      }
      if (!topic.trim()) {
        throw new Error('Meeting topic is required')
      }

      const response = await fetch('/api/meeting-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic: topic.trim(),
          description: description.trim(),
          ...(!isAuthenticated && { email: email.trim() }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit meeting request')
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setTopic('')
        setDescription('')
        setEmail('')
        onSuccess?.()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-foreground mb-2">
          Meeting Request Submitted!
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Your meeting request has been sent to Technical Staff. You will receive an email once
          it&apos;s scheduled.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isAuthenticated && (
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
          >
            Registered Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800"
            placeholder="Enter your registered staff email"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            We need to verify you are a registered staff member before submitting your meeting
            request.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="topic"
          className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
        >
          Meeting Topic <span className="text-red-500">*</span>
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800"
          placeholder="e.g., Need help with system access"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
        >
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 resize-none"
          placeholder="Provide additional details about what you'd like to discuss..."
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !topic.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Calendar className="w-5 h-5" />
            Request Meeting
          </>
        )}
      </button>
    </form>
  )
}
