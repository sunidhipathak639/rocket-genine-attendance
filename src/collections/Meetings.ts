import type { CollectionConfig } from 'payload'

export const Meetings: CollectionConfig = {
  slug: 'meetings',
  admin: {
    useAsTitle: 'topic',
    defaultColumns: ['topic', 'meetingLink', 'date', 'status'],
    group: 'Admin',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'topic',
      type: 'text',
      required: true,
      label: 'Meeting Topic',
    },
    {
      name: 'meetingLink',
      type: 'text',
      required: true,
      label: 'Meeting Link',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'participants',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      required: true,
      label: 'Select Participants',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sent', value: 'sent' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sendMeetingEmail',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/SendMeetingButton#SendMeetingButton',
        },
      },
    },
  ],
}
