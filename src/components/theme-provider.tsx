'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'rocket-genie-theme'

function getEffectiveDark(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(dark: boolean) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  effectiveDark: boolean
} | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

/** Call from pages that have user.theme to sync server preference into theme state. */
export function SyncUserTheme({ theme }: { theme?: Theme | null }) {
  const { setTheme } = useTheme()
  useEffect(() => {
    if (theme && (theme === 'light' || theme === 'dark' || theme === 'auto')) {
      setTheme(theme)
    }
  }, [theme, setTheme])
  return null
}

interface ThemeProviderProps {
  children: React.ReactNode
  /** Initial theme from server (e.g. user.theme). Syncs to localStorage on mount. */
  initialTheme?: Theme | null
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('auto')
  const [effectiveDark, setEffectiveDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const fromStorage = localStorage.getItem(STORAGE_KEY) as Theme | null
    const initial = initialTheme ?? fromStorage ?? 'auto'
    setThemeState(initial)
    if (!fromStorage && initialTheme) {
      localStorage.setItem(STORAGE_KEY, initialTheme)
    }
  }, [mounted, initialTheme])

  useEffect(() => {
    if (!mounted) return
    const dark =
      theme === 'dark' ||
      (theme === 'auto' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    setEffectiveDark(dark)
    applyTheme(dark)
  }, [mounted, theme])

  useEffect(() => {
    if (!mounted) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'auto') {
        const dark = getEffectiveDark()
        setEffectiveDark(dark)
        applyTheme(dark)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mounted, theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
    const dark =
      next === 'dark' ||
      (next === 'auto' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    setEffectiveDark(dark)
    applyTheme(dark)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveDark }}>
      {children}
    </ThemeContext.Provider>
  )
}
