import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  upload: {
    // Storage is handled by @payloadcms/storage-vercel-blob (disableLocalStorage set by plugin)
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, position: 'centre' },
      { name: 'card', width: 768, height: 768, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: false,
      admin: {
        description:
          'Optional URL for externally hosted files (e.g. from frontend). Filled automatically for uploads in Payload.',
      },
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Alt text for the image (accessibility and display).' },
    },
  ],
}
