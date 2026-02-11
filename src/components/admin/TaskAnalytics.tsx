'use client'

import React, { useEffect, useState } from 'react'

interface TaskStats {
  total: number
  open: number
  in_progress: number
  completed: number
  rejected: number
}

interface TasksPerStaff {
  id: number
  name: string
  email: string
  totalTasks: number
  open: number
  in_progress: number
  completed: number
  rejected: number
}

interface TaskAnalyticsData {
  stats: TaskStats
  tasksPerStaff: TasksPerStaff[]
}

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

export default function TaskAnalytics() {
  const [data, setData] = useState<TaskAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        const res = await fetch(`${base}/api/admin/tasks/analytics`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error(res.statusText)
        const analyticsData = await res.json()
        if (!cancelled) {
          setData(analyticsData)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load task analytics')
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            margin: 0,
            marginBottom: '20px',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--theme-elevation-800)',
            letterSpacing: '-0.02em',
          }}
        >
          Task Analytics
        </h2>
        <p style={{ color: 'var(--theme-elevation-600)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            margin: 0,
            marginBottom: '20px',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--theme-elevation-800)',
            letterSpacing: '-0.02em',
          }}
        >
          Task Analytics
        </h2>
        <p style={{ color: 'var(--theme-error-500)', fontSize: '14px' }}>{error}</p>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { stats, tasksPerStaff } = data
  const pendingTasks = stats.open + stats.in_progress

  return (
    <div style={{ marginBottom: '32px' }}>
      <h2
        style={{
          margin: 0,
          marginBottom: '20px',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--theme-elevation-800)',
          letterSpacing: '-0.02em',
        }}
      >
        Task Analytics
      </h2>

      {/* Task Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
          alignItems: 'stretch',
        }}
      >
        {/* Total Tasks */}
        <div style={cardStyle}>
          <div style={cardAccent('var(--theme-info-500)')} />
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
                background: 'var(--theme-info-100)',
                color: 'var(--theme-info-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TaskIcon />
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--theme-elevation-600)',
              }}
            >
              Total Tasks
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
            {stats.total}
          </div>
        </div>

        {/* Pending Tasks */}
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
              <ClockIcon />
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--theme-elevation-600)',
              }}
            >
              Pending
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
            {pendingTasks}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--theme-elevation-600)',
              marginTop: '4px',
            }}
          >
            {stats.open} open, {stats.in_progress} in progress
          </div>
        </div>

        {/* Completed Tasks */}
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
              <CheckIcon />
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--theme-elevation-600)',
              }}
            >
              Completed
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
            {stats.completed}
          </div>
          {stats.total > 0 && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--theme-elevation-600)',
                marginTop: '4px',
              }}
            >
              {Math.round((stats.completed / stats.total) * 100)}% completion rate
            </div>
          )}
        </div>

        {/* Rejected Tasks */}
        <div style={cardStyle}>
          <div style={cardAccent('var(--theme-error-500)')} />
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
                background: 'var(--theme-error-100)',
                color: 'var(--theme-error-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XIcon />
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--theme-elevation-600)',
              }}
            >
              Rejected
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
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Tasks Per Technical Staff */}
      {tasksPerStaff.length > 0 && (
        <div style={cardStyle}>
          <h3
            style={{
              margin: 0,
              marginBottom: '16px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--theme-elevation-800)',
            }}
          >
            Tasks by Technical Staff
          </h3>
          <div
            style={{
              overflowX: 'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--theme-elevation-200)',
                  }}
                >
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 8px',
                      fontWeight: 600,
                      color: 'var(--theme-elevation-700)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Staff Member
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontWeight: 600,
                      color: 'var(--theme-elevation-700)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Total
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontWeight: 600,
                      color: 'var(--theme-elevation-700)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Open
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontWeight: 600,
                      color: 'var(--theme-elevation-700)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    In Progress
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontWeight: 600,
                      color: 'var(--theme-elevation-700)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Completed
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      fontWeight: 600,
                      color: 'var(--theme-elevation-700)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Rejected
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasksPerStaff.map((staff) => (
                  <tr
                    key={staff.id}
                    style={{
                      borderBottom: '1px solid var(--theme-elevation-100)',
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 8px',
                        color: 'var(--theme-elevation-900)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{staff.name}</div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--theme-elevation-600)',
                            marginTop: '2px',
                          }}
                        >
                          {staff.email}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        fontWeight: 600,
                        color: 'var(--theme-elevation-900)',
                      }}
                    >
                      {staff.totalTasks}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        color: 'var(--theme-info-600)',
                      }}
                    >
                      {staff.open}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        color: 'var(--theme-warning-600)',
                      }}
                    >
                      {staff.in_progress}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        color: 'var(--theme-success-600)',
                      }}
                    >
                      {staff.completed}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        color: 'var(--theme-error-600)',
                      }}
                    >
                      {staff.rejected}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
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

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
