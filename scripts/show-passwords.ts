import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

/**
 * Script to show password hashes from the database
 * IMPORTANT: These are HASHED passwords - they CANNOT be converted back to the original password!
 * This is one-way encryption for security.
 */
async function showPasswords() {
  try {
    const payload = await getPayload({ config: await configPromise })

    // Query users with all fields including password hash
    // Note: We need to use the Local API with overrideAccess to see sensitive fields
    const users = await payload.find({
      collection: 'users',
      limit: 100,
      sort: 'createdAt',
      overrideAccess: true,
      // Try to select all fields including hash
      depth: 0,
    })

    console.log('\n=== Users with Password Hashes ===\n')
    console.log(`Total users: ${users.totalDocs}\n`)

    if (users.docs.length === 0) {
      console.log('No users found in the database.')
      return
    }

    users.docs.forEach((user: any, index: number) => {
      console.log(`User ${index + 1}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Name: ${user.name || 'N/A'}`)
      console.log(`  Role: ${user.role || 'N/A'}`)
      console.log(`  Department: ${user.department || 'N/A'}`)
      console.log(`  Created: ${user.createdAt}`)
      
      if (user.hash) {
        console.log(`  Password Hash: ${user.hash}`)
        console.log(`  Salt: ${user.salt || 'N/A'}`)
        console.log(`  ⚠️  CRITICAL: This is a ONE-WAY hash!`)
        console.log(`     Even with this hash, you CANNOT get the original password.`)
        console.log(`     This is by design for security - passwords are never stored in plain text.`)
      } else {
        console.log(`  Password Hash: [Not found]`)
      }
      console.log('')
    })

    console.log('\n=== Why Passwords Cannot Be Retrieved ===')
    console.log('1. Passwords are hashed using bcrypt (one-way encryption)')
    console.log('2. Hash functions are irreversible - you cannot "decrypt" them')
    console.log('3. When you login, Payload hashes your input and compares it to the stored hash')
    console.log('4. This protects users even if the database is compromised')
    console.log('\n=== To Reset a Password ===')
    console.log('Option 1: Use "Forgot Password" in /admin/login')
    console.log('Option 2: I can create a script to reset a password to a temporary value')
    console.log('Option 3: Create a new user with a known password\n')
  } catch (error) {
    console.error('Error fetching users:', error)
    process.exit(1)
  }

  process.exit(0)
}

showPasswords()
