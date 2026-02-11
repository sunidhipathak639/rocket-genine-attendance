'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function AdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [clickSound, setClickSound] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    setClickSound(new Audio('/sounds/click.mp3'))
  }, [])

  const playClick = useCallback(() => {
    if (clickSound) {
      clickSound.currentTime = 0
      clickSound.play().catch(() => {
        // Ignore play errors (e.g., if user hasn't interacted with the page yet)
      })
    }
  }, [clickSound])

  const isTyping = email.length > 0 || password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      if (data.user?.role === 'staff') {
        setError('Please use the staff login page for staff accounts.')
        setIsLoading(false)
        return
      }

      // Redirect based on role
      if (data.user?.role === 'admin') {
        setTimeout(() => {
          window.location.href = '/admin'
        }, 100)
      } else if (data.user?.role === 'technical') {
        setTimeout(() => {
          window.location.href = '/technical'
        }, 100)
      } else {
        throw new Error('Invalid user role')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during login')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black font-sans text-white selection:bg-indigo-100 flex flex-col relative overflow-hidden">
      {/* Optimized Video Background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          >
            <source src="/login-bg.mp4" type="video/mp4" />
          </video>
        </motion.div>
        {/* Cinematic Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10" />
      </div>

      {/* Top Header */}
      <header className="p-4 md:p-6 flex items-center justify-between relative z-50"></header>

      <main className="flex-1 flex items-center justify-center p-4 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            borderColor: isTyping ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.2)',
            boxShadow: isTyping
              ? '0 0 40px rgba(59, 130, 246, 0.15)'
              : '0 32px 64px -16px rgba(0,0,0,0.3)',
          }}
          whileHover={{
            borderColor: 'rgba(59, 130, 246, 0.8)',
            scale: 1.01,
            transition: { duration: 0.2 },
          }}
          className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-[32px] border px-6 pt-4 pb-6 md:pt-4 md:px-10 md:pb-10 transition-colors duration-300"
        >
          <div className="text-center mb-2">
            <div className="flex flex-col items-center mb-0">
              <div className="w-32 h-32 relative">
                <Image
                  src="/rocket-genie-logo.webp"
                  alt="Rocket Genie"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight mb-1 text-white/90">
              Super Admin Login
            </h1>
            <p className="text-white/50 font-medium text-sm"></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert
                variant="destructive"
                className="border-red-500/50 bg-red-500/10 backdrop-blur-md rounded-2xl text-red-200"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-4">
              <Label
                htmlFor="email"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 ml-1"
              >
                Email
              </Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={playClick}
                  required
                  className="pl-12 h-12 bg-white/5 border-white/10 focus:bg-white/10 focus:border-blue-500/50 text-white placeholder:text-white/20 rounded-2xl transition-all hover:bg-white/10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Label
                htmlFor="password"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 ml-1"
              >
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={playClick}
                  required
                  className="pl-12 pr-12 h-12 bg-white/5 border-white/10 focus:bg-white/10 focus:border-blue-500/50 text-white placeholder:text-white/20 rounded-2xl transition-all hover:bg-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                onClick={playClick}
                className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 font-black text-lg rounded-2xl shadow-xl transition-all group cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Login{' '}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                )}
              </Button>
            </motion.div>

            <div className="text-center pt-6 border-t border-white/10 flex flex-col gap-3">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
                Other Login Portals
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link
                  href="/login"
                  className="text-sm text-white/70 font-black hover:text-white transition-colors uppercase tracking-[0.2em]"
                >
                  Staff Portal
                </Link>
                <span className="text-white/30">•</span>
                <Link
                  href="/technical/login"
                  className="text-sm text-white/70 font-black hover:text-white transition-colors uppercase tracking-[0.2em]"
                >
                  Technical Portal
                </Link>
              </div>
            </div>
          </form>
        </motion.div>
      </main>

      {/* Footer / Legal */}
      <footer className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 relative z-10">
        © 2026 Rocket Genie Intelligence Systems • All Rights Reserved
      </footer>
    </div>
  )
}
