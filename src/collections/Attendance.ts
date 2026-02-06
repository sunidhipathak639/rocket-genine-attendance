import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

export const Attendance: CollectionConfig = {
  slug: 'attendance',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['user', 'date', 'status', 'timeIn'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // On new check-in: mark any previous days where user forgot to check out as absent
        if (operation === 'create' && req.user && data.timeIn) {
          const userId =
            typeof data.user === 'string'
              ? data.user
              : ((data.user as { id?: string | number })?.id ?? req.user.id)
          const today = new Date(data.date || new Date())
          const todayStr = today.toISOString().split('T')[0]

          const forgottenCheckout = await req.payload.find({
            collection: 'attendance',
            where: {
              and: [
                { user: { equals: userId } },
                { date: { less_than: todayStr } },
                { timeOut: { exists: false } },
              ],
            },
            limit: 31,
            req,
            overrideAccess: true,
          })

          for (const doc of forgottenCheckout.docs) {
            const recordDate = doc.date ? new Date(doc.date) : new Date()
            const endOfDay = new Date(recordDate)
            endOfDay.setHours(23, 59, 59, 999)
            await req.payload.update({
              collection: 'attendance',
              id: doc.id,
              data: {
                status: 'absent',
                timeOut: endOfDay.toISOString(),
              },
              req,
              overrideAccess: true,
              context: { skipHooks: true },
            })
          }
        }

        // Only validate for staff users on create operation
        if (operation === 'create' && req.user && req.user.role === 'staff') {
          const today = new Date(data.date || new Date())
          const todayStr =
            typeof data.date === 'string'
              ? data.date.split('T')[0]
              : today.toISOString().split('T')[0]

          // Block check-in on holidays
          const holidaysRes = await req.payload.find({
            collection: 'holidays',
            where: { date: { equals: todayStr } },
            limit: 1,
            req,
            overrideAccess: true,
          })
          if (holidaysRes.docs.length > 0) {
            const holiday = holidaysRes.docs[0] as { name?: string }
            throw new APIError(
              `Check-in is not allowed on holidays. ${holiday.name ? `"${holiday.name}" is a holiday.` : 'This date is a holiday.'}`,
              400,
            )
          }

          // Check if user already has an attendance record for this date (internal hook check; bypass access)
          const existingRecords = await req.payload.find({
            collection: 'attendance',
            where: {
              and: [{ user: { equals: req.user.id } }, { date: { equals: todayStr } }],
            },
            limit: 1,
            req,
            overrideAccess: true,
          })

          // Limit to 1 check-in per day for staff
          if (existingRecords.totalDocs >= 1) {
            throw new APIError(
              'You can only check in once per day. You have already checked in today.',
              400,
            )
          }
        }

        // Auto-detect late and mark half day if late for 2 consecutive days
        if (operation === 'create' && data.timeIn && req.user) {
          // Get work settings to check start time
          const workSettings = await req.payload.findGlobal({
            slug: 'work-settings',
          })

          const startTime = workSettings?.workStartTime
            ? new Date(workSettings.workStartTime)
            : new Date(0, 0, 0, 9, 0, 0, 0)
          const recordDate = new Date(data.date || new Date())
          const recordDateStr =
            typeof data.date === 'string' ? data.date : recordDate.toISOString().split('T')[0]
          const workStartTime = new Date(recordDateStr + 'T12:00:00.000Z')
          workStartTime.setUTCHours(startTime.getUTCHours(), startTime.getUTCMinutes(), 0, 0)

          const checkInTime = new Date(data.timeIn)

          // Check-in allowed only from 1 hour before start time; block if earlier
          const earliestCheckIn = new Date(workStartTime.getTime() - 60 * 60 * 1000)
          if (checkInTime < earliestCheckIn) {
            throw new APIError(
              'You can only check in from 1 hour before the work start time. Please check in later.',
              400,
            )
          }

          // Check if user is late (check-in time is after work start time)
          if (checkInTime > workStartTime) {
            // Set status to late initially
            data.status = 'late'

            const userId = typeof data.user === 'string' ? data.user : data.user?.id || req.user.id
            const recordDate = new Date(data.date || new Date())

            // Check if previous day was also late or half-day (consecutive late days)
            const previousDay = new Date(recordDate)
            previousDay.setDate(previousDay.getDate() - 1)
            const previousDayStr = previousDay.toISOString().split('T')[0]

            // Check previous day's attendance (internal hook check; bypass access)
            const previousDayRecord = await req.payload.find({
              collection: 'attendance',
              where: {
                and: [
                  { user: { equals: userId } },
                  { date: { equals: previousDayStr } },
                  {
                    or: [{ status: { equals: 'late' } }, { status: { equals: 'half-day' } }],
                  },
                ],
              },
              limit: 1,
              req,
              overrideAccess: true,
            })

            // If previous day was late or half-day, mark current day as half-day (2 consecutive late days)
            if (previousDayRecord.totalDocs >= 1) {
              data.status = 'half-day'
            }
          }
        }

        // When timeOut is set: full working day = 9 hours. If worked < 4.5h → absent; if >= 4.5h but < 9h → half-day
        const doc = originalDoc as { timeIn?: string; timeOut?: string; date?: string } | undefined
        const timeIn = data.timeIn ?? doc?.timeIn
        const timeOut = data.timeOut ?? doc?.timeOut

        if (timeIn && timeOut) {
          const FULL_WORKING_HOURS = 9
          const fullWorkingMs = FULL_WORKING_HOURS * 60 * 60 * 1000
          const halfWorkingMs = fullWorkingMs / 2 // 4.5 hours

          const timeInDate = new Date(timeIn)
          const timeOutDate = new Date(timeOut)
          const workedMs = Math.max(0, timeOutDate.getTime() - timeInDate.getTime())

          if (workedMs < halfWorkingMs) {
            data.status = 'absent'
          } else if (workedMs < fullWorkingMs) {
            data.status = 'half-day'
          }
          // else: worked >= 9 hours → keep current status (present/late)
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
      defaultValue: ({ user }) => user?.id,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'timeIn',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
        },
      },
    },
    {
      name: 'timeOut',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Present', value: 'present' },
        { label: 'Absent', value: 'absent' },
        { label: 'Late', value: 'late' },
        { label: 'Half Day', value: 'half-day' },
      ],
      defaultValue: 'present',
      required: true,
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'latitude',
          type: 'number',
        },
        {
          name: 'longitude',
          type: 'number',
        },
        {
          name: 'address',
          type: 'text',
        },
      ],
    },
    {
      name: 'selfie',
      type: 'text',
      required: false,
      admin: {
        description: 'Photo proof of attendance (URL)',
        components: {
          Field: '@/components/admin/AttendancePreviews#SelfiePreview',
          Cell: '@/components/admin/AttendancePreviews#SelfieCell',
        },
      },
    },
    {
      name: 'activityLogs',
      type: 'array',
      admin: {
        description: 'Logs of user activity checks',
      },
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ],
          required: true,
        },
        {
          name: 'notes',
          type: 'text',
          admin: { description: 'System or internal note for this check' },
        },
        {
          name: 'intervalSummary',
          type: 'textarea',
          admin: {
            description: 'What the user reported doing during this interval (from activity popup)',
          },
        },
      ],
    },
    {
      name: 'activeDuration',
      type: 'number',
      admin: {
        description: 'Total active minutes based on popup confirmations',
      },
      defaultValue: 0,
    },
    {
      name: 'inactiveDuration',
      type: 'number',
      admin: {
        description: 'Total inactive minutes based on missed popups',
      },
      defaultValue: 0,
    },
    {
      name: 'locationHistory',
      type: 'array',
      admin: {
        description: 'Periodic location tracking during work hours',
      },
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
        {
          name: 'latitude',
          type: 'number',
          required: true,
        },
        {
          name: 'longitude',
          type: 'number',
          required: true,
        },
        {
          name: 'address',
          type: 'text',
        },
      ],
    },
    {
      name: 'workSummary',
      type: 'textarea',
      admin: {
        description: 'Detailed description of work performed',
      },
    },
    {
      name: 'accomplishments',
      type: 'textarea',
      admin: {
        description: 'Key wins and tasks completed today',
      },
    },
    {
      name: 'challenges',
      type: 'textarea',
      admin: {
        description: 'Any blockers or challenges faced during the shift',
      },
    },
    {
      name: 'nextDayPlan',
      type: 'textarea',
      label: 'Tasks for Tomorrow',
      admin: {
        description: 'Priority tasks planned for the next working day',
      },
    },
    {
      name: 'mood',
      type: 'select',
      label: 'End of Day Sentiment',
      options: [
        { label: '🚀 Highly Productive', value: 'productive' },
        { label: '✅ Good Progress', value: 'good' },
        { label: '⚠️ Challenging', value: 'challenging' },
        { label: '😴 Exhausting', value: 'exhausting' },
        { label: '📉 Blocked', value: 'blocked' },
      ],
      admin: {
        description: 'How was your workday overall?',
      },
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Upload PDFs, documents, or screenshots related to today’s work',
        components: {
          Field: '@/components/admin/AttendancePreviews#AttachmentsPreview',
        },
      },
    },
  ],
}
