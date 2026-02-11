import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

/**
 * PATCH: Update meeting request (schedule meeting)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const { id } = await params

    const meetingRequestId = parseInt(id, 10)
    if (isNaN(meetingRequestId)) {
      return NextResponse.json({ message: 'Invalid meeting request ID' }, { status: 400 })
    }

    // Verify meeting request exists
    await payload.findByID({ collection: 'meeting-requests', id: meetingRequestId })

    const body = await request.json()
    const { scheduledDate, meetingLink, notes, status } = body

    if (status === 'scheduled') {
      if (!scheduledDate || !meetingLink) {
        return NextResponse.json(
          { message: 'Scheduled date and meeting link are required' },
          { status: 400 },
        )
      }
    }

    // Update the meeting request
    const updatedRequest = await payload.update({
      collection: 'meeting-requests',
      id: meetingRequestId,
      data: {
        ...(scheduledDate && { scheduledDate }),
        ...(meetingLink && { meetingLink }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
      overrideAccess: true, // Bypass access control
      depth: 2, // Populate relationships
    })

    return NextResponse.json({
      message: 'Meeting request updated successfully',
      meetingRequest: updatedRequest,
    })
  } catch (error: any) {
    console.error('Error updating meeting request:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to update meeting request' },
      { status: 500 },
    )
  }
}
