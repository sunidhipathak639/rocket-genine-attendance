import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

/** Sanitize filename: replace spaces with dash, strip characters that can break Blob or URLs, keep safe extension */
function sanitizeFilename(raw: string): string {
  const lastDot = raw.lastIndexOf('.')
  const base = lastDot >= 0 ? raw.slice(0, lastDot) : raw
  const ext = lastDot >= 0 ? raw.slice(lastDot + 1) : ''
  const safeBase =
    base
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 200) || 'file'
  const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : 'bin'
  return `${safeBase}.${safeExt}`
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawFilename = searchParams.get('filename') || 'file.txt'
  const safeName = sanitizeFilename(rawFilename)

  // Only allow POST requests with a body
  if (!request.body) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token?.trim()) {
    console.error('Blob upload: BLOB_READ_WRITE_TOKEN is not set')
    return NextResponse.json(
      { message: 'Upload not configured. Set BLOB_READ_WRITE_TOKEN (e.g. in .env.local).' },
      { status: 503 },
    )
  }

  try {
    const blob = await put(safeName, request.body, {
      access: 'public',
      token,
    })

    return NextResponse.json(blob)
  } catch (error: any) {
    console.error('Blob upload error:', error)
    const message =
      process.env.NODE_ENV === 'development' && error?.message
        ? `Upload failed: ${error.message}`
        : 'Upload failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
