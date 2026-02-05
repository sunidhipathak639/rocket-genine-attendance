'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'
import { FileText, Eye, File as FileIcon } from 'lucide-react'

// --- Types ---
interface MediaDoc {
  id: string | number
  url: string
  filename?: string
  alt?: string
}

// --- Selfie Preview Component ---
export const SelfiePreview: React.FC<{ path: string }> = ({ path }) => {
  const value = useFormFields(([fields]) => fields[path]?.value) as string

  if (!value)
    return (
      <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
        No selfie uploaded for this session.
      </p>
    )

  return (
    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
      <p
        style={{
          fontSize: '11px',
          fontWeight: '800',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#64748b',
        }}
      >
        Identity Verification Proof
      </p>
      <div
        style={{
          position: 'relative',
          width: '240px',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          border: '6px solid white',
          background: '#f1f5f9',
        }}
      >
        <img
          src={value}
          alt="Selfie Preview"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.9)',
            color: '#1e293b',
            padding: '10px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            transition: 'all 0.2s ease',
            textDecoration: 'none',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)')}
        >
          <Eye size={18} />
        </a>
      </div>
    </div>
  )
}

// --- Attachments Preview Component ---
export const AttachmentsPreview: React.FC<{ value: (string | number | MediaDoc)[] }> = ({
  value,
}) => {
  const [mediaData, setMediaData] = useState<MediaDoc[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchMedia = async () => {
      if (!value || !Array.isArray(value) || value.length === 0) return

      setLoading(true)
      try {
        const ids = value.map((item) => (typeof item === 'object' ? item.id : item))
        const response = await fetch(
          `/api/media?where[id][in]=${ids.join(',')}&limit=${ids.length}`,
        )
        if (response.ok) {
          const data = await response.json()
          setMediaData(data.docs || [])
        }
      } catch (err) {
        console.error('Failed to fetch media details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMedia()
  }, [value])

  if (!value || !Array.isArray(value) || value.length === 0) {
    return (
      <p style={{ fontSize: '12px', color: '#666', marginTop: '12px', fontStyle: 'italic' }}>
        No documents attached to this report.
      </p>
    )
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <p
        style={{
          fontSize: '11px',
          fontWeight: '800',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#64748b',
        }}
      >
        Work Files & Documentation ({value.length})
      </p>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Loading attachment details...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {mediaData.length > 0
            ? mediaData.map((media, index) => (
                <div
                  key={media.id || index}
                  style={{
                    padding: '16px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1'
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      background: '#e0e7ff',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4338ca',
                      flexShrink: 0,
                    }}
                  >
                    <FileIcon size={24} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        margin: '0 0 4px 0',
                        color: '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {media.filename || `Document ${index + 1}`}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '12px',
                          color: '#4f46e5',
                          textDecoration: 'none',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={14} /> View File
                      </a>
                      <a
                        href={`/admin/collections/media/${media.id}`}
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          textDecoration: 'none',
                          fontWeight: '500',
                        }}
                      >
                        Details
                      </a>
                    </div>
                  </div>
                </div>
              ))
            : value.map((idOrObj, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <FileText size={20} color="#94a3b8" />
                  <a
                    href={`/admin/collections/media/${typeof idOrObj === 'object' ? idOrObj.id : idOrObj}`}
                    style={{
                      fontSize: '13px',
                      color: '#6366f1',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    View Document {index + 1}
                  </a>
                </div>
              ))}
        </div>
      )}
    </div>
  )
}

// --- Selfie Cell (for list view) ---
export const SelfieCell: React.FC<{ cellData: string }> = ({ cellData }) => {
  if (!cellData) return <span style={{ color: '#cbd5e1' }}>-</span>

  return (
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '2px solid white',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        background: '#f1f5f9',
      }}
    >
      <img
        src={cellData}
        alt="Thumbnail"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}
