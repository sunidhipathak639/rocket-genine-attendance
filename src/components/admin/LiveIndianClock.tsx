'use client'

import React, { useState, useEffect } from 'react'

const INDIAN_TZ = 'Asia/Kolkata'

function formatIndianTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    timeZone: INDIAN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatIndianDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    timeZone: INDIAN_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function LiveIndianClock() {
  const [time, setTime] = useState<string>('--:--:--')
  const [dateStr, setDateStr] = useState<string>('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(formatIndianTime(now))
      setDateStr(formatIndianDate(now))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        padding: '24px',
        background: 'var(--theme-elevation-50)',
        borderRadius: '12px',
        border: '1px solid var(--theme-elevation-200)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: 'var(--theme-info-500)',
          borderRadius: '12px 0 0 12px',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--theme-info-100)',
            color: 'var(--theme-info-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ClockIcon />
        </div>
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--theme-elevation-600)',
            }}
          >
            India (IST)
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'var(--theme-error-100)',
              color: 'var(--theme-error-700)',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--theme-error-500)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            Live
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          color: 'var(--theme-elevation-900)',
          marginBottom: '6px',
        }}
      >
        {time}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'var(--theme-elevation-600)',
        }}
      >
        {dateStr}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
