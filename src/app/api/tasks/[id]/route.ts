import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { APIError } from 'payload'

/**
 * PATCH: Update task status
 * Anyone can update task status - no authentication required
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await getPayload({ config: await configPromise })

    const taskId = parseInt(params.id, 10)
    if (isNaN(taskId)) {
      return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 })
    }

    // Verify task exists
    await payload.findByID({
      collection: 'tasks',
      id: taskId,
    })

    const body = await request.json()
    const { status } = body

    if (!status || !['open', 'in_progress', 'completed', 'rejected'].includes(status)) {
      return NextResponse.json({ message: 'Valid status is required' }, { status: 400 })
    }

    // Update the task - override access control to allow anyone to update
    const updatedTask = await payload.update({
      collection: 'tasks',
      id: taskId,
      data: { status },
      overrideAccess: true,
      depth: 2, // Populate relationships
    })

    return NextResponse.json({
      message: 'Task updated successfully',
      task: updatedTask,
    })
  } catch (error: any) {
    console.error('Task update error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message || 'Failed to update task' },
        { status: error.status || 500 },
      )
    }
    return NextResponse.json({ message: error.message || 'An error occurred' }, { status: 500 })
  }
}
