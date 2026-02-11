import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

/**
 * Script to generate realistic dummy attendance data for all staff users
 * Generates data for the last 3 months with realistic patterns:
 * - Present days (most common)
 * - Late arrivals (occasional, especially Mondays)
 * - Absent days (rare, occasional)
 * - Half days (occasional)
 * - Consecutive late days (penalty scenario)
 * - Realistic check-in/check-out times
 */

interface AttendanceDay {
  date: Date
  status: 'present' | 'late' | 'absent' | 'half-day'
  timeIn: Date | null
  timeOut: Date | null
  workingHours: number
}

// Realistic work hours: Default 9 AM to 6 PM (9 hours) - will be overridden by work settings
let WORK_START_HOUR = 9
let WORK_START_MINUTE = 0
let WORK_END_HOUR = 18
let WORK_END_MINUTE = 0
const FULL_WORKING_HOURS = 9
const HALF_WORKING_HOURS = 4.5

// Generate realistic attendance for a user
function generateAttendanceForUser(
  userId: number,
  startDate: Date,
  endDate: Date,
  workStartTime: Date,
  workEndTime: Date,
  saturdayWorking: boolean,
): AttendanceDay[] {
  const attendance: AttendanceDay[] = []
  const currentDate = new Date(startDate)

  let consecutiveLateCount = 0
  let lastStatus: 'present' | 'late' | 'absent' | 'half-day' | null = null

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()

    // Skip Sundays (non-working) and optionally Saturdays
    if (dayOfWeek === 0 || (dayOfWeek === 6 && !saturdayWorking)) {
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }

    // Determine status based on realistic patterns
    let status: 'present' | 'late' | 'absent' | 'half-day'
    let timeIn: Date | null = null
    let timeOut: Date | null = null
    let workingHours = 0

    // Monday pattern: Higher chance of being late
    const isMonday = dayOfWeek === 1
    const random = Math.random()

    // Absent: 5% chance (rare)
    if (random < 0.05) {
      status = 'absent'
      // No timeIn/timeOut for absent
    }
    // Half day: 8% chance
    else if (random < 0.13) {
      status = 'half-day'
      // Half day: arrive on time or slightly late, leave early
      const checkInTime = new Date(currentDate)
      checkInTime.setHours(
        WORK_START_HOUR + (Math.random() < 0.3 ? Math.floor(Math.random() * 30) : 0),
        Math.floor(Math.random() * 60),
        0,
      )
      timeIn = checkInTime

      // Leave after ~4.5-5 hours
      const checkOutTime = new Date(checkInTime)
      checkOutTime.setHours(
        checkInTime.getHours() + 4,
        checkInTime.getMinutes() + Math.floor(Math.random() * 60) + 30,
        0,
      )
      timeOut = checkOutTime
      workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
    }
    // Late: 15% chance (higher on Mondays: 25%)
    else if (random < (isMonday ? 0.38 : 0.28)) {
      // Check for consecutive late days
      if (lastStatus === 'late' || lastStatus === 'half-day') {
        consecutiveLateCount++
        // If 2+ consecutive late days, mark as half-day penalty
        if (consecutiveLateCount >= 2) {
          status = 'half-day'
          // Late arrival, early departure
          const checkInTime = new Date(currentDate)
          checkInTime.setHours(
            WORK_START_HOUR + Math.floor(Math.random() * 2) + 1, // 10-11 AM
            Math.floor(Math.random() * 60),
            0,
          )
          timeIn = checkInTime

          const checkOutTime = new Date(checkInTime)
          checkOutTime.setHours(
            checkInTime.getHours() + 4,
            checkInTime.getMinutes() + Math.floor(Math.random() * 60) + 30,
            0,
          )
          timeOut = checkOutTime
          workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
        } else {
          status = 'late'
          // Late arrival but full day
          const checkInTime = new Date(currentDate)
          checkInTime.setHours(
            WORK_START_HOUR + Math.floor(Math.random() * 2) + 1, // 10-11 AM
            Math.floor(Math.random() * 60),
            0,
          )
          timeIn = checkInTime

          const checkOutTime = new Date(checkInTime)
          checkOutTime.setHours(
            WORK_END_HOUR + Math.floor(Math.random() * 2), // 6-7 PM
            Math.floor(Math.random() * 60),
            0,
          )
          timeOut = checkOutTime
          workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
        }
      } else {
        status = 'late'
        consecutiveLateCount = 1
        // Late arrival but full day
        const checkInTime = new Date(currentDate)
        checkInTime.setHours(
          WORK_START_HOUR + Math.floor(Math.random() * 2) + 1, // 10-11 AM
          Math.floor(Math.random() * 60),
          0,
        )
        timeIn = checkInTime

        const checkOutTime = new Date(checkInTime)
        checkOutTime.setHours(
          WORK_END_HOUR + Math.floor(Math.random() * 2), // 6-7 PM
          Math.floor(Math.random() * 60),
          0,
        )
        timeOut = checkOutTime
        workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
      }
    }
    // Present: Most common (72-77%)
    else {
      status = 'present'
      consecutiveLateCount = 0

      // On-time or slightly early arrival
      const checkInTime = new Date(currentDate)
      const arrivalOffset =
        Math.random() < 0.7 ? -Math.floor(Math.random() * 30) : Math.floor(Math.random() * 15)
      checkInTime.setHours(WORK_START_HOUR, WORK_START_MINUTE + arrivalOffset, 0)
      timeIn = checkInTime

      // Normal departure (6 PM ± 30 min)
      const checkOutTime = new Date(checkInTime)
      const departureOffset = Math.floor(Math.random() * 60) - 30
      checkOutTime.setHours(WORK_END_HOUR, WORK_END_MINUTE + departureOffset, 0)
      timeOut = checkOutTime
      workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
    }

    // Ensure working hours are realistic
    if (status === 'present' || status === 'late') {
      // Ensure at least 8.5 hours for full day
      if (workingHours < 8.5 && timeIn && timeOut) {
        const adjustedOut = new Date(timeIn)
        adjustedOut.setHours(timeIn.getHours() + 9)
        timeOut = adjustedOut
        workingHours = 9
      }
    } else if (status === 'half-day') {
      // Ensure 4.5-5 hours for half day
      if (workingHours < 4.5 && timeIn && timeOut) {
        const adjustedOut = new Date(timeIn)
        adjustedOut.setHours(timeIn.getHours() + 4, timeIn.getMinutes() + 30)
        timeOut = adjustedOut
        workingHours = 4.5
      } else if (workingHours > 5.5 && timeIn && timeOut) {
        const adjustedOut = new Date(timeIn)
        adjustedOut.setHours(timeIn.getHours() + 5)
        timeOut = adjustedOut
        workingHours = 5
      }
    }

    attendance.push({
      date: new Date(currentDate),
      status,
      timeIn,
      timeOut,
      workingHours,
    })

    lastStatus = status
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return attendance
}

async function seedAttendanceData() {
  try {
    console.log('🚀 Starting attendance data generation...\n')

    let payload
    try {
      payload = await getPayload({ config: await configPromise })
    } catch (error: any) {
      // If schema push fails due to duplicate media filenames, try to fix it
      if (
        error.message?.includes('media_filename_idx') ||
        error.cause?.code === '23505' ||
        error.query?.includes('media_filename_idx')
      ) {
        console.log(
          '⚠️  Database schema issue detected. Attempting to fix duplicate media filenames...\n',
        )

        // Import and run SQL-based fix script
        const childProcess = await import('child_process')
        const { execSync } = childProcess
        try {
          execSync('npx tsx scripts/fix-duplicate-media-sql.ts', { stdio: 'inherit' })
          console.log('\n✅ Fixed duplicate filenames. Retrying Payload initialization...\n')
          payload = await getPayload({ config: await configPromise })
        } catch (fixError) {
          console.error('\n❌ Could not fix duplicate filenames automatically.')
          console.error('   Please run: npm run fix-media-duplicates')
          console.error('   Then try again.\n')
          throw error
        }
      } else {
        throw error
      }
    }

    // Get work settings
    const workSettings = await payload.findGlobal({
      slug: 'work-settings',
    })

    if (!workSettings?.workStartTime || !workSettings?.workEndTime) {
      console.error('❌ Work settings not found. Please configure work start/end times first.')
      process.exit(1)
    }

    // Parse work times
    const workStartTime = new Date(workSettings.workStartTime)
    const workEndTime = new Date(workSettings.workEndTime)
    const saturdayWorking = workSettings.saturdayWorkingDay || false

    // Extract hours and minutes from work times
    WORK_START_HOUR = workStartTime.getHours()
    WORK_START_MINUTE = workStartTime.getMinutes()
    WORK_END_HOUR = workEndTime.getHours()
    WORK_END_MINUTE = workEndTime.getMinutes()

    // Get all staff users
    const usersResult = await payload.find({
      collection: 'users',
      where: {
        role: { equals: 'staff' },
      },
      limit: 1000,
      overrideAccess: true,
    })

    if (usersResult.docs.length === 0) {
      console.log('⚠️  No staff users found. Please create staff users first.')
      return
    }

    console.log(`📋 Found ${usersResult.docs.length} staff users\n`)

    // Calculate date range: last 3 months
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 1) // Yesterday
    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 3) // 3 months ago

    console.log(
      `📅 Generating data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`,
    )

    let totalCreated = 0
    let totalSkipped = 0

    // Process each user
    for (const user of usersResult.docs) {
      console.log(`👤 Processing ${user.name || user.email} (ID: ${user.id})...`)

      const attendanceDays = generateAttendanceForUser(
        user.id as number,
        startDate,
        endDate,
        workStartTime,
        workEndTime,
        saturdayWorking,
      )

      // Fetch existing attendance records for this user to check consecutive late days
      const existingRecords = await payload.find({
        collection: 'attendance',
        where: {
          user: { equals: user.id },
        },
        limit: 1000,
        overrideAccess: true,
      })

      // Create a map of existing dates for quick lookup
      const existingDates = new Set(
        existingRecords.docs.map((r: any) => {
          const d =
            typeof r.date === 'string'
              ? r.date.split('T')[0]
              : new Date(r.date).toISOString().split('T')[0]
          return d
        }),
      )

      // Create a map of date -> status for checking consecutive late days
      const dateToStatus = new Map<string, string>()
      existingRecords.docs.forEach((r: any) => {
        const d =
          typeof r.date === 'string'
            ? r.date.split('T')[0]
            : new Date(r.date).toISOString().split('T')[0]
        dateToStatus.set(d, r.status)
      })

      let userCreated = 0
      let userSkipped = 0

      // Create attendance records
      for (const day of attendanceDays) {
        try {
          // Check if record already exists
          const dateStr = day.date.toISOString().split('T')[0]
          if (existingDates.has(dateStr)) {
            userSkipped++
            continue
          }

          // Determine final status based on working hours and check-in time
          let finalStatus = day.status
          if (day.timeIn && day.timeOut) {
            // Check if late (check-in after work start time)
            const checkInTime = new Date(day.timeIn)
            const workStart = new Date(day.date)
            workStart.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0)

            const isLate = checkInTime > workStart

            if (day.workingHours < HALF_WORKING_HOURS) {
              finalStatus = 'absent'
            } else if (day.workingHours < FULL_WORKING_HOURS) {
              finalStatus = 'half-day'
            } else if (isLate) {
              // Check for consecutive late days
              const prevDate = new Date(day.date)
              prevDate.setDate(prevDate.getDate() - 1)
              const prevDateStr = prevDate.toISOString().split('T')[0]

              const prevStatus = dateToStatus.get(prevDateStr)

              // If previous day was late/half-day, mark current as half-day (consecutive late penalty)
              if (prevStatus === 'late' || prevStatus === 'half-day') {
                finalStatus = 'half-day'
              } else {
                finalStatus = 'late'
              }
            } else {
              finalStatus = 'present'
            }
          } else if (day.status === 'absent') {
            // For absent days, set a timeOut to end of day
            const endOfDay = new Date(day.date)
            endOfDay.setHours(23, 59, 59, 999)
            day.timeOut = endOfDay
          }

          // Create the record
          const createdRecord = await payload.create({
            collection: 'attendance',
            data: {
              user: user.id,
              date: dateStr,
              timeIn: day.timeIn ? day.timeIn.toISOString() : null,
              timeOut: day.timeOut ? day.timeOut.toISOString() : null,
              status: finalStatus,
              location: {
                latitude: 28.6139 + (Math.random() - 0.5) * 0.01, // Around Delhi/NCR
                longitude: 77.209 + (Math.random() - 0.5) * 0.01,
                address: 'Office Location',
              },
            },
            overrideAccess: true,
          })

          // Update the maps for next iteration
          existingDates.add(dateStr)
          dateToStatus.set(dateStr, finalStatus)

          userCreated++
        } catch (error: any) {
          console.error(
            `  ⚠️  Error creating record for ${day.date.toLocaleDateString()}: ${error.message}`,
          )
          userSkipped++
        }
      }

      console.log(`  ✅ Created: ${userCreated}, Skipped: ${userSkipped}`)
      totalCreated += userCreated
      totalSkipped += userSkipped
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary:')
    console.log(`  Total Records Created: ${totalCreated}`)
    console.log(`  Total Records Skipped: ${totalSkipped}`)
    console.log(`  Users Processed: ${usersResult.docs.length}`)
    console.log('='.repeat(50))
    console.log('\n✅ Attendance data generation completed!\n')
  } catch (error: any) {
    console.error('❌ Error generating attendance data:', error)
    process.exit(1)
  }
}

// Run the script
seedAttendanceData()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
