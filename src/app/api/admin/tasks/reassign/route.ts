import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { APIError } from 'payload'

/**
 * POST: Admin reassigns a task to a different Technical Staff member
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, assignedToId } = body

    if (!taskId || !assignedToId) {
      return NextResponse.json({ message: 'taskId and assignedToId are required' }, { status: 400 })
    }

    // Verify assignedTo is Technical Staff
    const assignedUser = await payload.findByID({
      collection: 'users',
      id: typeof assignedToId === 'string' ? parseInt(assignedToId, 10) : assignedToId,
    })

    if (assignedUser.role !== 'technical') {
      return NextResponse.json(
        { message: 'Assigned user must be Technical Staff' },
        { status: 400 },
      )
    }

    // Update the task
    const updatedTask = await payload.update({
      collection: 'tasks',
      id: typeof taskId === 'string' ? parseInt(taskId, 10) : taskId,
      data: { assignedTo: assignedToId },
      req: request as any,
    })

    return NextResponse.json({
      message: 'Task reassigned successfully',
      task: updatedTask,
    })
  } catch (error: any) {
    console.error('Task reassignment error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message || 'Failed to reassign task' },
        { status: error.status || 500 },
      )
    }
    return NextResponse.json({ message: error.message || 'An error occurred' }, { status: 500 })
  }
}
