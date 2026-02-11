import 'dotenv/config'
// @ts-ignore - pg is available as a transitive dependency via @payloadcms/db-postgres
import { Client } from 'pg'

/**
 * Script to fix duplicate filenames in media table using direct SQL
 * This bypasses Payload initialization which fails due to the duplicate constraint
 */
async function fixDuplicateMediaSQL() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL || '',
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    await client.connect()
    console.log('🔧 Connected to database. Fixing duplicate media filenames...\n')

    // Find duplicate filenames
    const duplicateQuery = `
      SELECT filename, COUNT(*) as count, array_agg(id ORDER BY id) as ids
      FROM media
      WHERE filename IS NOT NULL
      GROUP BY filename
      HAVING COUNT(*) > 1
      ORDER BY filename;
    `

    const duplicates = await client.query(duplicateQuery)

    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicate filenames found. Database is clean!\n')
      await client.end()
      return
    }

    console.log(`⚠️  Found ${duplicates.rows.length} duplicate filename(s)\n`)

    let fixed = 0

    // Fix each duplicate group
    for (const row of duplicates.rows) {
      const filename = row.filename
      const ids = row.ids as number[]
      const count = row.count

      console.log(`  Fixing: "${filename}" (${count} duplicates)`)

      // Keep first ID as-is, rename others
      for (let i = 1; i < ids.length; i++) {
        const fileId = ids[i]
        const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : ''
        const nameWithoutExt = filename.includes('.')
          ? filename.substring(0, filename.lastIndexOf('.'))
          : filename
        const newFilename = `${nameWithoutExt}_${fileId}${ext}`

        try {
          const updateQuery = `
            UPDATE media
            SET filename = $1
            WHERE id = $2;
          `

          await client.query(updateQuery, [newFilename, fileId])
          console.log(`    ✅ Renamed ID ${fileId}: "${filename}" → "${newFilename}"`)
          fixed++
        } catch (error: any) {
          console.error(`    ❌ Error renaming ID ${fileId}: ${error.message}`)
        }
      }
    }

    console.log(`\n✅ Fixed ${fixed} duplicate filename(s)\n`)

    // Now try to create the index if it doesn't exist
    try {
      console.log('🔧 Attempting to create unique index...\n')
      // Drop existing index if it exists (in case it's partial)
      await client.query(`DROP INDEX IF EXISTS media_filename_idx;`)
      // Create the unique index
      await client.query(`
        CREATE UNIQUE INDEX media_filename_idx ON media USING btree (filename)
        WHERE filename IS NOT NULL;
      `)
      console.log('✅ Unique index created successfully!\n')
    } catch (error: any) {
      if (error.code === '23505') {
        console.log('⚠️  Still have duplicates. Please check manually.\n')
      } else {
        console.log(`ℹ️  Index creation note: ${error.message}\n`)
        console.log('   This is okay - Payload will create it on next initialization.\n')
      }
    }

    await client.end()
  } catch (error: any) {
    console.error('❌ Error fixing duplicates:', error.message)
    await client.end()
    process.exit(1)
  }
}

fixDuplicateMediaSQL()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
