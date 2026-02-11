'use client'

import { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface IssueSubmissionFormProps {
  onSuccess?: () => void
  isAuthenticated?: boolean
  userEmail?: string
}

export function IssueSubmissionForm({
  onSuccess,
  isAuthenticated = true,
  userEmail,
}: IssueSubmissionFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB in bytes

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const validFiles: File[] = []

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds 3MB limit. Please choose a smaller file.`)
        continue
      }
      validFiles.push(file)
    }

    setFiles((prev) => [...prev, ...validFiles])
    setError(null)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate form
      if (!title.trim()) {
        throw new Error('Title is required')
      }
      if (!description.trim()) {
        throw new Error('Description is required')
      }
      if (!isAuthenticated && !email.trim()) {
        throw new Error('Email is required to verify your staff account')
      }
      if (!isAuthenticated && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new Error('Please enter a valid email address')
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)

      // Upload files first (upload to blob, create media record)
      const uploadedFileIds: string[] = []
      for (const file of files) {
        // Upload to blob storage
        const uploadResponse = await fetch(
          `/api/upload?filename=task-attachment-${Date.now()}-${file.name}`,
          {
            method: 'POST',
            body: file,
            credentials: 'include',
          },
        )

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const { url } = await uploadResponse.json()

        // Create media record
        const mediaResponse = await fetch('/api/media', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            filename: file.name,
            alt: `Task attachment: ${file.name}`,
          }),
        })

        if (!mediaResponse.ok) {
          throw new Error(`Failed to create media record for ${file.name}`)
        }

        const mediaData = await mediaResponse.json()
        uploadedFileIds.push(mediaData.doc?.id ?? mediaData.id)
      }

      // Create task
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          attachments: uploadedFileIds,
          email: userEmail || email.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 401) {
          throw new Error(
            errorData.message || 'Please log in or provide your registered email address',
          )
        }
        if (response.status === 403) {
          throw new Error('Only staff members can report issues')
        }
        if (response.status === 404) {
          throw new Error(
            errorData.message ||
              'No staff account found with this email. Please check your email or contact admin.',
          )
        }
        throw new Error(errorData.message || 'Failed to create task')
      }

      setSuccess(true)
      setTimeout(() => {
        setTitle('')
        setDescription('')
        setEmail('')
        setFiles([])
        setSuccess(false)
        onSuccess?.()
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke="currentColor" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Issue Submitted!
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Your issue has been reported and will be assigned to Technical Staff.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

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
            We need to verify you are a registered staff member before submitting your issue.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
        >
          Issue Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800"
          placeholder="Brief description of the issue"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800"
          placeholder="Provide detailed information about the issue..."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Attachments (Optional)
        </label>
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center bg-slate-50 dark:bg-slate-800/50">
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            disabled={isSubmitting}
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-8 h-8 text-slate-500 dark:text-slate-400 mb-2" />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Click to upload files (max 3MB each)
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Images, PDFs, or Documents
            </span>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm text-slate-700 truncate">{file.name}</span>
                  <span className="text-xs text-slate-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 ml-2"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Issue'
          )}
        </button>
      </div>
    </form>
  )
}
