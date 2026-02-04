import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

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
    const { id, timeOut, location, workSummary } = body

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

    const doc = await payload.update({
      collection: 'attendance',
      id,
      data: {
        timeOut: timeOut || new Date().toISOString(),
        ...(location && { location }),
        workSummary: workSummary || undefined,
      },
      req: {
        user,
        payload,
        headers: request.headers,
        url: request.url,
        method: 'PATCH',
      } as any,
      overrideAccess: true,
    })

    // Send email to configured notification emails or default admins
    try {
      const { sendEmail } = await import('@/lib/email')
      const settings = await payload.findGlobal({
        slug: 'work-settings',
      })

      let targetEmails: string[] = []

      if ((settings as any).notificationEmails && (settings as any).notificationEmails.length > 0) {
        targetEmails = (settings as any).notificationEmails.map((e: any) => e.email).filter(Boolean)
      } else {
        const admins = await payload.find({
          collection: 'users',
          where: { role: { equals: 'admin' } },
          limit: 5,
        })
        targetEmails = admins.docs.map((a) => a.email).filter(Boolean) as string[]
      }

      if (targetEmails.length > 0) {
        const timeIn = doc.timeIn ? new Date(doc.timeIn).toLocaleTimeString() : 'N/A'
        const timeOut = doc.timeOut ? new Date(doc.timeOut).toLocaleTimeString() : 'N/A'

        const { getWorkSummaryEmail } = await import('@/lib/email-templates')

        await sendEmail({
          to: targetEmails,
          subject: `📊 Work Summary: ${user.name || user.email} - ${new Date().toLocaleDateString()}`,
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
            checkOutTime: timeOut,
            workSummary,
            activeDuration: doc.activeDuration ?? undefined,
            inactiveDuration: doc.inactiveDuration ?? undefined,
          }),
        })
      }
    } catch (err) {
      console.error('Failed to send check-out email:', err)
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
