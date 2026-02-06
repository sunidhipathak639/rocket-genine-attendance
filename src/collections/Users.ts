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
    beforeDelete: [
      async ({ id, req }) => {
        // Cascading delete: Remove all records dependent on this user
        // this prevents foreign key constraint errors in Postgres
        try {
          console.log(`[Users Hook] Cleaning up data for User ${id} before deletion...`)

          await req.payload.delete({
            collection: 'attendance',
            where: { user: { equals: id } },
          })

          await req.payload.delete({
            collection: 'leaves',
            where: { user: { equals: id } },
          })

          await req.payload.delete({
            collection: 'payroll',
            where: { user: { equals: id } },
          })

          console.log(`[Users Hook] Cleanup complete for User ${id}`)
        } catch (err) {
          console.error(`[Users Hook] Error during user cleanup:`, err)
          // We don't throw here to allow the user deletion to attempt to proceed
          // (though it will likely fail via DB constraint if cleanup failed)
        }
      },
    ],
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
    {
      name: 'profileImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Profile picture. Users can update this from their profile page (max 1MB).',
      },
    },
  ],
}
