import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('filename') || 'file.txt'

  // Only allow POST requests with a body
  if (!request.body) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 })
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return NextResponse.json(blob)
  } catch (error) {
    console.error('Blob upload error:', error)
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 })
  }
}
