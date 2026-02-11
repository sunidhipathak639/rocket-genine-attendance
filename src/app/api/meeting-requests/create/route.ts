import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * POST: Create a new meeting request
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { user: authenticatedUser } = await payload.auth({ headers: request.headers })

    const body = await request.json()
    const { topic, description, email } = body

    if (!topic || !topic.trim()) {
      return NextResponse.json({ message: 'Meeting topic is required' }, { status: 400 })
    }

    let user = authenticatedUser
    let staffUserId: string | number

    if (!user) {
      // If not authenticated, verify email
      if (!email) {
        return NextResponse.json(
          { message: 'Please log in or provide your registered email address' },
          { status: 401 },
        )
      }
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
      staffUserId = user.id
    } else {
      // If authenticated, verify role
      if (user.role !== 'staff') {
        return NextResponse.json(
          { message: 'Only staff members can create meeting requests' },
          { status: 403 },
        )
      }
      staffUserId = user.id
    }

    // Create meeting request
    const reqWithUser = {
      ...request,
      user,
      payload,
    } as any

    const meetingRequest = await payload.create({
      collection: 'meeting-requests',
      data: {
        staff: staffUserId,
        topic: topic.trim(),
        description: description?.trim() || '',
        status: 'pending',
      },
      req: reqWithUser,
    })

    return NextResponse.json({
      message: 'Meeting request created successfully',
      meetingRequest,
    })
  } catch (error: any) {
    console.error('Meeting request creation error:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to create meeting request' },
      { status: 500 },
    )
  }
}
