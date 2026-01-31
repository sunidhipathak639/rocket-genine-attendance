'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Building2,
  Mail,
  DollarSign,
  RefreshCw,
  UserCheck,
  UserX
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import type { User, Attendance } from '@/payload-types'

interface AdminDashboardViewProps {
  allUsers: User[]
  allAttendance: Attendance[]
}

export function AdminDashboardView({ allUsers, allAttendance }: AdminDashboardViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const staffUsers = useMemo(() => allUsers.filter(u => u.role === 'staff'), [allUsers])
  const todayAttendance = useMemo(() => 
    allAttendance.filter(a => a.date === todayStr),
    [allAttendance, todayStr]
  )
  const presentToday = useMemo(() => 
    todayAttendance.filter(a => ['present', 'late', 'half-day'].includes(a.status)),
    [todayAttendance]
  )
  const notCheckedInToday = useMemo(() => 
    staffUsers.filter(staff => !todayAttendance.some(a => (typeof a.user === 'object' ? a.user.id : a.user) === staff.id)),
    [staffUsers, todayAttendance]
  )

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers
    const query = searchQuery.toLowerCase()
    return allUsers.filter(user => 
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    )
  }, [allUsers, searchQuery])

  // Get attendance for selected user
  const selectedUserAttendance = useMemo(() => {
    if (!selectedUserId) return []
    return allAttendance.filter(att => {
      const userId = typeof att.user === 'object' ? att.user.id : att.user
      return userId === selectedUserId
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [allAttendance, selectedUserId])

  // Get selected user details
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null
    return allUsers.find(u => u.id === selectedUserId)
  }, [allUsers, selectedUserId])

  // Calculate stats for selected user
  const userStats = useMemo(() => {
    if (!selectedUserAttendance.length) return null
    
    const present = selectedUserAttendance.filter(a => a.status === 'present').length
    const absent = selectedUserAttendance.filter(a => a.status === 'absent').length
    const late = selectedUserAttendance.filter(a => a.status === 'late').length
    const halfDay = selectedUserAttendance.filter(a => a.status === 'half-day').length
    const total = selectedUserAttendance.length
    
    return {
      present,
      absent,
      late,
      halfDay,
      total,
      presentPercentage: total > 0 ? ((present / total) * 100).toFixed(1) : '0'
    }
  }, [selectedUserAttendance])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'half-day':
        return <Clock className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'absent':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'late':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'half-day':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h2>
          <p className="text-gray-500 mt-1">Manage and view all users and their attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Today's attendance - live monitoring */}
      <Card className="border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Today&apos;s attendance
            </CardTitle>
            <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMM d, yyyy')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Checked in ({presentToday.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {presentToday.length === 0 ? (
                  <p className="text-gray-500 text-sm">No one has checked in today yet.</p>
                ) : (
                  presentToday.map((a) => {
                    const u = typeof a.user === 'object' ? a.user : allUsers.find(x => x.id === a.user)
                    const name = u?.name || u?.email || 'Unknown'
                    const statusColor = a.status === 'present' ? 'text-green-700' : a.status === 'late' ? 'text-amber-700' : 'text-blue-700'
                    return (
                      <div key={a.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100">
                        <span className="font-medium text-gray-900">{name}</span>
                        <div className="flex items-center gap-2">
                          {a.timeIn && (
                            <span className="text-xs text-gray-500">
                              {format(new Date(a.timeIn), 'hh:mm a')}
                            </span>
                          )}
                          <span className={`text-xs font-medium ${statusColor}`}>
                            {a.status === 'present' ? 'On time' : a.status === 'late' ? 'Late' : 'Half day'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <UserX className="w-4 h-4 text-gray-500" />
                Not checked in ({notCheckedInToday.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notCheckedInToday.length === 0 ? (
                  <p className="text-gray-500 text-sm">Everyone has checked in today.</p>
                ) : (
                  notCheckedInToday.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100">
                      <span className="font-medium text-gray-700">{u.name || u.email}</span>
                      <span className="text-xs text-gray-400">—</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{allUsers.length}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Staff Members</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {allUsers.filter(u => u.role === 'staff').length}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{allAttendance.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Departments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {new Set(allUsers.map(u => u.department).filter(Boolean)).size}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No users found</p>
              ) : (
                filteredUsers.map((user) => {
                  const userId = typeof user === 'object' ? user.id : user
                  const isSelected = selectedUserId === userId
                  const userAttendanceCount = allAttendance.filter(att => {
                    const attUserId = typeof att.user === 'object' ? att.user.id : att.user
                    return attUserId === userId
                  }).length

                  return (
                    <div
                      key={userId}
                      onClick={() => setSelectedUserId(userId)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {user.department && (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                {user.department}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Records</p>
                          <p className="text-lg font-bold text-gray-900">{userAttendanceCount}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected User Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedUser ? `${selectedUser.name}'s Details` : 'Select a user to view details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-semibold text-gray-900">{selectedUser.department || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedUser.role}</p>
                  </div>
                  {selectedUser.salary && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Monthly Salary</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ₹{selectedUser.salary.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Attendance Stats */}
                {userStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-sm text-green-600 font-medium">Present</p>
                      <p className="text-2xl font-bold text-green-700 mt-1">{userStats.present}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-sm text-red-600 font-medium">Absent</p>
                      <p className="text-2xl font-bold text-red-700 mt-1">{userStats.absent}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <p className="text-sm text-yellow-600 font-medium">Late</p>
                      <p className="text-2xl font-bold text-yellow-700 mt-1">{userStats.late}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">Attendance %</p>
                      <p className="text-2xl font-bold text-blue-700 mt-1">{userStats.presentPercentage}%</p>
                    </div>
                  </div>
                )}

                {/* Attendance History */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Attendance History</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedUserAttendance.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No attendance records found</p>
                    ) : (
                      selectedUserAttendance.map((attendance) => (
                        <div
                          key={attendance.id}
                          className={`p-4 rounded-xl border-2 flex items-center justify-between ${getStatusColor(attendance.status)}`}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(attendance.status)}
                            <div>
                              <p className="font-semibold capitalize">{attendance.status}</p>
                              <p className="text-sm opacity-75">
                                {format(new Date(attendance.date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {attendance.timeIn && (
                              <p className="text-sm font-medium">
                                {format(new Date(attendance.timeIn), 'hh:mm a')}
                              </p>
                            )}
                            {attendance.timeOut && (
                              <p className="text-xs opacity-75">
                                Out: {format(new Date(attendance.timeOut), 'hh:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a user from the list to view their details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
