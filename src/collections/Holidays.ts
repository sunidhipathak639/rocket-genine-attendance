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
    {
      name: 'iconType',
      type: 'select',
      label: 'Icon Source',
      options: [
        { label: 'Lucide Icon Library', value: 'lucide' },
        { label: 'Upload Icon (PNG/SVG)', value: 'upload' },
        { label: 'Direct SVG Code', value: 'svg' },
      ],
      defaultValue: 'lucide',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'lucideIcon',
      type: 'text',
      label: 'Selected Lucide Icon',
      admin: {
        condition: (data) => data?.iconType === 'lucide',
        components: {
          Field: '@/components/admin/LucideIconPicker#LucideIconPicker',
        },
      },
    },
    {
      name: 'uploadedIcon',
      type: 'upload',
      relationTo: 'media',
      label: 'Upload Icon File',
      admin: {
        condition: (data) => data?.iconType === 'upload',
      },
    },
    {
      name: 'svgCode',
      type: 'textarea',
      label: 'Paste SVG Code',
      admin: {
        condition: (data) => data?.iconType === 'svg',
      },
    },
  ],
}
