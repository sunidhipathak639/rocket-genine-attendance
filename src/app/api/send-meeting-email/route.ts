import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sendEmail } from '@/lib/email'
import { getMeetingInvitationEmail } from '@/lib/email-templates'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })

    // Explicitly handle authentication for custom routes in Next.js
    const token = request.cookies.get('payload-token')?.value
    const authHeaders = new Headers(request.headers)
    if (token) authHeaders.set('Authorization', `Bearer ${token}`)

    const { user: adminUser } = await payload.auth({ headers: authHeaders })

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { meetingId } = await request.json()

    if (!meetingId) {
      return NextResponse.json({ message: 'Meeting ID is required' }, { status: 400 })
    }

    console.log(`[Meeting Email] Fetching meeting ${meetingId}`)
    const meeting = (await payload.findByID({
      collection: 'meetings',
      id: meetingId,
      depth: 1,
      overrideAccess: true,
    })) as any

    if (!meeting) {
      return NextResponse.json({ message: 'Meeting not found' }, { status: 404 })
    }

    const participants = (meeting.participants as any[]) || []
    if (participants.length === 0) {
      return NextResponse.json({ message: 'No participants selected' }, { status: 400 })
    }

    console.log(`[Meeting Email] Preparing to send to ${participants.length} participants`)

    const sendPromises = participants.map(async (participant: any) => {
      if (!participant.email) return null

      return sendEmail({
        to: participant.email,
        subject: `📅 Invitation: ${meeting.topic}`,
        html: getMeetingInvitationEmail({
          topic: meeting.topic,
          meetingLink: meeting.meetingLink,
          date: format(new Date(meeting.date), 'MMMM dd, yyyy @ hh:mm a'),
          employeeName: participant.name || 'Team Member',
        }),
      })
    })

    const results = await Promise.all(sendPromises)
    const successful = results.filter((r) => r && r.success).length
    const failed = results.filter((r) => r && !r.success).length

    // Update meeting status to 'sent'
    await payload.update({
      collection: 'meetings',
      id: meetingId,
      data: {
        status: 'sent',
      } as any,
    })

    return NextResponse.json({
      message: `Successfully sent ${successful} invitations.${failed > 0 ? ` Failed to send ${failed}.` : ''}`,
    })
  } catch (error: any) {
    console.error('[Meeting Email] Error:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to send meeting emails' },
      { status: 500 },
    )
  }
}
