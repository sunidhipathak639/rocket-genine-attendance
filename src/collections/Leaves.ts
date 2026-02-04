import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { format } from 'date-fns'

export const Leaves: CollectionConfig = {
  slug: 'leaves',
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['user', 'type', 'bookingStatus', 'startDate'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, req, operation }: any) => {
        if (operation === 'create') {
          try {
            const { sendEmail } = await import('@/lib/email')
            const settings = await req.payload.findGlobal({
              slug: 'work-settings',
            })

            let targetEmails: string[] = []

            if (
              (settings as any).notificationEmails &&
              (settings as any).notificationEmails.length > 0
            ) {
              targetEmails = (settings as any).notificationEmails
                .map((e: any) => e.email)
                .filter(Boolean)
            } else {
              const admins = await req.payload.find({
                collection: 'users',
                where: { role: { equals: 'admin' } },
                limit: 5,
              })
              targetEmails = admins.docs.map((a: any) => a.email).filter(Boolean)
            }

            if (targetEmails.length > 0) {
              const user: any =
                typeof doc.user === 'object'
                  ? doc.user
                  : await req.payload.findByID({ collection: 'users', id: doc.user })

              const { getLeaveRequestEmail } = await import('@/lib/email-templates')

              await sendEmail({
                to: targetEmails,
                subject: `🏖️ New Leave Request: ${user?.name || user?.email}`,
                html: getLeaveRequestEmail({
                  employeeName: user?.name || 'Unknown',
                  employeeEmail: user?.email || '',
                  leaveType: doc.type,
                  startDate: format(new Date(doc.startDate), 'MMM dd, yyyy'),
                  endDate: format(new Date(doc.endDate), 'MMM dd, yyyy'),
                  reason: doc.reason,
                  leaveId: doc.id,
                }),
              })
            }
          } catch (err) {
            console.error('Failed to send leave request email:', err)
          }
        }
      },
    ],
    beforeChange: [
      async ({ data, req, operation }: any) => {
        // Only validate for staff users on create operation
        if (operation === 'create' && req.user && req.user.role === 'staff') {
          // Use date strings (YYYY-MM-DD) and UTC to avoid timezone bugs (e.g. Feb 2 UTC is Monday; in PST it becomes Feb 1 Sunday)
          const startStr =
            typeof data.startDate === 'string'
              ? data.startDate.split('T')[0]
              : new Date(data.startDate).toISOString().split('T')[0]
          const endStr =
            typeof data.endDate === 'string'
              ? data.endDate.split('T')[0]
              : new Date(data.endDate).toISOString().split('T')[0]
          const now = new Date()
          const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

          // Block past dates only (today and future are allowed)
          if (startStr < todayStr || endStr < todayStr) {
            throw new APIError(
              'Leave cannot be requested for past dates. Please select today or a future date.',
              400,
            )
          }

          // Block Sundays only (use UTC day so "2026-02-02" is always Monday regardless of server timezone)
          const startDateUtc = new Date(startStr + 'T12:00:00.000Z')
          const endDateUtc = new Date(endStr + 'T12:00:00.000Z')
          if (startDateUtc.getUTCDay() === 0 || endDateUtc.getUTCDay() === 0) {
            throw new APIError(
              'Leave cannot be requested for Sundays. Please select a different date.',
              400,
            )
          }
          const currentDate = new Date(startStr + 'T12:00:00.000Z')
          const endDate = new Date(endStr + 'T12:00:00.000Z')
          while (currentDate <= endDate) {
            if (currentDate.getUTCDay() === 0) {
              throw new APIError(
                'Leave cannot be requested for Sundays. Please select a date range that does not include Sunday.',
                400,
              )
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1)
          }

          // Fetch all holidays (internal hook check; bypass access)
          const holidays = await req.payload.find({
            collection: 'holidays',
            limit: 1000,
            req,
            overrideAccess: true,
          })

          // Check if start date or end date is a holiday (compare date strings to avoid timezone issues)
          const toDateStr = (d: any) =>
            typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0]
          const isStartDateHoliday = holidays.docs.some(
            (hol: any) => toDateStr(hol.date) === startStr,
          )
          const isEndDateHoliday = holidays.docs.some((hol: any) => toDateStr(hol.date) === endStr)

          if (isStartDateHoliday) {
            const holiday = holidays.docs.find((hol: any) => toDateStr(hol.date) === startStr)
            throw new APIError(
              `Leave requests cannot be made on holidays. ${holiday?.name || 'This date'} is a holiday.`,
              400,
            )
          }

          if (isEndDateHoliday) {
            const holiday = holidays.docs.find((hol: any) => toDateStr(hol.date) === endStr)
            throw new APIError(
              `Leave requests cannot be made on holidays. ${holiday?.name || 'This date'} is a holiday.`,
              400,
            )
          }

          // Check if any date in the range is a holiday
          let checkStr = startStr
          while (checkStr <= endStr) {
            const isHoliday = holidays.docs.some((hol: any) => toDateStr(hol.date) === checkStr)
            if (isHoliday) {
              const holiday = holidays.docs.find((hol: any) => toDateStr(hol.date) === checkStr)
              throw new APIError(
                `Leave requests cannot be made on holidays. ${holiday?.name || 'A date in your selected range'} is a holiday.`,
                400,
              )
            }
            const next = new Date(checkStr + 'T12:00:00.000Z')
            next.setUTCDate(next.getUTCDate() + 1)
            checkStr = next.toISOString().split('T')[0]
          }

          // Staff can request leave only once per day: no existing leave (pending or approved) for any date in this range (internal hook; bypass access)
          const userId = typeof data.user === 'object' ? (data.user as any)?.id : data.user
          const existingLeaves = await req.payload.find({
            collection: 'leaves',
            where: {
              and: [
                { user: { equals: userId } },
                {
                  or: [
                    { bookingStatus: { equals: 'pending' } },
                    { bookingStatus: { equals: 'approved' } },
                  ],
                },
                { startDate: { less_than_equal: endStr } },
                { endDate: { greater_than_equal: startStr } },
              ],
            },
            limit: 10,
            req,
            overrideAccess: true,
          })

          if (existingLeaves.totalDocs > 0) {
            throw new APIError(
              'You can only request leave once for a particular day. You already have a leave request (pending or approved) for one or more dates in this range.',
              400,
            )
          }
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
      name: 'type',
      type: 'select',
      options: [
        { label: 'Full Day', value: 'full_day' },
        { label: 'Half Day', value: 'half_day' },
        { label: 'Paid Leave', value: 'paid' },
        { label: 'Unpaid Leave', value: 'unpaid' },
      ],
      required: true,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
    },
    {
      name: 'reason',
      type: 'textarea',
    },
    {
      name: 'bookingStatus', // 'status' matches a payload internal property sometimes, but mostly safe. Using bookingStatus for clarity
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'pending',
      required: true,
    },
  ],
}
