import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

/**
 * Script to fix duplicate filenames in media table
 * Adds a unique suffix to duplicate filenames to resolve unique index constraint
 */
async function fixDuplicateMedia() {
  try {
    console.log('🔧 Fixing duplicate media filenames...\n')

    const payload = await getPayload({ config: await configPromise })

    // Get all media files
    const allMedia = await payload.find({
      collection: 'media',
      limit: 10000,
      overrideAccess: true,
    })

    console.log(`📋 Found ${allMedia.docs.length} media files\n`)

    // Group by filename to find duplicates
    const filenameMap = new Map<string, any[]>()

    allMedia.docs.forEach((media: any) => {
      const filename = media.filename || ''
      if (!filenameMap.has(filename)) {
        filenameMap.set(filename, [])
      }
      filenameMap.get(filename)!.push(media)
    })

    // Find duplicates
    const duplicates = Array.from(filenameMap.entries()).filter(([_, files]) => files.length > 1)

    if (duplicates.length === 0) {
      console.log('✅ No duplicate filenames found. Database is clean!\n')
      return
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate filename(s)\n`)

    let fixed = 0

    // Fix each duplicate group
    for (const [filename, files] of duplicates) {
      console.log(`  Fixing: "${filename}" (${files.length} duplicates)`)

      // Keep first file as-is, rename others
      for (let i = 1; i < files.length; i++) {
        const file = files[i]
        const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : ''
        const nameWithoutExt = filename.includes('.')
          ? filename.substring(0, filename.lastIndexOf('.'))
          : filename
        const newFilename = `${nameWithoutExt}_${file.id}${ext}`

        try {
          await payload.update({
            collection: 'media',
            id: file.id,
            data: {
              filename: newFilename,
            },
            overrideAccess: true,
          })

          console.log(`    ✅ Renamed ID ${file.id}: "${filename}" → "${newFilename}"`)
          fixed++
        } catch (error: any) {
          console.error(`    ❌ Error renaming ID ${file.id}: ${error.message}`)
        }
      }
    }

    console.log(`\n✅ Fixed ${fixed} duplicate filename(s)\n`)
  } catch (error: any) {
    console.error('❌ Error fixing duplicates:', error.message)
    process.exit(1)
  }
}

fixDuplicateMedia()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
