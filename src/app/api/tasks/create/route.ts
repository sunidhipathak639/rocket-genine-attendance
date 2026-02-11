import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { APIError } from 'payload'

/**
 * API endpoint to create a new task (issue) from staff
 * Automatically assigns to Technical Staff with least workload
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })

    // Authenticate user (optional - can be unauthenticated if email provided)
    const { user: authenticatedUser } = await payload.auth({ headers: request.headers })

    const body = await request.json()
    const { title, description, attachments = [], email } = body

    if (!title || !description) {
      return NextResponse.json({ message: 'Title and description are required' }, { status: 400 })
    }

    let user = authenticatedUser
    let createdByUserId: string | number

    // If not authenticated, verify email belongs to a staff member
    if (!user) {
      if (!email) {
        return NextResponse.json(
          { message: 'Please log in or provide your registered email address' },
          { status: 401 },
        )
      }

      // Find user by email
      const staffUsers = await payload.find({
        collection: 'users',
        where: {
          and: [{ email: { equals: email.toLowerCase().trim() } }, { role: { equals: 'staff' } }],
        },
        limit: 1,
      })

      if (staffUsers.docs.length === 0) {
        return NextResponse.json(
          {
            message:
              'No staff account found with this email. Please check your email or contact admin.',
          },
          { status: 404 },
        )
      }

      user = staffUsers.docs[0] as any
      if (!user) {
        return NextResponse.json(
          {
            message:
              'No staff account found with this email. Please check your email or contact admin.',
          },
          { status: 404 },
        )
      }
      createdByUserId = user.id
    } else {
      // Authenticated user - verify they are staff
      if (user.role !== 'staff') {
        return NextResponse.json(
          { message: 'Only staff members can create tasks' },
          { status: 403 },
        )
      }
      createdByUserId = user.id
    }

    // Find Technical Staff with least workload (open/in_progress tasks)
    const technicalStaff = await payload.find({
      collection: 'users',
      where: {
        role: { equals: 'technical' },
      },
      limit: 1000,
    })

    if (technicalStaff.docs.length === 0) {
      return NextResponse.json(
        { message: 'No Technical Staff available. Please contact admin.' },
        { status: 400 },
      )
    }

    // Calculate workload for each Technical Staff member
    const workloadMap = await Promise.all(
      technicalStaff.docs.map(async (techStaff) => {
        const assignedTasks = await payload.find({
          collection: 'tasks',
          where: {
            and: [
              { assignedTo: { equals: techStaff.id } },
              {
                or: [{ status: { equals: 'open' } }, { status: { equals: 'in_progress' } }],
              },
            ],
          },
          limit: 1000,
        })

        return {
          id: techStaff.id,
          workload: assignedTasks.totalDocs,
        }
      }),
    )

    // Sort by workload and pick the one with least tasks
    workloadMap.sort((a, b) => a.workload - b.workload)
    const assignedToId = workloadMap[0].id

    // Create a request-like object with user context for hooks
    const reqWithUser = {
      ...request,
      user,
      payload,
    } as any

    // Create the task
    const task = await payload.create({
      collection: 'tasks',
      data: {
        title,
        description,
        status: 'open',
        priority: 'medium',
        assignedTo: assignedToId,
        createdBy: createdByUserId,
        attachments: attachments.map((fileId: string) => ({ file: fileId })),
      },
      req: reqWithUser,
    })

    return NextResponse.json({
      message: 'Task created successfully',
      task,
    })
  } catch (error: any) {
    console.error('Task creation error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message || 'Failed to create task' },
        { status: error.status || 500 },
      )
    }
    return NextResponse.json({ message: error.message || 'An error occurred' }, { status: 500 })
  }
}
