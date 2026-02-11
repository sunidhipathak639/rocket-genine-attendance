import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminLoginForm from '@/components/admin-login-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin Login | Rocket Genie',
  description: 'Login to your admin account',
}

export default async function AdminLoginPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  // If already logged in, redirect based on role
  if (user) {
    if (user.role === 'staff') {
      redirect('/')
    } else if (user.role === 'technical') {
      redirect('/technical')
    } else {
      redirect('/admin')
    }
  }

  return <AdminLoginForm />
}
