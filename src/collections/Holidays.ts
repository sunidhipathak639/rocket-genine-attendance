import type { CollectionConfig } from 'payload'

export const Holidays: CollectionConfig = {
  slug: 'holidays',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'date', 'type'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
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
      name: 'type',
      type: 'select',
      options: [
        { label: 'Public Holiday', value: 'public' },
        { label: 'Company Holiday', value: 'company' },
        { label: 'Optional Holiday', value: 'optional' },
      ],
      defaultValue: 'public',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
