import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { StaffLoginForm } from '@/components/staff-login-form'

export const metadata = {
  title: 'Staff Login | Rocket Genine',
  description: 'Login to your staff account',
}

export default async function StaffLoginPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  // If already logged in, redirect based on role
  if (user) {
    if (user.role === 'admin') {
      redirect('/admin')
    } else {
      redirect('/')
    }
  }

  return <StaffLoginForm />
}
