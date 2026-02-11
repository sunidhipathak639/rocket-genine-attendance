import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { APIError } from 'payload'

/**
 * POST: Add a comment to a task
 * Anyone can add comments - no authentication required
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await getPayload({ config: await configPromise })

    const taskId = parseInt(params.id, 10)
    if (isNaN(taskId)) {
      return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 })
    }

    // Get the task to verify it exists
    const task = await payload.findByID({
      collection: 'tasks',
      id: taskId,
    })

    const body = await request.json()
    const { comment, authorName, authorEmail } = body

    if (!comment || !comment.trim()) {
      return NextResponse.json({ message: 'Comment is required' }, { status: 400 })
    }

    // Add comment to existing comments array
    const existingComments = Array.isArray(task.comments) ? task.comments : []

    // Try to get user if authenticated, otherwise allow anonymous comment
    let authorId: string | number | null = null
    try {
      const { user } = await payload.auth({ headers: request.headers })
      if (user) {
        authorId = user.id
        console.log('[Comment API] User authenticated:', user.email, user.id)
      } else {
        console.log('[Comment API] No user found in auth')
      }
    } catch (error) {
      // Not authenticated - allow anonymous comment
      console.log('[Comment API] Auth error:', error)
      authorId = null
    }

    const newComment: any = {
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    }

    // Always set author if user is authenticated (even if null, it's optional)
    if (authorId) {
      newComment.author = authorId
    }
    // If authorId is null, don't set author field (allows anonymous comments)

    // Update the task - override access control to allow anyone to comment
    const updatedTask = await payload.update({
      collection: 'tasks',
      id: taskId,
      data: {
        comments: [...existingComments, newComment],
      },
      overrideAccess: true,
      depth: 2, // Populate relationships including comment authors
    })

    return NextResponse.json({
      message: 'Comment added successfully',
      task: updatedTask,
    })
  } catch (error: any) {
    console.error('Comment addition error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message || 'Failed to add comment' },
        { status: error.status || 500 },
      )
    }
    return NextResponse.json({ message: error.message || 'An error occurred' }, { status: 500 })
  }
}
