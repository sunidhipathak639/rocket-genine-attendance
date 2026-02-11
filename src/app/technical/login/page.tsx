import { TechnicalLoginForm } from '@/components/technical-login-form'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Technical Staff Login | Rocket Genie',
  description: 'Login to your Technical Staff account',
}

export default async function TechnicalLoginPage() {
  const payload = await getPayload({ config: await configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  // If already logged in, redirect based on role
  if (user) {
    if (user.role === 'technical') {
      redirect('/technical')
    } else if (user.role === 'admin') {
      redirect('/admin')
    } else {
      redirect('/')
    }
  }

  return <TechnicalLoginForm />
}
