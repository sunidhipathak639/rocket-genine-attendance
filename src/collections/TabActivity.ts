import type { CollectionConfig } from 'payload'

export const TabActivity: CollectionConfig = {
  slug: 'tab-activity',
  admin: {
    useAsTitle: 'url',
    defaultColumns: ['user', 'url', 'duration', 'startedAt', 'isWorkRelated'],
    group: 'Attendance Staff',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        user: { equals: user.id },
      }
    },
    create: ({ req: { user } }) => !!user, // Must be logged in
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        user: { equals: user.id },
      }
    },
    delete: () => true,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      defaultValue: ({ user }) => user?.id,
    },
    {
      name: 'url',
      type: 'text',
      required: true,
    },
    {
      name: 'tabId',
      type: 'number',
      required: true,
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'endedAt',
      type: 'date',
    },
    {
      name: 'duration',
      type: 'number', // in seconds
      admin: {
        description: 'Duration in seconds',
      },
    },
    {
      name: 'attendanceSession',
      type: 'relationship',
      relationTo: 'attendance',
      required: false,
      index: true,
    },
    {
      name: 'isWorkRelated',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional metadata from the browser',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        try {
          // Robustly ensure user is set from the authenticated request
          if (!data.user && req.user) {
            data.user = req.user.id
          }

          // Automatically link to current attendance session
          if (!data.attendanceSession && data.user && req.payload) {
            const userId = data.user && typeof data.user === 'object' ? data.user.id : data.user
            if (!userId) return data // Failsafe

            const todayStr = new Date().toISOString().split('T')[0]

            const sessions = await req.payload.find({
              collection: 'attendance',
              where: {
                and: [
                  { user: { equals: userId } },
                  { date: { equals: todayStr } },
                  { timeOut: { exists: false } },
                ],
              },
              limit: 1,
              overrideAccess: true,
            })

            if (sessions.docs.length > 0) {
              data.attendanceSession = sessions.docs[0].id
            }
          }
        } catch (err) {
          console.error('[TabActivity Hook] Critical Failure:', err)
        }
        return data
      },
    ],
  },
}
