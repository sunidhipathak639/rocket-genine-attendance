'use client'

import React, { useState, useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import { useField } from '@payloadcms/ui'

const FALLBACK_ICONS = [
  'Calendar',
  'Sun',
  'Moon',
  'Star',
  'Heart',
  'Home',
  'Settings',
  'User',
  'Search',
  'Bell',
  'Check',
  'X',
  'Plus',
  'Minus',
  'AlertCircle',
  'Info',
  'Flag',
  'MapPin',
  'Gift',
  'Coffee',
  'Music',
  'Camera',
  'Video',
  'Phone',
  'Mail',
  'Send',
  'Archive',
  'Trash',
  'Briefcase',
  'Globe',
  'Plane',
  'Train',
  'Car',
  'Bike',
  'Bus',
  'ShoppingBag',
  'ShoppingCart',
  'CreditCard',
  'Key',
  'Lock',
  'Unlock',
  'Eye',
  'EyeOff',
  'Cloud',
  'CloudRain',
  'CloudSnow',
  'Thermometer',
  'Wind',
  'Umbrella',
  'Glasses',
  'Leaf',
  'Flower',
  'TreePine',
  'TreePalm',
  'Anchor',
  'Rocket',
  'Zap',
  'Target',
  'Trophy',
  'Award',
  'Flame',
  'Ghost',
  'Smile',
  'Frown',
  'Meh',
  'Angry',
  'Coffee',
  'Pizza',
  'Cake',
  'IceCream',
  'Apple',
  'Banana',
  'Cherry',
  'Grape',
  'Citrus',
  'Dog',
  'Cat',
  'Bird',
  'Fish',
  'Bug',
]

const ICON_NAMES = Object.keys(LucideIcons).filter(
  (key) =>
    typeof LucideIcons[key as keyof typeof LucideIcons] === 'function' &&
    key !== 'createLucideIcon' &&
    key[0] === key[0].toUpperCase(), // Standard Lucide icons start with uppercase
)

const FINAL_ICON_NAMES = ICON_NAMES.length > 0 ? ICON_NAMES : FALLBACK_ICONS

export const LucideIconPicker: React.FC<{ path: string }> = ({ path }) => {
  const { value, setValue } = useField<string>({ path })
  const [searchTerm, setSearchTerm] = useState('')

  const filteredIcons = useMemo(() => {
    const defaultIcons = FINAL_ICON_NAMES.slice(0, 80)
    if (!searchTerm) return defaultIcons
    return FINAL_ICON_NAMES.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase()),
    ).slice(0, 80)
  }, [searchTerm])

  const SelectedIcon = value
    ? (LucideIcons[value as keyof typeof LucideIcons] as React.ElementType)
    : null

  return (
    <div style={{ marginBottom: '20px' }}>
      <label htmlFor={path} style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
        Select Lucide Icon
      </label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            width: '100%',
          }}
        />
        {SelectedIcon && (
          <div
            style={{
              padding: '10px',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SelectedIcon size={24} strokeWidth={2} color="#3b82f6" />
          </div>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
        Showing {filteredIcons.length} icons
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: '10px',
          maxHeight: '300px',
          minHeight: '150px',
          overflowY: 'auto',
          padding: '12px',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.02)',
        }}
      >
        {filteredIcons.length === 0 && (
          <div
            style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#94a3b8' }}
          >
            No icons found.
          </div>
        )}
        {filteredIcons.map((name) => {
          const Icon = LucideIcons[name as keyof typeof LucideIcons] as React.ElementType
          return (
            <button
              key={name}
              type="button"
              onClick={() => setValue(name)}
              title={name}
              style={{
                width: '60px',
                height: '60px',
                padding: '4px',
                border: value === name ? '2px solid #3b82f6' : '1px solid #f1f5f9',
                borderRadius: '8px',
                backgroundColor: value === name ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease-in-out',
                position: 'relative',
              }}
            >
              {Icon ? (
                <Icon size={24} strokeWidth={1.5} color={value === name ? '#3b82f6' : '#64748b'} />
              ) : (
                <span style={{ fontSize: '10px' }}>?</span>
              )}
              <span
                style={{
                  fontSize: '8px',
                  marginTop: '4px',
                  color: '#94a3b8',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </span>
            </button>
          )
        })}
      </div>
      {value && (
        <div style={{ marginTop: '5px', fontSize: '12px', color: '#64748b' }}>
          Selected: <strong>{value}</strong>
        </div>
      )}
    </div>
  )
}
