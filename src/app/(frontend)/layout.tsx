import React from 'react'
import { Toaster } from '@/components/ui/sonner'

import './styles.css'

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main>{children}</main>
      <Toaster />
    </>
  )
}
