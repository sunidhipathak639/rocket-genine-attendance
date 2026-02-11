import React from 'react'
import { Toaster } from '@/components/ui/sonner'
import { FluidBackground } from '@/components/fluid-background'
import { ThemeProvider } from '@/components/theme-provider'
import { FloatingSupportIcon } from '@/components/floating-support-icon'

import './styles.css'

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen relative">
        {/* Base tint – behind fluid so blobs stay visible */}
        <div
          className="fixed inset-0 bg-gradient-to-br from-slate-50/95 via-indigo-50/50 to-slate-100/95 dark:from-background/95 dark:via-indigo-950/40 dark:to-background/95"
          style={{ zIndex: 0 }}
          aria-hidden
        />
        {/* Animated fluid blue blobs – Framer Motion */}
        <FluidBackground />
        <main className="relative z-10">{children}</main>
        <FloatingSupportIcon />
        <Toaster />
      </div>
    </ThemeProvider>
  )
}
