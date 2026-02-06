import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Attendance, Leaf, Holiday } from '@/payload-types'
import { DashboardClient } from '@/components/dashboard-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard | Rocket Genie',
  description: 'Manage your attendance and profile',
}

export default async function DashboardPage() {
  try {
    // Runtime check: show clear message in Vercel → Logs if env vars are missing
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.PAYLOAD_SECRET?.trim()) {
        const msg =
          '[Dashboard] PAYLOAD_SECRET is missing. Add it in Vercel: Settings → Environment Variables.'
        console.error(msg)
        throw new Error(msg)
      }
      if (!process.env.POSTGRES_URL?.trim()) {
        const msg =
          '[Dashboard] POSTGRES_URL is missing. Add it in Vercel: Settings → Environment Variables.'
        console.error(msg)
        throw new Error(msg)
      }
    }

    const payload = await getPayload({ config: configPromise })
    const { user: authUser } = await payload.auth({ headers: await headers() })

    if (!authUser) {
      redirect('/login')
    }

    const user = await payload.findByID({
      collection: 'users',
      id: typeof authUser.id === 'number' ? authUser.id : parseInt(String(authUser.id), 10),
      depth: 1,
    })

    // If admin, fetch all users, attendance, pending leaves, and upcoming holidays
    let allUsers = null
    let allAttendance = null
    let pendingLeaves: Leaf[] | null = null
    let upcomingHolidays: Holiday[] | null = null

    if (user.role === 'admin') {
      const todayStr = new Date().toISOString().split('T')[0]

      const [usersResult, attendanceResult, leavesResult, holidaysResult] = await Promise.all([
        payload.find({ collection: 'users', limit: 200, sort: 'createdAt' }),
        payload.find({
          collection: 'attendance',
          limit: 2000,
          sort: '-date',
          depth: 1,
        }),
        payload.find({
          collection: 'leaves',
          where: { bookingStatus: { equals: 'pending' } },
          limit: 20,
          sort: '-createdAt',
          depth: 1,
        }),
        payload.find({
          collection: 'holidays',
          where: { date: { greater_than_equal: todayStr } },
          limit: 10,
          sort: 'date',
        }),
      ])

      allUsers = usersResult.docs
      allAttendance = attendanceResult.docs
      pendingLeaves = leavesResult.docs
      upcomingHolidays = holidaysResult.docs
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
        pendingLeaves={pendingLeaves || undefined}
        upcomingHolidays={upcomingHolidays || undefined}
        workSettings={workSettings || undefined}
        userAttendance={userAttendance}
      />
    )
  } catch (err) {
    // Log full error in server logs (visible in Vercel → Logs) so you can debug production
    console.error('Dashboard page error:', err)
    throw err
  }
}
