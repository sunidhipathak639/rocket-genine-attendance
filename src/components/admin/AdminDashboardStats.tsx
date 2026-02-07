'use client'

import React, { useEffect, useState } from 'react'
import LiveIndianClock from './LiveIndianClock'
import FrontendDashboardButton from './FrontendDashboardButton'

const cardStyle: React.CSSProperties = {
  padding: '24px',
  background: 'var(--theme-elevation-50)',
  borderRadius: '12px',
  border: '1px solid var(--theme-elevation-200)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  position: 'relative',
  overflow: 'hidden',
}

const cardAccent = (color: string): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: '4px',
  background: color,
  borderRadius: '12px 0 0 12px',
})

export default function AdminDashboardStats() {
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        const res = await fetch(`${base}/api/admin/dashboard-stats`, { credentials: 'include' })
        if (!res.ok) throw new Error(res.statusText)
        const data = await res.json()
        if (!cancelled) {
          setTotalEmployees(data.totalEmployees ?? 0)
          setTodayAttendance(data.todayAttendance ?? 0)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load stats')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <p style={{ color: 'var(--theme-error-500)', fontSize: '14px' }}>{error}</p>
      </div>
    )
  }

  return (
    <div
      style={{
        marginBottom: '32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--theme-elevation-800)',
            letterSpacing: '-0.02em',
          }}
        >
          Overview
        </h2>
        <FrontendDashboardButton />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {/* Total employees */}
        <div style={cardStyle}>
          <div style={cardAccent('var(--theme-success-500)')} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--theme-success-100)',
                color: 'var(--theme-success-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PeopleIcon />
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--theme-elevation-600)',
              }}
            >
              Total employees
            </span>
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--theme-elevation-900)',
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalEmployees ?? '–'}
          </div>
        </div>

        {/* Today's attendance */}
        <div style={cardStyle}>
          <div style={cardAccent('var(--theme-warning-500)')} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--theme-warning-100)',
                color: 'var(--theme-warning-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckInIcon />
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--theme-elevation-600)',
              }}
            >
              Today&apos;s attendance
            </span>
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--theme-elevation-900)',
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {todayAttendance ?? '–'}
          </div>
        </div>

        {/* Live Indian clock */}
        <LiveIndianClock />
      </div>
    </div>
  )
}

function PeopleIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function CheckInIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}
