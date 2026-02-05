import { Resend } from 'resend'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}) {
  console.log('[Email Service] Preparing to send email to:', to)

  if (!process.env.RESEND_API_KEY) {
    console.error('[Email Service] FATAL: RESEND_API_KEY is missing from process.env')
    return { success: false, error: 'API key missing' }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    console.log('[Email Service] Resend client initialized, sending...')

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'Rocket Genie Attendance <onboarding@resend.dev>'

    const data = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    })

    console.log('[Email Service] Resend API Response:', data)

    if ((data as any).error) {
      console.error('[Email Service] Resend returned error:', (data as any).error)
      return { success: false, error: (data as any).error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[Email Service] Exception caught during sending:', error)
    return { success: false, error }
  }
}
