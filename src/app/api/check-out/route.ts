import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'
import { sendEmail } from '@/lib/email'
import { getWorkSummaryEmail } from '@/lib/email-templates'

/**
 * Custom route for staff check-out. Uses cookie auth so staff can update
 * their own attendance; bypasses collection access and enforces user can only update their own record.
 */
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const token = request.cookies.get('payload-token')?.value
    const authHeaders = new Headers(request.headers)
    if (token) authHeaders.set('Authorization', `Bearer ${token}`)
    const { user } = await payload.auth({ headers: authHeaders })

    if (!user) {
      return NextResponse.json({ message: 'You must be logged in to check out.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      id,
      timeOut,
      location,
      workSummary,
      accomplishments,
      challenges,
      nextDayPlan,
      mood,
      attachments,
    } = body

    if (!id) {
      return NextResponse.json({ message: 'Attendance record id is required.' }, { status: 400 })
    }

    const existing = await payload.findByID({
      collection: 'attendance',
      id,
      overrideAccess: true,
    })

    const userId = typeof existing.user === 'object' ? (existing.user as any)?.id : existing.user
    if (userId !== user.id) {
      return NextResponse.json(
        { message: 'You can only check out your own attendance.' },
        { status: 403 },
      )
    }

    // Prepare update data
    const updateData: any = {
      timeOut: timeOut || new Date().toISOString(),
      ...(location && { location }),
      workSummary: workSummary || undefined,
      accomplishments: accomplishments || undefined,
      challenges: challenges || undefined,
      nextDayPlan: nextDayPlan || undefined,
      mood: mood || undefined,
      attachments: attachments || undefined,
    }

    const doc: any = await payload.update({
      collection: 'attendance',
      id,
      data: updateData,
      req: {
        user,
        payload,
        headers: request.headers,
        url: request.url,
        method: 'PATCH',
      } as any,
      overrideAccess: true,
    })

    // Send email to admin (Work Settings → Admin Notification Email) and to the user (employee)
    try {
      console.log('[Check-out Email] Starting email process...')
      const settings = await payload.findGlobal({
        slug: 'work-settings',
        overrideAccess: true,
      })

      let adminEmails: string[] = []

      if ((settings as any).notificationEmails && (settings as any).notificationEmails.length > 0) {
        console.log('[Check-out Email] Using notification emails from settings')
        adminEmails = (settings as any).notificationEmails.map((e: any) => e.email).filter(Boolean)
      } else {
        console.log('[Check-out Email] No notification emails found, searching for admins')
        const admins = await payload.find({
          collection: 'users',
          where: { role: { equals: 'admin' } },
          limit: 10,
          overrideAccess: true,
        })
        adminEmails = admins.docs.map((a: any) => a.email).filter(Boolean) as string[]
      }

      const userEmail = user.email
      const targetEmails = [...new Set([...adminEmails, ...(userEmail ? [userEmail] : [])])].filter(
        Boolean,
      )
      console.log('[Check-out Email] Target emails:', targetEmails)

      if (targetEmails.length > 0) {
        const timeIn = doc.timeIn ? new Date(doc.timeIn).toLocaleTimeString() : 'N/A'
        const timeOutActual = doc.timeOut ? new Date(doc.timeOut).toLocaleTimeString() : 'N/A'

        // Fetch attachment details for the email
        let emailAttachments: { url: string; filename: string }[] = []
        if (doc.attachments && doc.attachments.length > 0) {
          const mediaDocs = await payload.find({
            collection: 'media',
            where: { id: { in: doc.attachments } },
            overrideAccess: true,
          })
          emailAttachments = mediaDocs.docs.map((m: any) => ({
            url: m.url,
            filename: m.filename || 'attachment',
          }))
        }

        console.log('[Check-out Email] Sending via Resend...')
        const result = await sendEmail({
          to: targetEmails,
          subject: `📊 Shift Report: ${user.name || user.email} - ${new Date().toLocaleDateString()}`,
          html: getWorkSummaryEmail({
            employeeName: user.name || 'Unknown',
            employeeEmail: user.email || '',
            date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            checkInTime: timeIn,
            checkOutTime: timeOutActual,
            workSummary: doc.workSummary,
            accomplishments: doc.accomplishments,
            challenges: doc.challenges,
            nextDayPlan: doc.nextDayPlan,
            mood: doc.mood,
            attachments: emailAttachments,
            activeDuration: doc.activeDuration ?? undefined,
            inactiveDuration: doc.inactiveDuration ?? undefined,
          }),
        })
        console.log('[Check-out Email] Send result:', result)
      } else {
        console.log('[Check-out Email] No target emails found, skipping.')
      }
    } catch (err) {
      console.error('[Check-out Email] CRITICAL ERROR:', err)
    }

    return NextResponse.json({ doc })
  } catch (error: any) {
    console.error('Check-out error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message, errors: (error as any).errors },
        { status: error.status },
      )
    }
    const message = error?.message || 'Failed to check out.'
    const status = (error as any)?.status || 500
    return NextResponse.json({ message, errors: (error as any)?.errors }, { status })
  }
}
