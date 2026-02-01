import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'department'],
    components: {
      edit: {
        beforeDocumentControls: ['/components/admin/GeneratePayrollButton#GeneratePayrollButton'],
      },
    },
  },
  auth: true,
  access: {
    // SECURITY: Public access enabled for testing
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
    // Only admins can access the admin panel
    admin: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
  },
  hooks: {
    afterLogin: [
      async ({ user, req: _req }) => {
        // Redirect based on role after login
        // This is handled client-side via the login redirect component
        // and server-side via middleware
        return user
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Staff', value: 'staff' },
      ],
      defaultValue: 'staff',
      required: true,
      saveToJWT: true, // Make role available in payload.user
    },
    {
      name: 'salary',
      type: 'number',
      admin: {
        description: 'Monthly base salary (INR)',
      },
      saveToJWT: true,
    },
    {
      name: 'department',
      type: 'text',
    },
  ],
}
