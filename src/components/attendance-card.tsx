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
  Camera,
  PartyPopper,
  History,
  Loader2,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
      // lastRefreshed was removed
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

  // Fetch today's attendance on mount and auto-refresh every 60s when checked in
  useEffect(() => {
    if (user?.id) fetchTodayAttendance()
  }, [user?.id, fetchTodayAttendance])

  useEffect(() => {
    if (!user?.id || !attendanceRecord?.timeIn || attendanceRecord?.timeOut) return
    const interval = setInterval(fetchTodayAttendance, 60 * 1000) // refresh every 60s when checked in
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

  // Reverse Geocoding Logic
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

          // Intelligent address parsing for UI
          const a = data.address || {}
          const main = a.amenity || a.shop || a.office || a.building || a.road || ''
          const area = a.suburb || a.neighbourhood || a.village || ''
          const city = a.city || a.town || ''
          const district = a.district || a.county || ''

          const filtered = [main, area, city, district].filter(Boolean)
          // Remove duplicates (e.g. if city is same as area)
          const unique = Array.from(new Set(filtered))
          setDisplayAddress(unique.join(', ') || data.display_name)
        }
      } catch (err) {
        console.error('Geocoding error:', err)
      }
    }

    fetchAddress()
  }, [location])

  // Camera Logic
  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
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
        // Optimize: Resize to max width 480px to save data
        const MAX_WIDTH = 480
        const ratio = MAX_WIDTH / video.videoWidth
        canvas.width = MAX_WIDTH
        canvas.height = video.videoHeight * ratio

        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Optimize: High compression (quality 0.5)
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

  /* Helper States */
  const isCheckedIn = attendanceRecord && attendanceRecord.timeIn && !attendanceRecord.timeOut
  const isCheckedOut = attendanceRecord && attendanceRecord.timeIn && attendanceRecord.timeOut

  // Live Tracking Effect
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
    ) // Every 5 minutes

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
      // 1. Upload Selfie to Vercel Blob
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

      if (!uploadRes.ok) throw new Error('Failed to upload selfie to cloud')
      const blobData = await uploadRes.json()
      const selfieUrl = blobData.url

      // 2. Submit Check-in
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]

      const res = await fetch('/api/check-in', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
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
        toast.success('Checked in successfully with selfie verification!')
        handleModalOpenChange(false)
      } else {
        toast.error(data.message || data.errors?.[0]?.message || 'Failed to check in')
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: attendanceRecord.id,
          timeOut: now.toISOString(),
          location: {
            latitude: location.lat,
            longitude: location.lng,
            address: address || 'Captured via Dashboard',
          },
          workSummary, // Send the summary
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setAttendanceRecord(data.doc)
        setShowSummaryModal(false)
        toast.success('Work submitted and checked out successfully!')
      } else {
        toast.error(data.message || data.errors?.[0]?.message || 'Failed to check out')
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
      <div className="dashboard-card p-8 lg:p-14 space-y-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="w-12 h-12 rounded-2xl" />
        </div>
        <Skeleton className="h-64 md:h-80 w-full rounded-[48px]" />
        <div className="flex flex-col sm:flex-row gap-6">
          <Skeleton className="flex-1 h-24 rounded-[32px]" />
          <Skeleton className="flex-1 h-24 rounded-[32px]" />
        </div>
      </div>
    )
  }

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour12: timeFormat === '12h',
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedSeconds = currentTime.toLocaleTimeString([], {
    second: '2-digit',
  })

  // Live duration when checked in (no checkout yet)
  const durationWorked = (() => {
    if (!isCheckedIn || !checkInTime || !currentTime) return null
    const start = new Date(checkInTime).getTime()
    const end = currentTime.getTime()
    const mins = Math.floor((end - start) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return { h, m }
  })()

  return (
    <>
      <div className="dashboard-card overflow-hidden group">
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Left Section: Time & Status */}
          <div className="flex-1 p-6 md:p-10 bg-gradient-to-br from-white to-slate-200/20">
            <div className="flex items-center justify-between mb-8 md:mb-12">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 transition-transform group-hover:scale-105">
                  <Clock className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <h2 className="font-black text-lg md:text-xl tracking-tight text-slate-900 uppercase">
                  Session <span className="text-indigo-600">Console</span>
                </h2>
              </div>
              <button
                onClick={() => fetchTodayAttendance()}
                className="p-3 rounded-xl hover:bg-white hover:shadow-md text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center mb-8 md:mb-12 py-10 md:py-16 bg-white rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-[0_20px_50px_rgba(79,70,229,0.05)] relative overflow-hidden group/clock">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/10 via-transparent to-transparent opacity-0 group-hover/clock:opacity-100 transition-opacity duration-700" />
              <div className="absolute -right-8 md:-right-12 -top-8 md:-top-12 w-32 md:w-48 h-32 md:h-48 bg-indigo-600/5 rounded-full blur-2xl md:blur-3xl group-hover/clock:bg-indigo-600/10 transition-colors duration-700" />
              <div className="absolute top-0 left-0 w-full h-1 md:h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
              <div className="flex items-baseline gap-1 relative z-10 scale-90 sm:scale-100">
                <span className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 leading-none">
                  {formattedTime.split(' ')[0]}
                </span>
                <span className="text-2xl md:text-4xl font-black text-indigo-600 drop-shadow-sm ml-1 md:ml-2">
                  {formattedSeconds}
                </span>
                <span className="text-sm md:text-xl font-black text-slate-400 ml-1 md:ml-2 uppercase tracking-widest">
                  {formattedTime.split(' ')[1]}
                </span>
              </div>

              {isCheckedIn && (
                <div className="flex items-center gap-2 mt-4 px-3 py-1 bg-green-50 rounded-full border border-green-100 animate-pulse relative z-10">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                    Live Console Active
                  </span>
                </div>
              )}
              <p className="text-xs md:text-sm font-bold text-slate-400 mt-4 md:mt-6 uppercase tracking-widest text-center">
                Current Indian Standard Time
              </p>

              {isCheckedIn && durationWorked && (
                <div className="mt-6 md:mt-8 px-4 md:px-6 py-1.5 md:py-2 bg-indigo-50 rounded-full border border-indigo-100 flex items-center gap-2">
                  <span className="w-1.5 md:w-2 h-1.5 md:h-2 bg-indigo-600 rounded-full animate-pulse" />
                  <span className="text-xs md:text-sm font-black text-indigo-600">
                    Duration: {durationWorked.h > 0 ? `${durationWorked.h}h ` : ''}
                    {durationWorked.m}m
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex-1 p-4 md:p-6 rounded-[24px] md:rounded-[32px] bg-slate-50/50 border border-slate-100 flex items-start gap-4 md:gap-5 transition-all hover:bg-white hover:shadow-sm group/loc">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 group-hover/loc:scale-110 transition-transform flex-shrink-0">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate">
                      Presence Location
                    </p>
                    {location && (
                      <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
                        <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[7px] md:text-[8px] font-bold text-green-600 uppercase tracking-widest hidden sm:inline">
                          Active GPS
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed line-clamp-2">
                    {displayAddress ||
                      (location
                        ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                        : 'Detecting Location...')}
                  </p>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-5 rounded-[24px] md:rounded-[28px] bg-slate-50/50 border border-slate-100 flex items-center gap-3 md:gap-4 transition-all hover:bg-white">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg md:rounded-xl shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0">
                  <CalendarDays className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Today
                  </p>
                  <p className="text-xs md:text-sm font-bold text-slate-900 truncate">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Actions */}
          <div className="w-full lg:w-80 xl:w-96 p-6 md:p-10 flex flex-col justify-between space-y-8 md:space-y-10 bg-slate-50/30">
            <div className="space-y-4 md:space-y-6">
              <h3 className="font-black text-slate-900 tracking-tight uppercase text-xs md:text-sm opacity-50">
                Daily Status
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                {isCheckedIn && (
                  <div className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-4 md:gap-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                      <LogIn className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                      <p className="text-[8px] md:text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                        Check In
                      </p>
                      <p className="text-lg md:text-xl font-black text-slate-900">
                        {attendanceRecord?.timeIn &&
                          new Date(attendanceRecord.timeIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </p>
                    </div>
                  </div>
                )}

                {isCheckedOut && (
                  <div className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 md:gap-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                      <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                      <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Check Out
                      </p>
                      <p className="text-lg md:text-xl font-black text-slate-900">
                        {attendanceRecord?.timeOut &&
                          new Date(attendanceRecord.timeOut).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </p>
                    </div>
                  </div>
                )}

                {!isCheckedIn && !isCheckedOut && (
                  <div className="sm:col-span-2 lg:col-span-1 p-6 md:p-8 py-8 md:py-10 rounded-2xl md:rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                    <PartyPopper className="w-8 h-8 md:w-10 md:h-10 text-slate-300 mb-3 md:mb-4" />
                    <p className="text-xs md:text-sm font-bold text-slate-500 max-w-[200px]">
                      Session not started today.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              {isCheckedOut ? (
                <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-indigo-50 text-indigo-700 font-black text-center border border-indigo-100 text-sm md:text-base">
                  Session Completed
                </div>
              ) : isCheckedIn ? (
                <Button
                  className="w-full bg-gradient-to-br from-slate-800 to-slate-950 hover:from-black hover:to-black text-white py-6 md:py-10 rounded-[24px] md:rounded-[32px] font-black text-lg md:text-xl shadow-2xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-[0.98] group"
                  onClick={handleCheckOut}
                  disabled={loading || !location}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin mr-2 md:mr-3" />
                  ) : (
                    <LogOut className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 group-hover:translate-x-1 transition-transform" />
                  )}
                  Check Out
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-6 md:py-10 rounded-[24px] md:rounded-[32px] font-black text-lg md:text-xl shadow-2xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-[0.98] group"
                  onClick={() => handleModalOpenChange(true)}
                  disabled={loading || !location}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin mr-2 md:mr-3" />
                  ) : (
                    <Camera className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 group-hover:rotate-12 transition-transform" />
                  )}
                  Check In
                </Button>
              )}
              <p className="text-[8px] md:text-[10px] text-center text-slate-400 font-black uppercase tracking-[0.2em] mt-4 md:mt-6">
                Secure Session Active
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selfie Modal */}
      <Dialog open={showSelfieModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="bg-slate-900 p-8 text-white relative">
            <h2 className="text-2xl font-black mb-1">Identity Verification</h2>
            <p className="opacity-60 text-sm font-medium">Please center your face in the frame.</p>
            <div className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Camera className="w-6 h-6" />
            </div>
          </div>

          <div className="p-8">
            <div className="relative aspect-square w-full bg-slate-100 rounded-[32px] overflow-hidden border-8 border-slate-50 shadow-inner group mb-8">
              {cameraError ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-red-500 font-bold">
                  <LogOut className="w-12 h-12 mb-4 opacity-20" />
                  {cameraError}
                </div>
              ) : !capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover grayscale-[0.2]"
                  />
                  <div
                    className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"
                    style={{ borderRadius: '50%' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div className="relative w-full h-full">
                  <Image src={capturedImage} alt="Captured Selfie" fill className="object-cover" />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {!capturedImage ? (
                <Button
                  onClick={capturePhoto}
                  className="w-full bg-indigo-600 hover:bg-slate-900 text-white py-7 rounded-2xl font-bold text-base shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1"
                >
                  Capture Verification
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    className="flex-1 py-7 rounded-2xl border-2 font-bold hover:bg-slate-50"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={submitCheckIn}
                    className="flex-[2] bg-indigo-600 hover:bg-slate-900 text-white py-7 rounded-2xl font-bold text-base shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 mr-3" />
                    )}
                    Confirm Entry
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Modal */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="bg-slate-900 p-10 text-white">
            <h2 className="text-3xl font-black mb-2">Work Summary</h2>
            <p className="opacity-60 text-sm font-medium leading-relaxed">
              Let us know what you accomplished today before you sign off.
            </p>
          </div>
          <div className="p-10">
            <textarea
              className="w-full min-h-[180px] p-6 rounded-3xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-base font-medium"
              placeholder="Describe your achievements today..."
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
            />
            <div className="flex gap-4 mt-8">
              <Button
                variant="ghost"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-7 rounded-2xl font-bold text-slate-400 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckOut}
                disabled={loading || !workSummary.trim()}
                className="flex-[2] bg-indigo-600 hover:bg-slate-900 text-white py-7 rounded-2xl font-bold text-base shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                ) : (
                  <LogOut className="w-6 h-6 mr-3" />
                )}
                Submit & Finish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
