import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import {
  getLeaveRequestEmail,
  getWorkSummaryEmail,
  getLeaveStatusEmail,
} from '@/lib/email-templates'

/**
 * TEST API ROUTE: Trigger a test email with Rocket Genie Branding
 * Usage: GET /api/test-email?to=your-email@example.com&type=summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const to = searchParams.get('to')
    const type = searchParams.get('type') || 'summary'

    if (!to) {
      return NextResponse.json(
        { message: 'Query parameter "to" is required (e.g., /api/test-email?to=your@email.com)' },
        { status: 400 },
      )
    }

    let subject = ''
    let html = ''

    if (type === 'leave') {
      subject = '🏖️ TEST: New Leave Request'
      html = getLeaveRequestEmail({
        employeeName: 'Test Employee',
        employeeEmail: to,
        leaveType: 'paid',
        startDate: 'Feb 10, 2026',
        endDate: 'Feb 12, 2026',
        reason: 'This is a test leave request to verify the modern template.',
        leaveId: 'test-123',
      })
    } else if (type === 'status') {
      subject = '✅ TEST: Leave Request Approved'
      html = getLeaveStatusEmail({
        employeeName: 'Test Employee',
        leaveType: 'unpaid',
        startDate: 'Feb 15, 2026',
        endDate: 'Feb 16, 2026',
        status: 'approved',
        adminNotes: 'Test approval notes: Everything looks good for the test!',
      })
    } else {
      // Default to summary
      subject = '📊 TEST: Daily Work Summary'
      html = getWorkSummaryEmail({
        employeeName: 'Test Employee',
        employeeEmail: to,
        date: 'Wednesday, February 5, 2026',
        checkInTime: '09:00 AM',
        checkOutTime: '06:30 PM',
        workSummary:
          '1. Fixed email template bugs\n2. Modernized UI/UX\n3. Completed Resend integration testing',
        activeDuration: 520, // 8.6 hours
        inactiveDuration: 20,
      })
    }

    console.log(`[Test Email] Sending ${type} email to: ${to}`)
    const result = await sendEmail({ to, subject, html })

    return NextResponse.json({
      message: `Test ${type} email sent!`,
      recipient: to,
      resendResponse: result,
      subject,
    })
  } catch (error: any) {
    console.error('[Test Email] Error:', error)
    return NextResponse.json(
      { message: 'Test email failed', error: error.message },
      { status: 500 },
    )
  }
}
