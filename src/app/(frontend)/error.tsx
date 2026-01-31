'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log so it appears in Vercel runtime logs when viewing this page
    console.error('Frontend error (digest %s):', error.digest, error.message)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mb-4 max-w-md">
        A server error occurred. Check your Vercel project → <strong>Logs</strong> (runtime, not
        build) for the real error. Often it&apos;s missing <code>PAYLOAD_SECRET</code> or{' '}
        <code>POSTGRES_URL</code> in Settings → Environment Variables.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/login"
          className="rounded-md border border-input bg-background px-4 py-2 hover:bg-accent"
        >
          Go to login
        </Link>
      </div>
    </div>
  )
}
