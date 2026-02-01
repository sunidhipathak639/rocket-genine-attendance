import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

const STAFF_PASSWORD = 'User1@#'

// 20 Indian Names
const INDIAN_NAMES = [
  { first: 'Aarav', last: 'Sharma' },
  { first: 'Vivaan', last: 'Patel' },
  { first: 'Aditya', last: 'Kumar' },
  { first: 'Vihaan', last: 'Verma' },
  { first: 'Arjun', last: 'Singh' },
  { first: 'Sai', last: 'Reddy' },
  { first: 'Reyansh', last: 'Nair' },
  { first: 'Ayaan', last: 'Mehta' },
  { first: 'Krishna', last: 'Iyer' },
  { first: 'Ishaan', last: 'Bhatt' },
  { first: 'Diya', last: 'Malhotra' },
  { first: 'Ananya', last: 'Joshi' },
  { first: 'Aadhya', last: 'Desai' },
  { first: 'Pari', last: 'Chopra' },
  { first: 'Saanvi', last: 'Khanna' },
  { first: 'Myra', last: 'Saxena' },
  { first: 'Kiara', last: 'Kapoor' },
  { first: 'Riya', last: 'Jain' },
  { first: 'Anika', last: 'Agarwal' },
  { first: 'Navya', last: 'Rao' },
]

function emailFromName(first: string, last: string): string {
  // removing spaces and converting to lowercase for the email
  return `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com`
}

/** Random monthly salary (INR) between 30k and 90k, rounded to nearest 1000 */
function randomSalary(): number {
  // 30,000 + (0 to 60,000)
  const raw = 30_000 + Math.random() * 60_000
  return Math.round(raw / 1000) * 1000
}

async function seedIndianUsers() {
  try {
    const payload = await getPayload({ config: await configPromise })

    console.log('\n=== Seeding 20 Indian staff users ===\n')
    console.log(`Password for all: ${STAFF_PASSWORD}\n`)

    for (let i = 0; i < INDIAN_NAMES.length; i++) {
      const { first, last } = INDIAN_NAMES[i]
      const name = `${first} ${last}`
      const email = emailFromName(first, last)

      const existing = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        console.log(`Skip (exists): ${email} - ${name}`)
        continue
      }

      const salary = randomSalary()

      await payload.create({
        collection: 'users',
        data: {
          email,
          password: STAFF_PASSWORD,
          name,
          role: 'staff',
          // Assign random departments
          department: [
            'Engineering',
            'HR',
            'Operations',
            'Sales',
            'Support',
            'Marketing',
            'Finance',
          ][i % 7],
          salary,
        },
        overrideAccess: true,
      })

      console.log(`Created: ${email} - ${name} (salary: ₹${salary.toLocaleString()})`)
    }

    console.log('\n=== Done ===\n')
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

seedIndianUsers()
