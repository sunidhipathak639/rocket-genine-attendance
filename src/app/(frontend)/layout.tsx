import React from 'react'
import { Toaster } from '@/components/ui/sonner'

import './styles.css'

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Base tint so fluid blobs sit on a soft background */}
      <div
        className="fixed inset-0 z-0 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 dark:from-background dark:via-indigo-950/30 dark:to-background"
        aria-hidden
      />
      {/* Animated fluid blue blobs – moving background */}
      <div className="fluid-bg" aria-hidden>
        <div className="fluid-blob fluid-blob-1" />
        <div className="fluid-blob fluid-blob-2" />
        <div className="fluid-blob fluid-blob-3" />
        <div className="fluid-blob fluid-blob-4" />
        <div className="fluid-blob fluid-blob-5" />
      </div>
      <main className="relative z-10">{children}</main>
      <Toaster />
    </div>
  )
}
