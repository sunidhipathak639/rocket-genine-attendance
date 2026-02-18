import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import {
  calculatePayroll,
  type PayrollCalculationInput,
  roundToTwoDecimals,
} from '@/lib/payroll-calculator'

export const Payroll: CollectionConfig = {
  slug: 'payroll',
  admin: {
    useAsTitle: 'month',
    defaultColumns: ['user', 'month', 'finalAmount', 'paymentStatus'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation: _operation }) => {
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
          const leavesArePaid = workSettings?.leavesArePaid || false

          // Calculate total days in the month (all days including weekends are paid)
          // This is used for daily salary calculation (base salary / days in month)
          const monthEndDate = new Date(year, month, 0) // Last day of month
          const totalDaysInMonth = monthEndDate.getDate() // Total days in the month (e.g., 31 for January)

          // Determine actual payroll period (custom dates or full month)
          const startDate = data.startDate ? new Date(data.startDate) : new Date(year, month - 1, 1)
          const endDate = data.endDate ? new Date(data.endDate) : new Date(year, month, 0)

          // Validate date range
          if (startDate > endDate) {
            throw new APIError('Start date must be before or equal to end date.', 400)
          }

          // Calculate total days in the selected period (all days including weekends are paid)
          const periodStart = new Date(startDate)
          periodStart.setHours(0, 0, 0, 0)
          const periodEnd = new Date(endDate)
          periodEnd.setHours(23, 59, 59, 999)

          // Count total days in the period (inclusive)
          let totalDaysInPeriod = 0
          const checkDate = new Date(periodStart)
          while (checkDate <= periodEnd) {
            totalDaysInPeriod++
            checkDate.setDate(checkDate.getDate() + 1)
          }

          // Fetch holidays for the period (internal hook; bypass access)
          const holidays = await req.payload.find({
            collection: 'holidays',
            where: {
              and: [
                {
                  date: {
                    greater_than_equal: startDate.toISOString().split('T')[0],
                    less_than_equal: endDate.toISOString().split('T')[0],
                  },
                },
              ],
            },
            limit: 100,
            req,
            overrideAccess: true,
          })

          // Note: We don't subtract holidays from total days because holidays are also paid days
          // All days in the month (including weekends and holidays) are considered paid days

          // Fetch attendance records for the period (internal hook; bypass access)
          const attendanceRecords = await req.payload.find({
            collection: 'attendance',
            where: {
              and: [
                { user: { equals: userIdNum } },
                {
                  date: {
                    greater_than_equal: startDate.toISOString().split('T')[0],
                    less_than_equal: endDate.toISOString().split('T')[0],
                  },
                },
              ],
            },
            limit: 1000,
            req,
            overrideAccess: true,
          })

          // Calculate attendance stats from attendance records
          // Note: Absent days are NOT counted here - they will be calculated using the formula:
          // Absent Days = Total Days - (Present Days + Leave Days)

          // Sort attendance records by date to detect consecutive late days
          const sortedRecords = [...attendanceRecords.docs].sort((a: any, b: any) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return dateA - dateB
          })

          // Create a map of dates to records for easier lookup
          const dateToRecord = new Map<string, any>()
          sortedRecords.forEach((record: any) => {
            const dateStr =
              typeof record.date === 'string'
                ? record.date.split('T')[0]
                : new Date(record.date).toISOString().split('T')[0]
            dateToRecord.set(dateStr, record)
          })

          // Identify which late days are part of consecutive pairs
          const consecutiveLateDays = new Set<string>() // Dates that are part of consecutive late pairs

          sortedRecords.forEach((record: any) => {
            if (record.status === 'late') {
              const recordDate = new Date(record.date)
              const dateStr =
                typeof record.date === 'string'
                  ? record.date.split('T')[0]
                  : recordDate.toISOString().split('T')[0]

              // Check if next day is also late
              const nextDay = new Date(recordDate)
              nextDay.setDate(nextDay.getDate() + 1)
              const nextDayStr = nextDay.toISOString().split('T')[0]
              const nextDayRecord = dateToRecord.get(nextDayStr)

              // Check if previous day was late
              const prevDay = new Date(recordDate)
              prevDay.setDate(prevDay.getDate() - 1)
              const prevDayStr = prevDay.toISOString().split('T')[0]
              const prevDayRecord = dateToRecord.get(prevDayStr)

              // If this late day is followed by another late day OR preceded by a late day, it's consecutive
              if (
                (nextDayRecord &&
                  (nextDayRecord.status === 'late' || nextDayRecord.status === 'half-day')) ||
                (prevDayRecord &&
                  (prevDayRecord.status === 'late' || prevDayRecord.status === 'half-day'))
              ) {
                consecutiveLateDays.add(dateStr)
              }
            }
          })

          let presentDays = 0
          let lateCount = 0
          let halfDayCount = 0

          // Count attendance with consecutive late penalty
          sortedRecords.forEach((record: any) => {
            const dateStr =
              typeof record.date === 'string'
                ? record.date.split('T')[0]
                : new Date(record.date).toISOString().split('T')[0]

            if (record.status === 'present') {
              presentDays++
            } else if (record.status === 'late') {
              if (consecutiveLateDays.has(dateStr)) {
                // This late day is part of consecutive late days - count as half-day penalty
                halfDayCount++
                presentDays += 0.5
              } else {
                // Normal late day - counts as full present
                lateCount++
                presentDays++
              }
            } else if (record.status === 'half-day') {
              // Half-day status (could be from consecutive late or from working < 8 hours)
              halfDayCount++
              presentDays += 0.5
            }
            // Absent days are NOT counted here - they will be calculated from the formula
          })

          // Fetch approved leaves for the period (internal hook; bypass access)
          const approvedLeaves = await req.payload.find({
            collection: 'leaves',
            where: {
              and: [
                { user: { equals: userIdNum } },
                { bookingStatus: { equals: 'approved' } },
                {
                  startDate: {
                    less_than_equal: endDate.toISOString().split('T')[0],
                  },
                },
                {
                  endDate: {
                    greater_than_equal: startDate.toISOString().split('T')[0],
                  },
                },
              ],
            },
            limit: 100,
            req,
            overrideAccess: true,
          })

          // Calculate leave days (count ALL days in leave range - weekends and holidays are also deducted)
          // Since all days are paid, all leave days result in deduction
          let leavesTaken = 0
          approvedLeaves.docs.forEach((leave: any) => {
            const leaveStart = new Date(leave.startDate)
            const leaveEnd = new Date(leave.endDate)

            // Only count leaves that overlap with the payroll period
            const actualStart = leaveStart < startDate ? startDate : leaveStart
            const actualEnd = leaveEnd > endDate ? endDate : leaveEnd

            if (actualStart <= actualEnd) {
              const checkDate = new Date(actualStart)
              while (checkDate <= actualEnd) {
                // Count ALL days (including weekends and holidays) - all leave days result in deduction
                if (leave.type === 'half_day') {
                  leavesTaken += 0.5
                } else {
                  leavesTaken += 1
                }
                checkDate.setDate(checkDate.getDate() + 1)
              }
            }
          })

          // Count ALL holidays for reference (all holidays are paid, included in total days)
          let holidayDays = 0
          holidays.docs.forEach((_holiday: any) => {
            holidayDays++
          })

          // Use the payroll calculator utility for clean, validated calculations
          const payrollInput: PayrollCalculationInput = {
            baseSalary: data.baseSalary,
            totalDays: totalDaysInPeriod,
            totalDaysInMonth: totalDaysInMonth,
            presentDays: presentDays,
            leaveDays: leavesTaken,
            halfDayPenalties: halfDayCount,
            leavesArePaid: leavesArePaid,
          }

          // Calculate payroll using the utility function
          // This handles:
          // - Absent days calculation: Total Days - (Present Days + Leave Days)
          // - Payable days calculation based on paid/unpaid leave setting
          // - All deductions (absent, penalty, unpaid leave)
          // - Final salary calculation with proper rounding
          let payrollResult
          try {
            payrollResult = calculatePayroll(payrollInput)
          } catch (error: any) {
            throw new APIError(
              `Payroll calculation error: ${error.message || 'Invalid payroll data'}`,
              400,
            )
          }

          // Extract calculated values
          const {
            absentDays,
            payableDays,
            absentDeduction,
            penaltyDeduction,
            leaveDeduction,
            finalSalary,
          } = payrollResult

          // Update stats
          if (!data.stats) {
            data.stats = {}
          }
          data.stats.totalDays = totalDaysInPeriod // Total days in selected period (all are paid)
          ;(data.stats as any).totalDaysInMonth = totalDaysInMonth // Total days in month (for reference)
          data.stats.presentDays = presentDays
          data.stats.leavesTaken = leavesTaken
          data.stats.lateCount = lateCount
          data.stats.penaltyDays = roundToTwoDecimals(halfDayCount * 0.5) // Half-day deduction days (includes consecutive late penalties)
          data.stats.payableDays = roundToTwoDecimals(payableDays)
          // Add holiday days and absent days to stats for transparency
          ;(data.stats as any).holidayDays = holidayDays
          ;(data.stats as any).absentDays = roundToTwoDecimals(absentDays)

          // Update deductions
          if (!data.deductions) {
            data.deductions = {}
          }
          data.deductions.leaveDeduction = leaveDeduction
          data.deductions.halfDayDeduction = penaltyDeduction
          data.deductions.absentDeduction = absentDeduction

          // Update final amount (rounded to 2 decimal places)
          data.finalAmount = finalSalary
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
        description: 'Format: YYYY-MM (e.g. 2026-01). Used for monthly salary calculation.',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      admin: {
        description:
          'Optional: Start date for payroll period. If not set, uses first day of the month.',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        description:
          'Optional: End date for payroll period. If not set, uses last day of the month.',
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
            description:
              'Auto-calculated: Total days in the selected period (all days including weekends and holidays are paid). If custom dates not set, this equals total days in month.',
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
            description:
              'Auto-calculated: Payable days = (Present days + Leave days if paid, or Present days if unpaid) - Penalty deductions. Absent days are calculated as: Total days - (Present days + Leave days).',
            readOnly: true,
          },
        },
        {
          name: 'holidayDays',
          type: 'number',
          admin: {
            description: 'Auto-calculated: Number of holidays in the month (paid days)',
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
            description:
              'Auto-calculated: Deduction for approved leaves (only if leaves are unpaid in Work Settings). If leaves are paid, this will be 0.',
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
        {
          name: 'absentDeduction',
          type: 'number',
          admin: {
            description: 'Auto-calculated: Deduction for absent days',
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
