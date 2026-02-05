import type { GlobalConfig } from 'payload'

export const WorkSettings: GlobalConfig = {
  slug: 'work-settings',
  label: 'Work Settings',
  admin: {
    group: 'Settings',
    description: 'Configure company work schedule and timing',
  },
  access: {
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'saturdayWorkingDay',
      type: 'checkbox',
      label: 'Saturday is a Working Day',
      defaultValue: false,
      admin: {
        description:
          'Enable if Saturday should be considered a working day. If disabled, staff cannot take leaves on Saturday.',
      },
    },
    {
      name: 'workStartTime',
      type: 'date',
      label: 'Work Start Time',
      required: true,
      defaultValue: () => {
        const date = new Date()
        date.setHours(9, 0, 0, 0) // Default to 9:00 AM
        return date.toISOString()
      },
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
        },
        description: 'The standard work start time for all employees',
      },
    },
    {
      name: 'workEndTime',
      type: 'date',
      label: 'Work End Time',
      required: true,
      defaultValue: () => {
        const date = new Date()
        date.setHours(18, 0, 0, 0) // Default to 6:00 PM
        return date.toISOString()
      },
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
        },
        description: 'The standard work end time for all employees',
      },
    },
    {
      name: 'notificationEmails',
      type: 'array',
      label: 'Admin Notification Email',
      maxRows: 1,
      defaultValue: [],
      admin: {
        description:
          'This is the main admin email address where all system notifications (Leave Requests, Status Updates, Work Summaries) will be sent.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
          defaultValue: '',
        },
      ],
    },
    {
      name: 'activityCheckInterval',
      type: 'number',
      label: 'Activity Check Interval (minutes)',
      defaultValue: 10,
      required: true,
      admin: {
        description: 'Interval in minutes between "Are you still working?" popups.',
      },
    },
  ],
}
