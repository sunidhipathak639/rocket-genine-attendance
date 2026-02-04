'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  Loader2,
  Camera,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { CalendarDays } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AttendanceCardProps {
  user: any
  timeFormat: '12h' | '24h'
  workStartTime?: string | null
  workEndTime?: string | null
}

export function AttendanceCard({
  user,
  timeFormat,
  workStartTime: workStartTimeProp,
  workEndTime: workEndTimeProp,
}: AttendanceCardProps) {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Selfie States
  const [showSelfieModal, setShowSelfieModal] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [workSummary, setWorkSummary] = useState('')

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
      setLastRefreshed(new Date())
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
            address: 'Captured via Dashboard',
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
            address: 'Captured via Dashboard',
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
      <Card className="w-full max-w-md mx-auto shadow-lg border-t-4 border-t-indigo-600 animate-pulse">
        <CardHeader className="text-center pb-2">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </CardContent>
      </Card>
    )
  }

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour12: timeFormat === '12h',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Live duration when checked in (no checkout yet)
  const durationWorked = (() => {
    if (!isCheckedIn || !checkInTime || !currentTime) return null
    const start = new Date(checkInTime).getTime()
    const end = currentTime.getTime()
    const mins = Math.floor((end - start) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })()

  const workStartDisplay = workStartTimeProp
    ? new Date(workStartTimeProp).toLocaleTimeString([], {
        hour12: timeFormat === '12h',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '9:00 AM'
  const workEndDisplay = workEndTimeProp
    ? new Date(workEndTimeProp).toLocaleTimeString([], {
        hour12: timeFormat === '12h',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '6:00 PM'

  return (
    <>
      <Card className="w-full max-w-md mx-auto shadow-lg border-t-4 border-t-indigo-600 transition-all duration-300 hover:shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-2xl font-bold text-gray-800">Mark Attendance</CardTitle>
            {lastRefreshed && (
              <button
                type="button"
                onClick={() => fetchTodayAttendance()}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
          <CardDescription>{formattedDate}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-xl border border-dashed border-indigo-100">
            <Clock className="w-12 h-12 text-indigo-600 mb-3 drop-shadow-sm" />
            <h1 className="text-4xl font-mono font-bold text-gray-900 tracking-wider filter drop-shadow-sm">
              {formattedTime}
            </h1>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide font-medium">
              Current Time
            </p>
            {isCheckedIn && durationWorked && (
              <p className="text-sm font-semibold text-indigo-600 mt-3">
                Duration: {durationWorked}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {/* Check In/Out Status */}
            {isCheckedIn && checkInTime && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full text-green-600">
                      <LogIn className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-green-800">Checked In</span>
                      <span className="text-xs text-green-600 font-mono">
                        {new Date(checkInTime).toLocaleTimeString([], {
                          hour12: timeFormat === '12h',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            )}

            {isCheckedOut && attendanceRecord?.timeOut && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                      <LogIn className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-blue-800">Checked In</span>
                      <span className="text-xs text-blue-600 font-mono">
                        {attendanceRecord.timeIn
                          ? new Date(attendanceRecord.timeIn).toLocaleTimeString([], {
                              hour12: timeFormat === '12h',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-purple-800">Checked Out</span>
                      <span className="text-xs text-purple-600 font-mono">
                        {new Date(attendanceRecord.timeOut).toLocaleTimeString([], {
                          hour12: timeFormat === '12h',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-white border border-gray-100 shadow-sm rounded-lg hover:border-blue-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Location</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {location
                      ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                      : 'Fetching...'}
                  </span>
                </div>
              </div>
              {location ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-gray-100 shadow-sm rounded-lg hover:border-violet-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-violet-50 rounded-full text-violet-600">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Shift</span>
                  <span className="text-xs text-gray-500">
                    {workStartDisplay} - {workEndDisplay}
                  </span>
                </div>
              </div>
            </div>
            {!attendanceRecord && (
              <p className="text-xs text-center text-gray-500 bg-amber-50 border border-amber-100 rounded-lg py-2 px-3">
                Check in before {workStartDisplay} to be marked on time
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          {isCheckedOut ? (
            <Button
              className="w-full text-lg py-6 transition-all duration-300 bg-blue-600 hover:bg-blue-700"
              disabled
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Already Checked Out Today
            </Button>
          ) : isCheckedIn ? (
            <Button
              className="w-full text-lg py-6 transition-all duration-300 bg-orange-600 hover:bg-orange-700"
              onClick={handleCheckOut}
              disabled={loading || !location}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking Out...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  Check Out Now
                </>
              )}
            </Button>
          ) : (
            <Button
              className="w-full text-lg py-6 transition-all duration-300 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => handleModalOpenChange(true)}
              disabled={loading || !location || !!attendanceRecord}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking In...
                </>
              ) : attendanceRecord ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Already Checked In Today
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  Selfie Entry
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={showSelfieModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selfie Verification</DialogTitle>
            <DialogDescription>Please take a selfie to verify your identity.</DialogDescription>
          </DialogHeader>

          <div className="relative aspect-[3/4] w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
            {cameraError ? (
              <p className="text-red-400 text-center p-4">{cameraError}</p>
            ) : !capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured Selfie"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <DialogFooter className="flex flex-row gap-2 justify-center sm:justify-between w-full">
            {!capturedImage ? (
              <Button onClick={capturePhoto} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={retakePhoto} className="flex-1">
                  <Undo2 className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={submitCheckIn}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Confirm Entry
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Daily Work Summary</DialogTitle>
            <DialogDescription>
              Please summarize your work for today before checking out.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full min-h-[150px] p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm"
              placeholder="What did you work on today?..."
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={loading || !workSummary.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit & Check Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
