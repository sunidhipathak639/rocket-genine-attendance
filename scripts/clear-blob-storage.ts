/**
 * Clear all files in Vercel Blob storage (uses BLOB_READ_WRITE_TOKEN from .env).
 * Run from project root: npm run clear-blob
 */
import 'dotenv/config'
import { list, del, BlobServiceRateLimited } from '@vercel/blob'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token?.trim()) {
    console.error('BLOB_READ_WRITE_TOKEN is not set in .env')
    process.exit(1)
  }

  let totalDeleted = 0
  let cursor: string | undefined
  const batchSize = 50
  const delayBetweenBatches = 2000

  console.log('Listing and deleting blobs (with rate-limit backoff)...')
  do {
    try {
      const result = await list({ cursor, limit: batchSize, token })
      if (result.blobs.length > 0) {
        const urls = result.blobs.map((b) => b.url)
        await del(urls, { token })
        totalDeleted += urls.length
        console.log(`Deleted ${totalDeleted} so far...`)
      }
      cursor = result.hasMore ? result.cursor : undefined
      if (cursor) await delay(delayBetweenBatches)
    } catch (err) {
      if (err instanceof BlobServiceRateLimited && err.retryAfter) {
        const wait = (err.retryAfter + 2) * 1000
        console.log(`Rate limited. Waiting ${Math.round(wait / 1000)}s...`)
        await delay(wait)
      } else {
        throw err
      }
    }
  } while (cursor)

  console.log(`Done. Deleted ${totalDeleted} blob(s). Storage quota should free up shortly.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
