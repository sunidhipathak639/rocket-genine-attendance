'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  Clock,
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  Loader2,
  Paperclip,
  Target,
  AlertCircle,
  FileText,
  Smile,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Attendance } from '@/payload-types'
import Tilt from 'react-parallax-tilt'
import { getUploadErrorMessage } from '@/lib/upload-errors'

const LottiePlayer = dynamic(
  () =>
    import('@lottiefiles/react-lottie-player').then((mod) => ({
      default: mod.Player,
    })),
  { ssr: false },
)

type FaceApiModule = typeof import('@vladmandic/face-api')

// Parse work-settings time (ISO string) to today's date at that local time
function getTodayAtTime(isoTime: string | null | undefined): Date | null {
  if (!isoTime) return null
  const d = new Date(isoTime)
  if (Number.isNaN(d.getTime())) return null
  const t = new Date()
  t.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), 0)
  return t
}

interface AttendanceCardProps {
  user: {
    id: string | number
    name?: string | null
    email?: string | null
    role?: string | null
  }
  timeFormat: '12h' | '24h'
  /** Work start time (ISO string from Work Settings). */
  workStartTime?: string | null
  /** Work end time (ISO string from Work Settings). */
  workEndTime?: string | null
  /** Called after successful check-in so the dashboard can enable the activity popup timer */
  onCheckInSuccess?: () => void
  /** Called after successful check-out so the dashboard can disable the activity popup timer */
  onCheckOutSuccess?: () => void
  /** Timestamp when current break ends (null if not on break) */
  breakEndsAt?: number | null
  /** Timestamp when current break started (null if not on break) */
  breakStartTime?: number | null
  /** List of completed breaks from attendance record */
  breaks?: Array<{ startTime: string; endTime: string; durationMinutes: number }>
  extensionConnected?: boolean
  _extensionDetected?: boolean
}

export function AttendanceCard({
  user,
  timeFormat,
  workStartTime,
  workEndTime,
  onCheckInSuccess,
  onCheckOutSuccess,
  breakEndsAt,
  breakStartTime,
  breaks = [],
  extensionConnected = false,
  _extensionDetected = false,
}: AttendanceCardProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<
    'not_secure' | 'permission_denied' | 'unavailable' | 'timeout' | null
  >(null)
  const [locationLoading, setLocationLoading] = useState(true)
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
  const [accomplishments, setAccomplishments] = useState('')
  const [challenges, setChallenges] = useState('')
  const [nextDayPlan, setNextDayPlan] = useState('')
  const [mood, setMood] = useState('good')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [displayAddress, setDisplayAddress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showEarlyCheckoutWarning, setShowEarlyCheckoutWarning] = useState(false)
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState('')

  // Face Detection State
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<
    'idle' | 'detecting' | 'valid' | 'invalid' | 'covered'
  >('idle')
  const [detectionMsg, setDetectionMsg] = useState('Initializing Face ID...')
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const detectionInterval = useRef<NodeJS.Timeout | null>(null)
  const faceApiRef = useRef<FaceApiModule | null>(null)

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

  const requestLocation = useCallback(() => {
    setLocationError(null)
    setLocationLoading(true)
    if (typeof window === 'undefined') return
    if (!window.isSecureContext) {
      setLocationError('not_secure')
      setLocationLoading(false)
      toast.error('Location works only on HTTPS or localhost.')
      return
    }
    if (!('geolocation' in navigator)) {
      setLocationError('unavailable')
      setLocationLoading(false)
      toast.error('Geolocation is not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationError(null)
        setLocationLoading(false)
      },
      (error: GeolocationPositionError) => {
        setLocationLoading(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('permission_denied')
            toast.error('Location denied. Allow location in browser to check in.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('unavailable')
            toast.error('Location unavailable. Check device location/GPS.')
            break
          case error.TIMEOUT:
            setLocationError('timeout')
            toast.error('Location timed out. Retry or enable GPS.')
            break
          default:
            setLocationError('unavailable')
            toast.error('Could not fetch location. Please enable GPS.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    )
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

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

  // Load Face API only in browser (avoids SSR TextEncoder / TensorFlow errors)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const loadModels = async () => {
      try {
        const faceapi = await import('@vladmandic/face-api')
        faceApiRef.current = faceapi
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
        setDetectionMsg('Position your face in the frame')
      } catch (err) {
        console.error('Failed to load FaceAPI models:', err)
        toast.error('Failed to load biometric models. Please refresh.')
      }
    }
    loadModels()
  }, [])

  const startFaceDetection = async () => {
    const faceapi = faceApiRef.current
    if (!videoRef.current || !overlayRef.current || !modelsLoaded || !faceapi) return

    if (detectionInterval.current) clearInterval(detectionInterval.current)

    const video = videoRef.current
    const canvas = overlayRef.current

    detectionInterval.current = setInterval(async () => {
      if (video.paused || video.ended) return

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
      const detection = await faceapi.detectSingleFace(video, options).withFaceLandmarks()

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      if (detection) {
        const { score } = detection.detection
        const box = detection.detection.box
        const dims = faceapi.matchDimensions(canvas, video, true)
        const resized = faceapi.resizeResults(detection, dims)

        // Human face check: face-api only detects real faces; score indicates confidence
        const MIN_FACE_WIDTH = 80
        const SCORE_VALID = 0.72
        const SCORE_LOW = 0.5
        const isFaceTooSmall = box.width < MIN_FACE_WIDTH

        // Coverage check: use mouth landmarks (48-67) - if mouth region height is too small, face may be covered
        let likelyCovered = false
        if (detection.landmarks?.positions?.length >= 68) {
          const mouthPoints = detection.landmarks.positions.slice(48, 68)
          const mouthYs = mouthPoints.map((p: { x: number; y: number }) => p.y)
          const mouthHeight = Math.max(...mouthYs) - Math.min(...mouthYs)
          const faceHeight = box.height
          if (faceHeight > 0 && mouthHeight / faceHeight < 0.06) {
            likelyCovered = true
          }
        }

        if (ctx) {
          const b = resized.detection.box
          const strokeColor =
            likelyCovered || score < SCORE_LOW
              ? '#dc2626'
              : score >= SCORE_VALID && !isFaceTooSmall
                ? '#16a34a'
                : '#4f46e5'
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(b.x, b.y + 20)
          ctx.lineTo(b.x, b.y)
          ctx.lineTo(b.x + 20, b.y)
          ctx.moveTo(b.x + b.width - 20, b.y)
          ctx.lineTo(b.x + b.width, b.y)
          ctx.lineTo(b.x + b.width, b.y + 20)
          ctx.moveTo(b.x + b.width, b.y + b.height - 20)
          ctx.lineTo(b.x + b.width, b.y + b.height)
          ctx.lineTo(b.x + b.width - 20, b.y + b.height)
          ctx.moveTo(b.x + 20, b.y + b.height)
          ctx.lineTo(b.x, b.y + b.height)
          ctx.lineTo(b.x, b.y + b.height - 20)
          ctx.stroke()
        }

        if (likelyCovered) {
          setFaceDetectionStatus('covered')
          setDetectionMsg('Remove obstructions from face')
        } else if (isFaceTooSmall) {
          setFaceDetectionStatus('invalid')
          setDetectionMsg('Move closer')
        } else if (score < SCORE_LOW) {
          setFaceDetectionStatus('invalid')
          setDetectionMsg('Face not clearly visible')
        } else if (score >= SCORE_VALID) {
          setFaceDetectionStatus('valid')
          setDetectionMsg('Face verified')
        } else {
          setFaceDetectionStatus('invalid')
          setDetectionMsg('Center your face in frame')
        }
      } else {
        setFaceDetectionStatus('idle')
        setDetectionMsg('Position your face in the frame')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }, 200) // Run every 200ms
  }

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready then start detection
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          startFaceDetection()
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Could not access camera. Please allow permissions.')
    }
  }

  const stopCamera = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current)
      detectionInterval.current = null
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setFaceDetectionStatus('idle')
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const MAX_SIZE = 3 * 1024 * 1024 // 3MB
      const newFiles = Array.from(e.target.files)

      const oversizedFiles = newFiles.filter((file) => file.size > MAX_SIZE)
      if (oversizedFiles.length > 0) {
        toast.error(
          `Files too large! Max size is 3MB. Skipping: ${oversizedFiles.map((f) => f.name).join(', ')}`,
        )
        // Filter out the oversized files and add the rest
        const validFiles = newFiles.filter((file) => file.size <= MAX_SIZE)
        if (validFiles.length > 0) {
          setSelectedFiles((prev) => [...prev, ...validFiles])
        }
      } else {
        setSelectedFiles((prev) => [...prev, ...newFiles])
      }
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isCheckedIn = !!attendanceRecord && !!attendanceRecord.timeIn && !attendanceRecord.timeOut
  const isCheckedOut = !!attendanceRecord && !!attendanceRecord.timeIn && !!attendanceRecord.timeOut

  // Calculate expected working hours from work start and end times (must be defined first)
  const expectedWorkingHours = (() => {
    if (!workStartTime || !workEndTime) return 9 // Default fallback

    // Get today's dates at work start and end times
    const startToday = getTodayAtTime(workStartTime)
    const endToday = getTodayAtTime(workEndTime)

    if (!startToday || !endToday) return 9 // Default fallback

    const expectedMs = endToday.getTime() - startToday.getTime()
    return expectedMs / (60 * 60 * 1000)
  })()

  // Check if currently on break
  const isOnBreak = breakEndsAt != null && Date.now() < breakEndsAt

  // Calculate total break duration in milliseconds (from completed breaks)
  const totalBreakMs = (() => {
    if (!breaks || breaks.length === 0) return 0
    return breaks.reduce((total, breakItem) => {
      return total + breakItem.durationMinutes * 60 * 1000
    }, 0)
  })()

  // Calculate current break duration if on break
  // Note: Break duration is calculated elsewhere, this is kept for future use
  // const currentBreakMs = (() => {
  //   if (!isOnBreak || !breakEndsAt) return 0
  //   return 0 // Will be handled by excluding current time period
  // })()

  // Calculate duration worked (excluding break time)
  const durationWorked = (() => {
    if (!isCheckedIn || !checkInTime || !currentTime) return null

    const checkInDate = new Date(checkInTime).getTime()
    const now = currentTime.getTime()

    // If on break, use break start time instead of now
    let effectiveEndTime = now
    if (isOnBreak && breakStartTime) {
      // Use the break start time as the effective end time (time stops during break)
      effectiveEndTime = breakStartTime
    }

    // Total time from check-in to effective end time
    const totalMs = Math.max(0, effectiveEndTime - checkInDate)

    // Subtract completed break durations
    const workedMs = Math.max(0, totalMs - totalBreakMs)

    const mins = Math.floor(workedMs / 60000)
    return { h: Math.floor(mins / 60), m: mins % 60, isPaused: isOnBreak }
  })()

  // Calculate remaining working hours based on actual duration worked (excluding breaks)
  const remainingHours = (() => {
    if (!isCheckedIn || !checkInTime || !currentTime) return null

    const checkInDate = new Date(checkInTime).getTime()
    const now = currentTime.getTime()

    // If on break, use break start time instead of now
    let effectiveEndTime = now
    if (isOnBreak && breakStartTime) {
      // Use the break start time as the effective end time (time stops during break)
      effectiveEndTime = breakStartTime
    }

    // Total time from check-in to effective end time
    const totalMs = Math.max(0, effectiveEndTime - checkInDate)

    // Subtract completed break durations
    const workedMs = Math.max(0, totalMs - totalBreakMs)
    const workedHours = workedMs / (60 * 60 * 1000)

    // Calculate remaining hours: expected hours - hours already worked
    const remaining = expectedWorkingHours - workedHours

    return { hours: remaining > 0 ? remaining : 0, isPaused: isOnBreak }
  })()

  const hasCompletedHours = remainingHours !== null && remainingHours.hours <= 0

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
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        const msg = errData?.message || 'Failed to upload selfie'
        const friendly = getUploadErrorMessage(msg)
        toast.error(friendly)
        throw new Error(friendly)
      }
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
        onCheckInSuccess?.()
        toast.success('Successfully checked in!')
        handleModalOpenChange(false)
        router.refresh()
      } else {
        toast.error(data.message || 'Failed to check in')
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to process check-in')
    } finally {
      setLoading(false)
    }
  }

  const proceedToCheckout = async () => {
    if (!attendanceRecord || !location) {
      toast.error('Waiting for location...')
      return
    }

    if (!workSummary && !showSummaryModal) {
      setShowSummaryModal(true)
      return
    }

    // If summary modal is already open, proceed with checkout
    await submitCheckout()
  }

  const submitCheckout = async () => {
    if (!attendanceRecord || !location) {
      toast.error('Waiting for location...')
      return
    }
    setLoading(true)
    setUploading(true)
    try {
      const now = new Date()

      // 1. Upload Attachments to Vercel Blob and create Media docs
      const attachmentIds: (string | number)[] = []
      for (const file of selectedFiles) {
        try {
          // A. Upload to Vercel Blob
          const blobRes = await fetch(
            `/api/upload?filename=report-${user.name || 'user'}-${Date.now()}-${file.name}`,
            {
              method: 'POST',
              body: file,
              credentials: 'include',
            },
          )

          if (!blobRes.ok) {
            const errData = await blobRes.json().catch(() => ({}))
            const msg = errData?.message || `Could not upload ${file.name}`
            const friendly = getUploadErrorMessage(msg)
            toast.error(friendly)
            throw new Error(friendly)
          }
          const blobData = await blobRes.json()
          const blobUrl = blobData.url

          // B. Create Metadata Doc in Payload Media Collection
          const mediaRes = await fetch('/api/media', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: blobUrl,
              filename: file.name,
              alt: `Work attachment: ${file.name} from ${user.name} on ${new Date().toLocaleDateString()}`,
            }),
          })

          if (mediaRes.ok) {
            const mediaDocData = await mediaRes.json()
            attachmentIds.push(mediaDocData.doc.id)
          } else {
            console.error('Failed to create media doc for:', file.name)
          }
        } catch (err) {
          console.error('File upload error:', err)
          toast.error(err instanceof Error ? err.message : `Could not upload ${file.name}`)
        }
      }

      // 2. Submit Advanced Check-Out
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
          accomplishments,
          challenges,
          nextDayPlan,
          mood,
          attachments: attachmentIds,
          earlyCheckoutReason:
            !hasCompletedHours && earlyCheckoutReason ? earlyCheckoutReason : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAttendanceRecord(data.doc)
        setShowSummaryModal(false)
        setShowEarlyCheckoutWarning(false)
        setEarlyCheckoutReason('')
        onCheckOutSuccess?.()
        toast.success('Shift report submitted! Have a great evening.')
        router.refresh()
      } else {
        toast.error(data.message || 'Failed to check out')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const handleCheckOut = () => {
    if (!attendanceRecord || !location) {
      toast.error('Waiting for location...')
      return
    }

    // Check if user hasn't completed working hours
    if (!hasCompletedHours && remainingHours !== null && remainingHours.hours > 0) {
      // Show warning first
      setShowEarlyCheckoutWarning(true)
      return
    }

    // Proceed to summary modal or checkout
    proceedToCheckout()
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

  // Calculate total hours worked and attendance status for checked out sessions
  const sessionSummary = (() => {
    if (!isCheckedOut || !attendanceRecord?.timeIn || !attendanceRecord?.timeOut) return null

    const timeInDate = new Date(attendanceRecord.timeIn)
    const timeOutDate = new Date(attendanceRecord.timeOut)
    const workedMs = Math.max(0, timeOutDate.getTime() - timeInDate.getTime())
    const workedHours = workedMs / (60 * 60 * 1000)
    const workedMins = Math.floor((workedMs % (60 * 60 * 1000)) / (60 * 1000))

    // Calculate expected working hours based on work start and end times
    let expectedHours = 9 // Default fallback
    if (workStartTime && workEndTime) {
      const start = new Date(workStartTime)
      const end = new Date(workEndTime)
      const expectedMs = end.getTime() - start.getTime()
      expectedHours = expectedMs / (60 * 60 * 1000)
    }

    // Use the status from the record (already calculated by backend)
    // Map 'late' to 'present' for display purposes since late is still considered present
    const recordStatus = attendanceRecord.status
    let displayStatus: 'present' | 'half-day' | 'absent' = 'present'

    if (recordStatus === 'absent') {
      displayStatus = 'absent'
    } else if (recordStatus === 'half-day') {
      displayStatus = 'half-day'
    } else {
      // 'present' or 'late' both count as present
      displayStatus = 'present'
    }

    return {
      hours: Math.floor(workedHours),
      minutes: workedMins,
      status: displayStatus,
      workedHours,
      expectedHours,
    }
  })()

  return (
    <>
      <Tilt
        tiltMaxAngleX={2}
        tiltMaxAngleY={2}
        perspective={1000}
        scale={1.01}
        transitionSpeed={1000}
        className="dashboard-card overflow-hidden transform-gpu"
      >
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-border">
          <div className="flex-1 p-5 md:p-10 bg-gradient-to-br from-white to-slate-200/20 dark:from-card dark:to-muted/30">
            <div className="flex items-center justify-between mb-8 md:mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 dark:bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="font-black text-lg md:text-xl tracking-tight text-slate-900 dark:text-foreground uppercase">
                  Session <span className="text-indigo-600 dark:text-primary">Console</span>
                </h2>
              </div>
              <button
                onClick={() => fetchTodayAttendance()}
                className="p-3 rounded-xl hover:bg-white dark:hover:bg-muted hover:shadow-md text-slate-400 dark:text-muted-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center mb-8 md:mb-12 py-10 md:py-16 bg-white/70 dark:bg-muted/50 backdrop-blur-xl rounded-[40px] md:rounded-[48px] border border-border shadow-sm relative overflow-hidden">
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-foreground">
                  {formattedTime.split(' ')[0]}
                </span>
                <span className="text-2xl md:text-4xl font-black text-indigo-600 dark:text-primary ml-2">
                  {formattedSeconds}
                </span>
                <span className="text-sm md:text-xl font-black text-slate-400 dark:text-muted-foreground ml-2 uppercase">
                  {formattedTime.split(' ')[1]}
                </span>
              </div>
              {isCheckedIn && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 mt-4 px-3 py-1 bg-green-50 dark:bg-green-500/20 rounded-full border border-green-100 dark:border-green-500/40 relative z-10"
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black text-green-600 dark:text-green-300 uppercase tracking-widest">
                    Live Console Active
                  </span>
                </motion.div>
              )}
              <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground mt-6 uppercase tracking-widest">
                Indian Standard Time
              </p>
              <AnimatePresence>
                {isCheckedIn && durationWorked && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-8 px-6 py-2 rounded-full border flex items-center gap-2 ${
                      durationWorked.isPaused
                        ? 'bg-orange-50 dark:bg-orange-500/20 border-orange-200 dark:border-orange-500/40'
                        : 'bg-indigo-50 dark:bg-primary/20 border-indigo-100 dark:border-primary/30'
                    }`}
                  >
                    <span
                      className={`text-xs md:text-sm font-black ${
                        durationWorked.isPaused
                          ? 'text-orange-600 dark:text-orange-300'
                          : 'text-indigo-600 dark:text-primary'
                      }`}
                    >
                      Duration: {durationWorked.h > 0 ? `${durationWorked.h}h ` : ''}
                      {durationWorked.m}m
                      {durationWorked.isPaused && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider opacity-75">
                          (Paused)
                        </span>
                      )}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-6 rounded-[32px] bg-slate-50/50 dark:bg-muted/50 border border-border flex items-start gap-5">
                <div className="w-12 h-12 bg-white dark:bg-muted rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 dark:text-primary flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-muted-foreground uppercase tracking-[0.2em]">
                      Presence Location
                    </p>
                    {location && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-500/20 rounded-md border border-green-100 dark:border-green-500/40">
                        <div className="w-0.5 h-0.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-black text-green-600 dark:text-green-300 uppercase tracking-widest leading-none">
                          Active GPS
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-foreground leading-relaxed truncate md:whitespace-normal">
                    {displayAddress ||
                      (location
                        ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                        : locationError === 'not_secure'
                          ? 'Use HTTPS or localhost for location'
                          : locationError === 'permission_denied'
                            ? 'Location blocked — allow in browser'
                            : locationError === 'timeout'
                              ? 'Location timed out'
                              : locationError === 'unavailable'
                                ? 'Location unavailable'
                                : locationLoading
                                  ? 'Detecting...'
                                  : 'Detecting...')}
                  </p>
                  {locationError && !location && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={requestLocation}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Retry location
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 p-6 md:p-10 flex flex-col justify-between bg-slate-50/30 dark:bg-muted/20">
            <div className="space-y-6">
              <h3 className="font-black text-slate-900 dark:text-muted-foreground uppercase text-sm opacity-50">
                Daily Status
              </h3>
              <div className="space-y-4">
                {isCheckedIn && (
                  <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-primary/10 border border-indigo-100 dark:border-primary/20 flex items-center gap-5">
                    <LogIn className="w-5 h-5 text-indigo-600 dark:text-primary" />
                    <div>
                      <p className="text-[10px] font-bold text-indigo-500 dark:text-primary uppercase">
                        Check In
                      </p>
                      <p className="text-xl font-black text-slate-900 dark:text-foreground">
                        {new Date(attendanceRecord!.timeIn!).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {isCheckedOut && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-muted/50 border border-border flex items-center gap-5">
                    <LogOut className="w-5 h-5 text-slate-400 dark:text-muted-foreground" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground uppercase">
                        Check Out
                      </p>
                      <p className="text-xl font-black text-slate-900 dark:text-foreground">
                        {new Date(attendanceRecord!.timeOut!).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {!isCheckedIn && !isCheckedOut && (
                  <div className="p-10 rounded-3xl bg-indigo-50/80 dark:bg-indigo-500/10 border-2 border-dashed border-border flex flex-col items-center text-center">
                    <div className="mb-4 h-16 w-16 flex items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full">
                      <LottiePlayer
                        src="/Confetti.json"
                        autoplay
                        loop
                        style={{ height: '64px', width: '64px' }}
                      />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-indigo-200/90">
                      Session not started yet.
                    </p>
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
                    className="w-full space-y-4"
                  >
                    <div className="w-full p-6 md:p-8 rounded-2xl md:rounded-3xl bg-indigo-50 dark:bg-primary/10 text-indigo-700 dark:text-primary font-black text-center border border-indigo-100 dark:border-primary/20">
                      Session Completed
                    </div>

                    {sessionSummary && (
                      <div
                        className="w-full p-6 rounded-2xl border-2 space-y-3"
                        style={{
                          backgroundColor:
                            sessionSummary.status === 'present'
                              ? 'rgba(34, 197, 94, 0.1)'
                              : sessionSummary.status === 'half-day'
                                ? 'rgba(249, 115, 22, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                          borderColor:
                            sessionSummary.status === 'present'
                              ? 'rgba(34, 197, 94, 0.3)'
                              : sessionSummary.status === 'half-day'
                                ? 'rgba(249, 115, 22, 0.3)'
                                : 'rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <div className="text-center space-y-2">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                            Today&apos;s Work Summary
                          </p>
                          <p
                            className="text-2xl md:text-3xl font-black"
                            style={{
                              color:
                                sessionSummary.status === 'present'
                                  ? 'rgb(34, 197, 94)'
                                  : sessionSummary.status === 'half-day'
                                    ? 'rgb(249, 115, 22)'
                                    : 'rgb(239, 68, 68)',
                            }}
                          >
                            {sessionSummary.hours > 0 ? `${sessionSummary.hours}h ` : ''}
                            {sessionSummary.minutes}m
                          </p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Total time worked today
                          </p>
                        </div>

                        <div className="pt-3 border-t border-current/20">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className="px-4 py-2 rounded-full text-sm font-black uppercase tracking-widest border-2"
                              style={{
                                backgroundColor:
                                  sessionSummary.status === 'present'
                                    ? 'rgba(34, 197, 94, 0.2)'
                                    : sessionSummary.status === 'half-day'
                                      ? 'rgba(249, 115, 22, 0.2)'
                                      : 'rgba(239, 68, 68, 0.2)',
                                borderColor:
                                  sessionSummary.status === 'present'
                                    ? 'rgb(34, 197, 94)'
                                    : sessionSummary.status === 'half-day'
                                      ? 'rgb(249, 115, 22)'
                                      : 'rgb(239, 68, 68)',
                                color:
                                  sessionSummary.status === 'present'
                                    ? 'rgb(34, 197, 94)'
                                    : sessionSummary.status === 'half-day'
                                      ? 'rgb(249, 115, 22)'
                                      : 'rgb(239, 68, 68)',
                              }}
                            >
                              {sessionSummary.status === 'present' && '✓ Present'}
                              {sessionSummary.status === 'half-day' && '⚠ Half Day'}
                              {sessionSummary.status === 'absent' && '✗ Absent'}
                            </span>
                          </div>
                          <p
                            className="text-center text-xs font-semibold mt-2"
                            style={{
                              color:
                                sessionSummary.status === 'present'
                                  ? 'rgb(34, 197, 94)'
                                  : sessionSummary.status === 'half-day'
                                    ? 'rgb(249, 115, 22)'
                                    : 'rgb(239, 68, 68)',
                            }}
                          >
                            {sessionSummary.status === 'present' &&
                              'You have completed your full working hours today.'}
                            {sessionSummary.status === 'half-day' &&
                              'You are marked as Half Day for today.'}
                            {sessionSummary.status === 'absent' &&
                              'You are marked as Absent for today.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : isCheckedIn ? (
                  <motion.div
                    key="cout"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full space-y-2"
                  >
                    {remainingHours !== null && remainingHours.hours > 0 && (
                      <p
                        className={`text-center text-xs font-semibold mb-2 ${
                          remainingHours.isPaused
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {remainingHours.hours >= 1
                          ? `${Math.floor(remainingHours.hours)}h ${Math.round((remainingHours.hours % 1) * 60)}m remaining`
                          : `${Math.round(remainingHours.hours * 60)}m remaining`}
                        {remainingHours.isPaused && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider opacity-75">
                            (Paused)
                          </span>
                        )}
                      </p>
                    )}
                    {hasCompletedHours && (
                      <p className="text-center text-xs font-semibold text-green-600 dark:text-green-400 mb-2">
                        ✓ Working hours completed
                      </p>
                    )}
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCheckOut()}
                      className="w-full h-16 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center gap-2 text-white font-black text-xl shadow-xl border border-slate-700/50 transition-colors"
                    >
                      <LogOut className="w-6 h-6" /> Check Out
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cin"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <div
                      className={`relative w-full h-24 rounded-[3rem] p-2 border shadow-inner overflow-hidden select-none transition-all duration-500 ${
                        user.role === 'staff' && !extensionConnected
                          ? 'bg-rose-50/50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 grayscale'
                          : 'bg-indigo-50/50 dark:bg-primary/10 border-indigo-100 dark:border-primary/20'
                      }`}
                    >
                      {/* Slider Track Text */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <span
                          className={`font-black text-xs md:text-sm uppercase tracking-widest animate-pulse whitespace-nowrap pl-16 ${
                            user.role === 'staff' && !extensionConnected
                              ? 'text-rose-400 dark:text-rose-500'
                              : 'text-indigo-400 dark:text-primary'
                          }`}
                        >
                          {user.role === 'staff' && !extensionConnected
                            ? 'Enable Work Sync to Check In'
                            : 'Slide to Check In'}
                        </span>
                        {(user.role !== 'staff' || extensionConnected) && (
                          <div className="absolute left-0 top-0 bottom-0 w-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        )}
                      </div>

                      {/* Draggable Button */}
                      <motion.div
                        drag={user.role !== 'staff' || extensionConnected ? 'x' : false}
                        dragConstraints={{ left: 0, right: 240 }}
                        dragElastic={0.1}
                        dragMomentum={false}
                        onDragEnd={(e, info) => {
                          if (info.offset.x > 150) {
                            if (user.role === 'staff' && !extensionConnected) {
                              toast.custom((_t) => (
                                <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                                    <AlertCircle className="text-rose-600 dark:text-rose-400" />
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 dark:text-white uppercase text-xs">
                                      Access Denied
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Please enable the Work Sync extension to start your session.
                                    </p>
                                  </div>
                                </div>
                              ))
                              return
                            }
                            handleModalOpenChange(true)
                          }
                        }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl relative z-10 transition-all duration-500 ${
                          user.role === 'staff' && !extensionConnected
                            ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50'
                            : 'bg-indigo-600 dark:bg-primary cursor-grab active:cursor-grabbing shadow-indigo-200 dark:shadow-primary/30'
                        }`}
                        whileHover={
                          user.role !== 'staff' || extensionConnected
                            ? { scale: 1.1 }
                            : { x: [0, -5, 5, -5, 5, 0] }
                        }
                        whileTap={
                          user.role !== 'staff' || extensionConnected ? { scale: 0.95 } : {}
                        }
                      >
                        <div className="bg-white/20 p-3 rounded-full">
                          {user.role === 'staff' && !extensionConnected ? (
                            <X className="w-8 h-8 text-white" />
                          ) : (
                            <LogIn className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-[10px] text-center text-slate-400 dark:text-muted-foreground font-black uppercase tracking-widest mt-8">
                Secure Session Active
              </p>
            </div>
          </div>
        </div>
      </Tilt>

      <Dialog open={showSelfieModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 text-white border-b border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                <Smile className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Identity Verification
                </DialogTitle>
                <p className="text-slate-400 text-xs md:text-sm font-medium">
                  Live face check • No masks or obstructions
                </p>
              </div>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-3">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                Real human face detected
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                Face fully visible
              </li>
            </ul>
          </div>
          <div className="p-6 md:p-8">
            <div className="relative aspect-square w-full bg-slate-900 rounded-[28px] overflow-hidden border border-slate-700/50 mb-6">
              {cameraError ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-red-400 font-bold mb-2">Camera access needed</p>
                  <p className="text-slate-400 text-sm">{cameraError}</p>
                </div>
              ) : !capturedImage ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-slate-900/70 z-10 pointer-events-none" />

                  {/* Face oval guide (subtle) */}
                  <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <div
                      className="w-[70%] aspect-[3/4] rounded-full border-2 border-dashed border-white/10"
                      style={{ maxWidth: '220px' }}
                    />
                  </div>

                  {/* Status pill */}
                  <div className="absolute top-4 left-0 right-0 z-20 flex justify-center px-4">
                    <div
                      className={`px-4 py-2.5 rounded-full backdrop-blur-md border shadow-lg transition-all duration-300 ${
                        faceDetectionStatus === 'valid'
                          ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                          : faceDetectionStatus === 'covered'
                            ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                            : faceDetectionStatus === 'invalid'
                              ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                              : 'bg-slate-700/60 border-slate-600 text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        {faceDetectionStatus === 'valid' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Target className="w-4 h-4 shrink-0 animate-pulse" />
                        )}
                        {detectionMsg}
                      </p>
                    </div>
                  </div>

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  <canvas
                    ref={overlayRef}
                    className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1] z-20"
                  />

                  {faceDetectionStatus !== 'valid' && (
                    <div className="absolute inset-0 z-[5] opacity-20 pointer-events-none overflow-hidden">
                      <div className="w-full h-[2px] bg-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div className="relative w-full h-full">
                  <Image src={capturedImage} alt="Selfie" fill className="object-cover" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 text-center mb-4">
              {!capturedImage
                ? faceDetectionStatus === 'valid'
                  ? 'Face verified. You can capture now.'
                  : 'Ensure your full face is visible with no mask or hands.'
                : 'Review your photo below.'}
            </p>
            <div className="flex gap-4">
              {!capturedImage ? (
                <Button
                  onClick={capturePhoto}
                  disabled={faceDetectionStatus !== 'valid'}
                  className={`w-full py-7 rounded-2xl font-bold text-base transition-all duration-300 ${
                    faceDetectionStatus === 'valid'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_0_24px_rgba(79,70,229,0.35)]'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800'
                  }`}
                >
                  {faceDetectionStatus === 'valid' ? (
                    <>Capture photo</>
                  ) : (
                    <>Align face to enable capture</>
                  )}
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
        <DialogContent className="sm:max-w-2xl rounded-3xl p-0 border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-background dark:bg-card">
          <div className="bg-slate-900 p-8 text-white shrink-0">
            <DialogTitle className="text-2xl md:text-3xl font-black text-white">
              Daily Shift Report
            </DialogTitle>
            <p className="opacity-60 text-sm">Review your achievements and plan for tomorrow.</p>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-background dark:bg-card">
            {/* Sentiment Selector */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Smile className="w-4 h-4" /> End of Day Mood
              </label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger className="w-full h-14 rounded-2xl border-2 border-border bg-slate-50 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-700 text-foreground text-base font-bold">
                  <SelectValue placeholder="How was your day?" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border">
                  <SelectItem value="productive">🚀 Highly Productive</SelectItem>
                  <SelectItem value="good">✅ Good Progress</SelectItem>
                  <SelectItem value="challenging">⚠️ Challenging</SelectItem>
                  <SelectItem value="exhausting">😴 Exhausting</SelectItem>
                  <SelectItem value="blocked">📉 Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* General Overview */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" /> Shift Overview
              </label>
              <textarea
                className="w-full min-h-[100px] p-6 rounded-2xl border-2 border-border bg-slate-50 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-700 text-foreground placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none text-base transition-all"
                placeholder="A brief summary of your shift..."
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
              />
            </div>

            {/* Accomplishments */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4" /> Key Accomplishments (Required)
              </label>
              <textarea
                className="w-full min-h-[120px] p-6 rounded-2xl border-2 border-border bg-slate-50 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-700 text-foreground placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none text-base transition-all"
                placeholder="What did you achieve today?"
                value={accomplishments}
                onChange={(e) => setAccomplishments(e.target.value)}
              />
            </div>

            {/* Challenges */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Blockers & Challenges
              </label>
              <textarea
                className="w-full min-h-[100px] p-6 rounded-2xl border-2 border-border bg-slate-50 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-700 text-foreground placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none text-base transition-all"
                placeholder="Any issues that slowed you down?"
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
              />
            </div>

            {/* Next Day Plan */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" /> Agenda for Tomorrow
              </label>
              <textarea
                className="w-full min-h-[100px] p-6 rounded-2xl border-2 border-border bg-slate-50 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-700 text-foreground placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none text-base transition-all"
                placeholder="Top priorities for your next shift?"
                value={nextDayPlan}
                onChange={(e) => setNextDayPlan(e.target.value)}
              />
            </div>

            {/* Early Checkout Reason - Show only if checking out early */}
            {!hasCompletedHours && remainingHours !== null && remainingHours.hours > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Early Checkout Reason (Required)
                </label>
                <textarea
                  className="w-full min-h-[100px] p-6 rounded-2xl border-2 border-amber-300 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-500/10 focus:bg-white dark:focus:bg-slate-700 text-foreground placeholder:text-amber-400 dark:placeholder:text-amber-300 outline-none text-base transition-all"
                  placeholder="Please provide a reason for checking out early..."
                  value={earlyCheckoutReason}
                  onChange={(e) => setEarlyCheckoutReason(e.target.value)}
                  required
                />
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ You haven&apos;t completed your {expectedWorkingHours.toFixed(1)} working
                  hours. This may affect your attendance status and pay.
                </p>
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Documentation & Attachments
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer p-8 rounded-3xl border-2 border-dashed border-border hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all flex flex-col items-center justify-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/30 flex items-center justify-center transition-colors">
                  <Paperclip className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-foreground">
                    Click to upload files
                  </p>
                  <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground mt-1">
                    PDFs, Images, or Reports
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileSelect}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedFiles.map((file, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx}
                      className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                        <span className="text-sm font-bold text-slate-700 truncate">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="p-1.5 hover:bg-white hover:text-red-500 rounded-lg text-slate-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-8 border-t border-border shrink-0 bg-white">
            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-7 rounded-2xl font-black text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={submitCheckout}
                disabled={
                  loading ||
                  !accomplishments.trim() ||
                  uploading ||
                  (!hasCompletedHours &&
                    remainingHours !== null &&
                    remainingHours.hours > 0 &&
                    !earlyCheckoutReason.trim())
                }
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-7 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-3" />
                    Uploading...
                  </>
                ) : (
                  'Complete Shift Report'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Early Checkout Warning Dialog */}
      <Dialog open={showEarlyCheckoutWarning} onOpenChange={setShowEarlyCheckoutWarning}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black text-white">
                Early Checkout Warning
              </DialogTitle>
            </div>
            <p className="text-white/90 text-base font-semibold mb-2">
              You haven&apos;t completed your {expectedWorkingHours.toFixed(1)} working hours yet.
            </p>
            {remainingHours !== null && (
              <p className="text-white/80 text-sm">
                {remainingHours.hours >= 1
                  ? `You still have ${Math.floor(remainingHours.hours)}h ${Math.round((remainingHours.hours % 1) * 60)}m remaining.`
                  : `You still have ${Math.round(remainingHours.hours * 60)}m remaining.`}
                {remainingHours.isPaused && (
                  <span className="ml-2 text-xs uppercase tracking-wider opacity-75">(Paused)</span>
                )}
              </p>
            )}
            <div className="mt-4 p-4 bg-white/10 rounded-xl border border-white/20">
              <p className="text-white font-bold text-sm">
                ⚠️ This will affect your attendance status and may result in salary deduction.
              </p>
            </div>
          </div>

          <div className="p-8 space-y-4">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Reason for Early Checkout (Required)
              </label>
              <textarea
                className="w-full min-h-[120px] p-6 rounded-2xl border-2 border-amber-300 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-500/10 focus:bg-white dark:focus:bg-slate-700 text-foreground placeholder:text-amber-400 dark:placeholder:text-amber-300 outline-none text-base transition-all"
                placeholder="Please provide a reason for checking out early..."
                value={earlyCheckoutReason}
                onChange={(e) => setEarlyCheckoutReason(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-8 border-t border-border bg-white dark:bg-card">
            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEarlyCheckoutWarning(false)
                  setEarlyCheckoutReason('')
                }}
                className="flex-1 py-6 rounded-2xl font-black text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!earlyCheckoutReason.trim()) {
                    toast.error('Please provide a reason for early checkout')
                    return
                  }
                  setShowEarlyCheckoutWarning(false)
                  // Proceed to summary modal
                  proceedToCheckout()
                }}
                disabled={!earlyCheckoutReason.trim()}
                className="flex-[2] bg-amber-600 hover:bg-amber-700 text-white py-6 rounded-2xl font-black text-lg shadow-xl shadow-amber-100"
              >
                Continue Checkout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
