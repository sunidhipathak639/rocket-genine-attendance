'use client'

import React, { useState } from 'react'

const baseUrl =
  typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SERVER_URL || ''

export default function FrontendDashboardButton() {
  const href = baseUrl || '/'
  const [hover, setHover] = useState(false)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        background: hover
          ? 'var(--theme-success-600)'
          : 'linear-gradient(135deg, var(--theme-success-500) 0%, var(--theme-success-600) 100%)',
        color: 'white',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '14px',
        textDecoration: 'none',
        border: 'none',
        cursor: 'pointer',
        boxShadow: hover ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      <span>Open frontend dashboard</span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: hover ? 1 : 0.8, transition: 'opacity 0.2s' }}
      >
        <path d="M7 17L17 7" />
        <path d="M17 7h-6v6" />
      </svg>
    </a>
  )
}
