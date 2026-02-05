import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sendEmail } from '@/lib/email'
import { getLeaveStatusEmail } from '@/lib/email-templates'
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

    const { leaveId } = await request.json()

    if (!leaveId) {
      return NextResponse.json({ message: 'Leave ID is required' }, { status: 400 })
    }

    console.log(`[Resend Email] Fetching leave ${leaveId}`)
    const leave = await payload.findByID({
      collection: 'leaves',
      id: leaveId,
      depth: 1,
      overrideAccess: true, // Ensure we can see the user relationship
    })

    if (!leave) {
      console.error(`[Resend Email] Leave ${leaveId} not found`)
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 })
    }

    const user: any = leave.user
    if (!user || !user.email) {
      console.error(`[Resend Email] User or email not found for leave ${leaveId}`, user)
      return NextResponse.json({ message: 'User email not found' }, { status: 400 })
    }

    const isApprovedOrRejected =
      leave.bookingStatus === 'approved' || leave.bookingStatus === 'rejected'

    if (!isApprovedOrRejected) {
      return NextResponse.json(
        { message: 'Email can only be sent for approved or rejected leaves' },
        { status: 400 },
      )
    }

    const statusIcon = leave.bookingStatus === 'approved' ? '✅' : '❌'
    console.log(`[Resend Email] Sending to ${user.email} (Status: ${leave.bookingStatus})`)

    const result = await sendEmail({
      to: user.email,
      subject: `${statusIcon} Leave Request ${leave.bookingStatus === 'approved' ? 'Approved' : 'Rejected'} (Resent)`,
      html: getLeaveStatusEmail({
        employeeName: user.name || 'Employee',
        leaveType: leave.type,
        startDate: format(new Date(leave.startDate), 'MMM dd, yyyy'),
        endDate: format(new Date(leave.endDate), 'MMM dd, yyyy'),
        status: leave.bookingStatus as 'approved' | 'rejected', // Cast after guard
        adminNotes: (leave as any).adminNotes,
      }),
    })

    if (result.success) {
      console.log(`[Resend Email] Success for ${user.email}`)
      return NextResponse.json({ message: 'Email resent successfully' })
    } else {
      console.error(`[Resend Email] Failed to send to ${user.email}:`, result.error)
      return NextResponse.json(
        { message: 'Failed to send email via Resend Service', error: result.error },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error('[Resend Email] CRITICAL ERROR:', error)
    return NextResponse.json(
      { message: error.message || 'Failed to resend email' },
      { status: 500 },
    )
  }
}
