import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'
import { sendEmail } from '@/lib/email'
import { getCheckInNotificationEmail } from '@/lib/email-templates'

/**
 * Custom route for staff check-in. Creates attendance record; user is identified by userId in body.
 * Sends a check-in notification email to admin (Work Settings → Admin Notification Email).
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const body = await request.json()
    const { userId, date, timeIn, status, location, selfie } = body

    if (!userId) {
      return NextResponse.json({ message: 'userId is required.' }, { status: 400 })
    }

    const todayStr = date || new Date().toISOString().split('T')[0]
    const userDoc = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    })

    const doc = await payload.create({
      collection: 'attendance',
      data: {
        user: userId,
        date: todayStr,
        timeIn: timeIn || new Date().toISOString(),
        status: status || 'present',
        location: location || {},
        selfie: selfie || undefined,
      },
      req: {
        user: userDoc,
        payload,
        headers: request.headers,
        url: request.url,
        method: 'POST',
      } as any,
      overrideAccess: true,
    })

    // Send check-in notification email to admin
    try {
      const settings = await payload.findGlobal({
        slug: 'work-settings',
        overrideAccess: true,
      })
      let targetEmails: string[] = []
      if ((settings as any).notificationEmails?.length > 0) {
        targetEmails = (settings as any).notificationEmails.map((e: any) => e.email).filter(Boolean)
      } else {
        const admins = await payload.find({
          collection: 'users',
          where: { role: { equals: 'admin' } },
          limit: 10,
          overrideAccess: true,
        })
        targetEmails = admins.docs.map((a: any) => (a as any).email).filter(Boolean)
      }
      if (targetEmails.length > 0) {
        const timeInStr = doc.timeIn ? new Date(doc.timeIn).toLocaleTimeString() : 'N/A'
        const dateFormatted = new Date(doc.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const locationAddress =
          typeof doc.location === 'object' && doc.location && 'address' in doc.location
            ? String((doc.location as any).address || '')
            : undefined
        await sendEmail({
          to: targetEmails,
          subject: `✅ Check-in: ${(userDoc as any).name || (userDoc as any).email} - ${dateFormatted}`,
          html: getCheckInNotificationEmail({
            employeeName: (userDoc as any).name || 'Unknown',
            employeeEmail: (userDoc as any).email || '',
            date: dateFormatted,
            checkInTime: timeInStr,
            locationAddress: locationAddress || undefined,
          }),
        })
      }
    } catch (emailErr) {
      console.error('[Check-in Email] Failed to send admin notification:', emailErr)
    }

    return NextResponse.json({ doc })
  } catch (error: any) {
    console.error('Check-in error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message, errors: (error as any).errors },
        { status: error.status },
      )
    }
    const message = error?.message || 'Failed to check in.'
    const status = (error as any)?.status || 500
    return NextResponse.json({ message, errors: (error as any)?.errors }, { status })
  }
}
