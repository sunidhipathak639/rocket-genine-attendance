import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Attendance } from './collections/Attendance'
import { Leaves } from './collections/Leaves'
import { Payroll } from './collections/Payroll'
import { Holidays } from './collections/Holidays'
import { WorkSettings } from './globals/WorkSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// In production (Vercel), set PAYLOAD_SECRET and POSTGRES_URL in Project → Settings → Environment Variables.
// If they are missing, you'll see a server error and the real message in Vercel → Logs.

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Rocket Genine',
    },
  },
  collections: [Users, Media, Attendance, Leaves, Payroll, Holidays],
  globals: [WorkSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL || '',
      ssl: {
        rejectUnauthorized: false,
      },
    },
  }),
  sharp,
  plugins: [],
})
