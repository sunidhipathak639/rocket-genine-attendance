'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Chrome, Clock, ShieldCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TabActivity {
  url: string
  duration: number
  isWorkRelated: boolean
  startedAt: string
}

interface ExtensionStatsProps {
  activities?: TabActivity[]
}

export function ExtensionStats({ activities = [] }: ExtensionStatsProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <Chrome className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-semibold text-gray-900">Chrome Extension Offline</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">
          Install the Rocket Genie extension to track your work focus and automatically validate
          your attendance.
        </p>
      </div>
    )
  }

  // Calculate stats
  const totalSeconds = activities.reduce((acc, curr) => acc + (curr.duration || 0), 0)
  const workSeconds = activities
    .filter((a) => a.isWorkRelated)
    .reduce((acc, curr) => acc + (curr.duration || 0), 0)

  const focusScore = totalSeconds > 0 ? Math.round((workSeconds / totalSeconds) * 100) : 0

  // Group by domain
  const domainData: Record<string, number> = {}
  activities.forEach((act) => {
    try {
      const domain = new URL(act.url).hostname.replace('www.', '')
      domainData[domain] = (domainData[domain] || 0) + (act.duration || 0)
    } catch (_ignore) {
      domainData['other'] = (domainData['other'] || 0) + (act.duration || 0)
    }
  })

  const chartData = Object.entries(domainData)
    .map(([name, value]) => ({ name, value: Math.round(value / 60) })) // in minutes
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Overview Cards */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Activity Sync</CardTitle>
          <ShieldCheck className="text-emerald-500" size={18} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(totalSeconds / 60)}m</div>
          <p className="text-xs text-muted-foreground mt-1">Total tracked browsing today</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
          <Clock className="text-indigo-500" size={18} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{focusScore}%</div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${focusScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Domains Chart */}
      <Card className="shadow-sm md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Work Domains</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Timeline could go here */}
    </div>
  )
}
