import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

export const Payroll: CollectionConfig = {
  slug: 'payroll',
  admin: {
    useAsTitle: 'month',
    defaultColumns: ['user', 'month', 'finalAmount', 'paymentStatus'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        user: {
          equals: user.id,
        },
      }
    },
    create: ({ req: { user } }) => user?.role === 'admin', // Only admin creates payroll
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-calculate payroll fields
        if (data.user && data.month && data.baseSalary) {
          const rawUser = data.user
          const userId =
            typeof rawUser === 'object' && rawUser !== null && 'id' in rawUser
              ? (rawUser as { id: number | string }).id
              : rawUser
          const userIdNum =
            typeof userId === 'number'
              ? userId
              : typeof userId === 'string'
                ? parseInt(userId, 10)
                : NaN
          if (userId == null || userId === '' || Number.isNaN(userIdNum)) {
            throw new APIError('Invalid user for payroll. Please save the user and try again.', 400)
          }
          const [year, month] = data.month.split('-').map(Number)
          if (!year || !month || Number.isNaN(year) || Number.isNaN(month)) {
            throw new APIError('Invalid month format. Use YYYY-MM (e.g. 2026-01).', 400)
          }
          
          // Get work settings
          const workSettings = await req.payload.findGlobal({
            slug: 'work-settings',
          })
          const saturdayIsWorkingDay = workSettings?.saturdayWorkingDay || false

          // Calculate total working days in the month
          const startDate = new Date(year, month - 1, 1)
          const endDate = new Date(year, month, 0) // Last day of month
          let totalWorkingDays = 0
          
          const currentDate = new Date(startDate)
          while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay()
            // Count weekdays (Monday-Friday) and Saturday if it's a working day
            if (dayOfWeek !== 0 && (dayOfWeek !== 6 || saturdayIsWorkingDay)) {
              totalWorkingDays++
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }

          // Fetch holidays for the month (internal hook; bypass access)
          const holidays = await req.payload.find({
            collection: 'holidays',
            where: {
              and: [
                {
                  date: {
                    greater_than_equal: `${year}-${String(month).padStart(2, '0')}-01`,
                    less_than_equal: `${year}-${String(month).padStart(2, '0')}-31`,
                  },
                },
              ],
            },
            limit: 100,
            req,
            overrideAccess: true,
          })

          // Subtract holidays from total working days
          holidays.docs.forEach((holiday: any) => {
            const holidayDate = new Date(holiday.date)
            const holidayDayOfWeek = holidayDate.getDay()
            // Only subtract if it's a working day
            if (holidayDayOfWeek !== 0 && (holidayDayOfWeek !== 6 || saturdayIsWorkingDay)) {
              totalWorkingDays--
            }
          })

          // Fetch attendance records for the month (internal hook; bypass access)
          const attendanceRecords = await req.payload.find({
            collection: 'attendance',
            where: {
              and: [
                { user: { equals: userIdNum } },
                {
                  date: {
                    greater_than_equal: `${year}-${String(month).padStart(2, '0')}-01`,
                    less_than_equal: `${year}-${String(month).padStart(2, '0')}-31`,
                  },
                },
              ],
            },
            limit: 1000,
            req,
            overrideAccess: true,
          })

          // Calculate stats
          let presentDays = 0
          let lateCount = 0
          let halfDayCount = 0
          
          attendanceRecords.docs.forEach((record: any) => {
            if (record.status === 'present') {
              presentDays++
            } else if (record.status === 'late') {
              lateCount++
              presentDays++ // Late still counts as present
            } else if (record.status === 'half-day') {
              halfDayCount++
              presentDays += 0.5 // Half day counts as 0.5
            }
          })

          // Fetch approved leaves for the month (internal hook; bypass access)
          const approvedLeaves = await req.payload.find({
            collection: 'leaves',
            where: {
              and: [
                { user: { equals: userIdNum } },
                { bookingStatus: { equals: 'approved' } },
                {
                  startDate: {
                    less_than_equal: `${year}-${String(month).padStart(2, '0')}-31`,
                  },
                },
                {
                  endDate: {
                    greater_than_equal: `${year}-${String(month).padStart(2, '0')}-01`,
                  },
                },
              ],
            },
            limit: 100,
            req,
            overrideAccess: true,
          })

          // Calculate leave days (only count working days in leave range)
          let leavesTaken = 0
          approvedLeaves.docs.forEach((leave: any) => {
            const leaveStart = new Date(leave.startDate)
            const leaveEnd = new Date(leave.endDate)
            const leaveStartMonth = leaveStart.getMonth() + 1
            const leaveEndMonth = leaveEnd.getMonth() + 1
            
            // Only count leaves that overlap with the payroll month
            if (leaveStartMonth === month || leaveEndMonth === month || (leaveStartMonth < month && leaveEndMonth > month)) {
              const actualStart = leaveStart < startDate ? startDate : leaveStart
              const actualEnd = leaveEnd > endDate ? endDate : leaveEnd
              
              const checkDate = new Date(actualStart)
              while (checkDate <= actualEnd) {
                const dayOfWeek = checkDate.getDay()
                // Count only working days
                if (dayOfWeek !== 0 && (dayOfWeek !== 6 || saturdayIsWorkingDay)) {
                  // Check if it's not a holiday
                  const isHoliday = holidays.docs.some((hol: any) => {
                    const holidayDate = new Date(hol.date)
                    return holidayDate.toDateString() === checkDate.toDateString()
                  })
                  
                  if (!isHoliday) {
                    if (leave.type === 'half_day') {
                      leavesTaken += 0.5
                    } else {
                      leavesTaken += 1
                    }
                  }
                }
                checkDate.setDate(checkDate.getDate() + 1)
              }
            }
          })

          // Calculate payable days (half days count as 0.5 days, but no extra penalty)
          // Half days are already accounted for in presentDays (0.5), so we need to deduct 0.5 for each half day
          const halfDayDeduction = halfDayCount * 0.5
          const payableDays = totalWorkingDays - leavesTaken - halfDayDeduction

          // Calculate daily salary
          const dailySalary = data.baseSalary / totalWorkingDays

          // Calculate deductions (only based on attendance - leaves and half days)
          const leaveDeduction = leavesTaken * dailySalary
          const halfDayDeductionAmount = halfDayDeduction * dailySalary

          // Calculate final amount (no extra penalties, only attendance-based deductions)
          const finalAmount = Math.max(0, data.baseSalary - leaveDeduction - halfDayDeductionAmount)

          // Update stats
          if (!data.stats) {
            data.stats = {}
          }
          data.stats.totalDays = totalWorkingDays
          data.stats.presentDays = presentDays
          data.stats.leavesTaken = leavesTaken
          data.stats.lateCount = lateCount
          data.stats.penaltyDays = halfDayDeduction // Renamed for clarity - this is half-day deduction, not extra penalty
          data.stats.payableDays = payableDays

          // Update deductions
          if (!data.deductions) {
            data.deductions = {}
          }
          data.deductions.leaveDeduction = leaveDeduction
          data.deductions.halfDayDeduction = halfDayDeductionAmount // Renamed from latePenalty

          // Update final amount
          data.finalAmount = finalAmount
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'month',
      type: 'text', // Format YYYY-MM
      required: true,
      admin: {
        description: 'Format: YYYY-MM (e.g. 2024-01)',
      },
    },
    {
      name: 'baseSalary',
      type: 'number',
      required: true,
      admin: {
        description: 'Base salary in INR',
      },
    },
    {
      name: 'stats',
      type: 'group',
      fields: [
        { 
          name: 'totalDays', 
          type: 'number',
          admin: {
            description: 'Auto-calculated: Total working days in the month',
            readOnly: true,
          },
        },
        { 
          name: 'presentDays', 
          type: 'number',
          admin: {
            description: 'Auto-calculated: Days present (including late and half days)',
            readOnly: true,
          },
        },
        { 
          name: 'leavesTaken', 
          type: 'number',
          admin: {
            description: 'Auto-calculated: Approved leave days (half days count as 0.5)',
            readOnly: true,
          },
        },
        { 
          name: 'lateCount', 
          type: 'number',
          admin: {
            description: 'Auto-calculated: Number of late arrivals',
            readOnly: true,
          },
        },
        { 
          name: 'penaltyDays', 
          type: 'number',
          admin: {
            description: 'Auto-calculated: Half days deducted (due to 2 consecutive late days)',
            readOnly: true,
          },
        },
        {
          name: 'payableDays',
          type: 'number',
          admin: {
            description: 'Auto-calculated: Payable days = Total days - Leaves - Penalties',
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'deductions',
      type: 'group',
      fields: [
        { 
          name: 'leaveDeduction', 
          type: 'number',
          admin: {
            description: 'Auto-calculated: Deduction for approved leaves',
            readOnly: true,
          },
        },
        { 
          name: 'halfDayDeduction', 
          type: 'number',
          admin: {
            description: 'Auto-calculated: Deduction for half days (consecutive late days)',
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'finalAmount',
      type: 'number',
      required: true,
      admin: {
          description: 'Final payment amount in INR',
      },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
      ],
      defaultValue: 'pending',
    },
  ],
}
