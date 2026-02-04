'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  PartyPopper,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import type { Attendance } from '@/payload-types'

interface AttendanceCardProps {
  user: {
    id: string | number
    name?: string | null
    email?: string | null
    role?: string | null
  }
  timeFormat: '12h' | '24h'
}

export function AttendanceCard({ user, timeFormat }: AttendanceCardProps) {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [attendanceRecord, setAttendanceRecord] = useState<Attendance | null>(null)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)

  // Selfie States
  const [showSelfieModal, setShowSelfieModal] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [workSummary, setWorkSummary] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const [displayAddress, setDisplayAddress] = useState<string | null>(null)

  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.id) return
    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const res = await fetch(
        `/api/attendance?where[user][equals]=${user.id}&where[date][equals]=${todayStr}&limit=1&sort=-createdAt`,
        { credentials: 'include' },
      )
      const data = await res.json()
      if (data.docs && data.docs.length > 0) {
        const record = data.docs[0]
        setAttendanceRecord(record)
        if (record.timeIn) setCheckInTime(record.timeIn)
      } else {
        setAttendanceRecord(null)
        setCheckInTime(null)
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error)
    }
  }, [user?.id])

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user?.id) fetchTodayAttendance()
  }, [user?.id, fetchTodayAttendance])

  useEffect(() => {
    if (!user?.id || !attendanceRecord?.timeIn || attendanceRecord?.timeOut) return
    const interval = setInterval(fetchTodayAttendance, 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id, attendanceRecord?.timeIn, attendanceRecord?.timeOut, fetchTodayAttendance])

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting location', error)
          toast.error('Could not fetch location. Please enable GPS.')
        },
      )
    }
  }, [])

  useEffect(() => {
    if (!location) return
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'RocketGenieAttendance/1.0',
            },
          },
        )
        const data = await res.json()
        if (data && data.display_name) {
          setAddress(data.display_name)
          const a = data.address || {}
          const main = a.amenity || a.shop || a.office || a.building || a.road || ''
          const area = a.suburb || a.neighbourhood || a.village || ''
          const city = a.city || a.town || ''
          const district = a.district || a.county || ''
          const filtered = [main, area, city, district].filter(Boolean)
          const unique = Array.from(new Set(filtered))
          setDisplayAddress(unique.join(', ') || data.display_name)
        }
      } catch (err) {
        console.error('Geocoding error:', err)
      }
    }
    fetchAddress()
  }, [location])

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Could not access camera. Please allow permissions.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (context) {
        const MAX_WIDTH = 480
        const ratio = MAX_WIDTH / video.videoWidth
        canvas.width = MAX_WIDTH
        canvas.height = video.videoHeight * ratio
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/webp', 0.5)
        setCapturedImage(dataUrl)
        stopCamera()
      }
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleModalOpenChange = (open: boolean) => {
    setShowSelfieModal(open)
    if (open) {
      setTimeout(startCamera, 100)
    } else {
      stopCamera()
      setCapturedImage(null)
    }
  }

  const isCheckedIn = !!attendanceRecord && !!attendanceRecord.timeIn && !attendanceRecord.timeOut
  const isCheckedOut = !!attendanceRecord && !!attendanceRecord.timeIn && !!attendanceRecord.timeOut

  useEffect(() => {
    if (!isCheckedIn || !location) return
    const trackInterval = setInterval(
      async () => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords
            try {
              await fetch('/api/location-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude }),
              })
            } catch (err) {
              console.error('Failed to log live location:', err)
            }
          })
        }
      },
      5 * 60 * 1000,
    )
    return () => clearInterval(trackInterval)
  }, [isCheckedIn, location])

  const submitCheckIn = async () => {
    if (!location) {
      toast.error('Waiting for location...')
      return
    }
    if (!capturedImage) {
      toast.error('Please verify your identity with a selfie.')
      return
    }
    setLoading(true)
    try {
      const base64Response = await fetch(capturedImage)
      const blob = await base64Response.blob()
      const uploadRes = await fetch(
        `/api/upload?filename=selfie-${user.name || 'user'}-${Date.now()}.webp`,
        {
          method: 'POST',
          body: blob,
          credentials: 'include',
        },
      )
      if (!uploadRes.ok) throw new Error('Failed to upload selfie')
      const blobData = await uploadRes.json()
      const selfieUrl = blobData.url
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const res = await fetch('/api/check-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: todayStr,
          timeIn: now.toISOString(),
          status: 'present',
          location: {
            latitude: location.lat,
            longitude: location.lng,
            address: address || 'Captured via Dashboard',
          },
          selfie: selfieUrl,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAttendanceRecord(data.doc)
        setCheckInTime(now.toISOString())
        toast.success('Successfully checked in!')
        handleModalOpenChange(false)
      } else {
        toast.error(data.message || 'Failed to check in')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to process check-in')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!attendanceRecord || !location) {
      toast.error('Waiting for location...')
      return
    }
    if (!workSummary && !showSummaryModal) {
      setShowSummaryModal(true)
      return
    }
    setLoading(true)
    try {
      const now = new Date()
      const res = await fetch('/api/check-out', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: attendanceRecord.id,
          timeOut: now.toISOString(),
          location: {
            latitude: location.lat,
            longitude: location.lng,
            address: address || 'Captured via Dashboard',
          },
          workSummary,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAttendanceRecord(data.doc)
        setShowSummaryModal(false)
        toast.success('Checked out successfully!')
      } else {
        toast.error(data.message || 'Failed to check out')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !currentTime) {
    return (
      <div className="dashboard-card p-10 space-y-8">
        <div className="flex items-center justify-between mb-10">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-80 w-full rounded-[48px]" />
      </div>
    )
  }

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour12: timeFormat === '12h',
    hour: '2-digit',
    minute: '2-digit',
  })
  const formattedSeconds = currentTime.toLocaleTimeString([], { second: '2-digit' })
  const durationWorked = (() => {
    if (!isCheckedIn || !checkInTime || !currentTime) return null
    const start = new Date(checkInTime).getTime()
    const end = currentTime.getTime()
    const mins = Math.floor((end - start) / 60000)
    return { h: Math.floor(mins / 60), m: mins % 60 }
  })()

  return (
    <>
      <div className="dashboard-card overflow-hidden">
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          <div className="flex-1 p-5 md:p-10 bg-gradient-to-br from-white to-slate-200/20">
            <div className="flex items-center justify-between mb-8 md:mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="font-black text-lg md:text-xl tracking-tight text-slate-900 uppercase">
                  Session <span className="text-indigo-600">Console</span>
                </h2>
              </div>
              <button
                onClick={() => fetchTodayAttendance()}
                className="p-3 rounded-xl hover:bg-white hover:shadow-md text-slate-400"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center mb-8 md:mb-12 py-10 md:py-16 bg-white rounded-[40px] md:rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900">
                  {formattedTime.split(' ')[0]}
                </span>
                <span className="text-2xl md:text-4xl font-black text-indigo-600 ml-2">
                  {formattedSeconds}
                </span>
                <span className="text-sm md:text-xl font-black text-slate-400 ml-2 uppercase">
                  {formattedTime.split(' ')[1]}
                </span>
              </div>
              {isCheckedIn && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 mt-4 px-3 py-1 bg-green-50 rounded-full border border-green-100 relative z-10"
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                    Live Console Active
                  </span>
                </motion.div>
              )}
              <p className="text-xs font-bold text-slate-400 mt-6 uppercase tracking-widest">
                Indian Standard Time
              </p>
              <AnimatePresence>
                {isCheckedIn && durationWorked && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-8 px-6 py-2 bg-indigo-50 rounded-full border border-indigo-100 flex items-center gap-2"
                  >
                    <span className="text-xs md:text-sm font-black text-indigo-600">
                      Duration: {durationWorked.h > 0 ? `${durationWorked.h}h ` : ''}
                      {durationWorked.m}m
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-6 rounded-[32px] bg-slate-50/50 border border-slate-100 flex items-start gap-5">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Presence Location
                    </p>
                    {location && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-md border border-green-100">
                        <div className="w-0.5 h-0.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-black text-green-600 uppercase tracking-widest leading-none">
                          Active GPS
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900 leading-relaxed truncate md:whitespace-normal">
                    {displayAddress ||
                      (location
                        ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                        : 'Detecting...')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 p-6 md:p-10 flex flex-col justify-between bg-slate-50/30">
            <div className="space-y-6">
              <h3 className="font-black text-slate-900 uppercase text-sm opacity-50">
                Daily Status
              </h3>
              <div className="space-y-4">
                {isCheckedIn && (
                  <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-5">
                    <LogIn className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase">Check In</p>
                      <p className="text-xl font-black text-slate-900">
                        {new Date(attendanceRecord!.timeIn!).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {isCheckedOut && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-5">
                    <LogOut className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Check Out</p>
                      <p className="text-xl font-black text-slate-900">
                        {new Date(attendanceRecord!.timeOut!).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {!isCheckedIn && !isCheckedOut && (
                  <div className="p-10 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                    <PartyPopper className="w-10 h-10 text-slate-300 mb-4" />
                    <p className="text-sm font-bold text-slate-500">Session not started yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="relative min-h-[120px] flex flex-col justify-end mt-8">
              <AnimatePresence mode="wait">
                {isCheckedOut ? (
                  <motion.div
                    key="comp"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full p-6 md:p-8 rounded-2xl md:rounded-3xl bg-indigo-50 text-indigo-700 font-black text-center border border-indigo-100"
                  >
                    Session Completed
                  </motion.div>
                ) : isCheckedIn ? (
                  <motion.div
                    key="cout"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <Button
                      className="w-full bg-slate-900 text-white py-10 rounded-[32px] font-black text-xl shadow-xl"
                      onClick={handleCheckOut}
                      disabled={loading || !location}
                    >
                      Check Out
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cin"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <Button
                      className="w-full bg-indigo-600 text-white py-12 rounded-[40px] font-black text-2xl shadow-2xl shadow-indigo-100"
                      onClick={() => handleModalOpenChange(true)}
                      disabled={loading || !location}
                    >
                      Check In
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest mt-8">
                Secure Session Active
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSelfieModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <h2 className="text-2xl font-black">Identity Verification</h2>
            <p className="opacity-60 text-sm">Please center your face.</p>
          </div>
          <div className="p-8">
            <div className="relative aspect-square w-full bg-slate-100 rounded-[32px] overflow-hidden group mb-8">
              {cameraError ? (
                <div className="h-full flex items-center justify-center p-8 text-red-500 font-bold">
                  {cameraError}
                </div>
              ) : !capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 border-[40px] border-black/40"
                    style={{ borderRadius: '50%' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div className="relative w-full h-full">
                  <Image src={capturedImage} alt="Selfie" fill className="object-cover" />
                </div>
              )}
            </div>
            <div className="flex gap-4">
              {!capturedImage ? (
                <Button
                  onClick={capturePhoto}
                  className="w-full bg-indigo-600 text-white py-7 rounded-2xl font-bold"
                >
                  Capture
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    className="flex-1 py-7 rounded-2xl"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={submitCheckIn}
                    disabled={loading}
                    className="flex-[2] bg-indigo-600 text-white py-7 rounded-2xl font-bold"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 mr-3" />
                    )}
                    Confirm
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="bg-slate-900 p-10 text-white">
            <h2 className="text-3xl font-black">Work Summary</h2>
            <p className="opacity-60 text-sm">Tell us what you did today.</p>
          </div>
          <div className="p-10">
            <textarea
              className="w-full min-h-[180px] p-6 rounded-3xl border-2 border-slate-100 bg-slate-50 focus:bg-white outline-none text-base"
              placeholder="Describe achievements..."
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
            />
            <div className="flex gap-4 mt-8">
              <Button
                variant="ghost"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-7"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckOut}
                disabled={loading || !workSummary.trim()}
                className="flex-[2] bg-indigo-600 text-white py-7 rounded-2xl font-bold"
              >
                Submit & Checkout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
