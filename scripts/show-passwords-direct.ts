import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

/**
 * Script to show password hashes directly from PostgreSQL database
 * IMPORTANT: These are HASHED passwords - they CANNOT be converted back to the original password!
 */
async function showPasswordsDirect() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.POSTGRES_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('\n=== Users with Password Hashes (Direct Database Query) ===\n')

    const result = await client.query(`
      SELECT id, email, name, role, department, created_at, hash, salt
      FROM users
      ORDER BY created_at ASC
    `)

    console.log(`Total users: ${result.rows.length}\n`)

    if (result.rows.length === 0) {
      console.log('No users found in the database.')
      return
    }

    result.rows.forEach((user: any, index: number) => {
      console.log(`User ${index + 1}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Name: ${user.name || 'N/A'}`)
      console.log(`  Role: ${user.role || 'N/A'}`)
      console.log(`  Department: ${user.department || 'N/A'}`)
      console.log(`  Created: ${user.created_at}`)
      
      if (user.hash) {
        console.log(`  Password Hash: ${user.hash}`)
        console.log(`  Salt: ${user.salt || 'N/A'}`)
        console.log(`  ⚠️  CRITICAL: This is a ONE-WAY hash!`)
        console.log(`     Even with this hash, you CANNOT get the original password.`)
        console.log(`     This is by design for security - passwords are never stored in plain text.`)
      } else {
        console.log(`  Password Hash: [Not found - user may not have a password set]`)
      }
      console.log('')
    })

    console.log('\n=== Why Passwords Cannot Be Retrieved ===')
    console.log('1. Passwords are hashed using bcrypt (one-way encryption)')
    console.log('2. Hash functions are IRREVERSIBLE - you cannot "decrypt" them')
    console.log('3. When you login, Payload hashes your input and compares it to the stored hash')
    console.log('4. This protects users even if the database is compromised')
    console.log('\n=== Example ===')
    console.log('If your password was "mypassword123", it becomes something like:')
    console.log('$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
    console.log('There is NO way to convert that hash back to "mypassword123"')
    console.log('\n=== To Reset a Password ===')
    console.log('Option 1: Use "Forgot Password" in /admin/login')
    console.log('Option 2: I can create a script to reset a password to a temporary value')
    console.log('Option 3: Create a new user with a known password\n')
  } catch (error) {
    console.error('Error fetching users:', error)
    process.exit(1)
  } finally {
    await client.end()
  }

  process.exit(0)
}

showPasswordsDirect()
