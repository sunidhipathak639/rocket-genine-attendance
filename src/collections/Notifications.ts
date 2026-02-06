import type { CollectionConfig } from 'payload'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'user', 'read', 'createdAt'],
    group: 'Admin',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    create: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { description: 'User who receives this notification' },
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Meeting', value: 'meeting' },
        { label: 'General', value: 'general' },
      ],
      defaultValue: 'general',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
    },
    {
      name: 'link',
      type: 'text',
      admin: { description: 'URL to open when user clicks (e.g. meeting link)' },
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
      required: true,
    },
    {
      name: 'meeting',
      type: 'relationship',
      relationTo: 'meetings',
      admin: { description: 'Related meeting if type is meeting' },
    },
  ],
  timestamps: true,
}
