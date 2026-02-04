import React from 'react'
import { Toaster } from '@/components/ui/sonner'

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main>{children}</main>
      <Toaster />
    </>
  )
}
