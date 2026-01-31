import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Attendance } from '@/payload-types'
import { DashboardClient } from '@/components/dashboard-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard | Rocket Genine',
  description: 'Manage your attendance and profile',
}

export default async function DashboardPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect('/login')
  }

  // If admin, fetch all users and their attendance data
  let allUsers = null
  let allAttendance = null

  if (user.role === 'admin') {
    // Fetch all users
    const usersResult = await payload.find({
      collection: 'users',
      limit: 100,
      sort: 'createdAt',
    })
    allUsers = usersResult.docs

    // Fetch all attendance records
    const attendanceResult = await payload.find({
      collection: 'attendance',
      limit: 1000,
      sort: '-date',
      depth: 1, // Populate user relationship
    })
    allAttendance = attendanceResult.docs
  }

  // Fetch work settings for all users
  const workSettings = await payload.findGlobal({
    slug: 'work-settings',
  })

  // For staff: fetch their attendance for the last 30 days (for weekly summary)
  let userAttendance: Attendance[] | undefined
  if (user.role === 'staff' && user.id) {
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const startStr = start.toISOString().split('T')[0]
    const endStr = new Date().toISOString().split('T')[0]
    const att = await payload.find({
      collection: 'attendance',
      where: {
        and: [
          { user: { equals: user.id } },
          { date: { greater_than_equal: startStr } },
          { date: { less_than_equal: endStr } },
        ],
      },
      limit: 31,
      sort: '-date',
    })
    userAttendance = att.docs
  }

  return (
    <DashboardClient 
      user={user} 
      allUsers={allUsers || undefined}
      allAttendance={allAttendance || undefined}
      workSettings={workSettings || undefined}
      userAttendance={userAttendance}
    />
  )
}
