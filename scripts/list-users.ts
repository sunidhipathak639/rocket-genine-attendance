import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

/**
 * Script to list all users from the database
 * Note: Passwords are hashed and cannot be retrieved in plain text
 */
async function listUsers() {
  try {
    const payload = await getPayload({ config: await configPromise })

    const result = await payload.find({
      collection: 'users',
      limit: 100,
      sort: 'createdAt',
      // Override default field selection to include password hash (for demonstration only)
      overrideAccess: true, // Required to access sensitive fields
    })

    console.log('\n=== Users in Database ===\n')
    console.log(`Total users: ${result.totalDocs}\n`)

    if (result.docs.length === 0) {
      console.log('No users found in the database.')
      return
    }

    result.docs.forEach((user, index) => {
      console.log(`User ${index + 1}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Name: ${user.name || 'N/A'}`)
      console.log(`  Role: ${user.role || 'N/A'}`)
      console.log(`  Department: ${user.department || 'N/A'}`)
      console.log(`  Created: ${user.createdAt}`)
      
      // Show password hash (this is what's stored, but cannot be converted back to original password)
      const userAny = user as any
      if (userAny.hash) {
        console.log(`  Password Hash: ${userAny.hash.substring(0, 60)}...`)
        console.log(`  Salt: ${userAny.salt ? userAny.salt.substring(0, 30) + '...' : 'N/A'}`)
        console.log(`  ⚠️  WARNING: This hash CANNOT be converted back to the original password!`)
        console.log(`     It's a one-way encryption for security.`)
      } else {
        console.log(`  Password Hash: [Not available - Payload hides sensitive fields by default]`)
      }
      console.log('')
    })

    console.log('\n=== Note ===')
    console.log('Passwords are securely hashed and cannot be retrieved.')
    console.log('To reset a password, use the "Forgot Password" feature in the admin panel')
    console.log('or create a new user with a known password.\n')
  } catch (error) {
    console.error('Error fetching users:', error)
    process.exit(1)
  }

  process.exit(0)
}

listUsers()
