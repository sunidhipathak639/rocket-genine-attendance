import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * GET: Admin analytics for tasks
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 401 })
    }

    // Get all tasks
    const allTasks = await payload.find({
      collection: 'tasks',
      limit: 10000,
    })

    // Calculate statistics
    const stats = {
      total: allTasks.totalDocs,
      open: allTasks.docs.filter((t) => t.status === 'open').length,
      in_progress: allTasks.docs.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.docs.filter((t) => t.status === 'completed').length,
      rejected: allTasks.docs.filter((t) => t.status === 'rejected').length,
    }

    // Get tasks per Technical Staff
    const technicalStaff = await payload.find({
      collection: 'users',
      where: { role: { equals: 'technical' } },
      limit: 1000,
    })

    const tasksPerStaff = await Promise.all(
      technicalStaff.docs.map(async (techStaff) => {
        const assignedTasks = await payload.find({
          collection: 'tasks',
          where: { assignedTo: { equals: techStaff.id } },
          limit: 1000,
        })

        return {
          id: techStaff.id,
          name: techStaff.name,
          email: techStaff.email,
          totalTasks: assignedTasks.totalDocs,
          open: assignedTasks.docs.filter((t) => t.status === 'open').length,
          in_progress: assignedTasks.docs.filter((t) => t.status === 'in_progress').length,
          completed: assignedTasks.docs.filter((t) => t.status === 'completed').length,
          rejected: assignedTasks.docs.filter((t) => t.status === 'rejected').length,
        }
      }),
    )

    return NextResponse.json({
      stats,
      tasksPerStaff,
    })
  } catch (error: any) {
    console.error('Analytics error:', error)
    return NextResponse.json({ message: error.message || 'An error occurred' }, { status: 500 })
  }
}
