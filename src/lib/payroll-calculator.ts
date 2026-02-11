/**
 * Payroll Calculation Utility
 *
 * This module provides clean, modular functions for calculating payroll
 * based on realistic business logic.
 *
 * Key Concepts:
 * - Absent days are calculated as: Total Days - (Present Days + Leave Days)
 * - Supports both paid and unpaid leave (configurable)
 * - Penalties (half-days) are deducted from payable days
 * - All calculations are rounded to 2 decimal places for currency precision
 */

export interface PayrollCalculationInput {
  /** Base monthly salary in currency units */
  baseSalary: number
  /** Total days in the payroll period (including weekends and holidays) */
  totalDays: number
  /** Total days in the month (for daily salary calculation) */
  totalDaysInMonth: number
  /** Number of days present (including late arrivals) */
  presentDays: number
  /** Number of leave days taken */
  leaveDays: number
  /** Number of half-day penalties (each counts as 0.5 day deduction) */
  halfDayPenalties: number
  /** Whether leaves are paid (true) or unpaid (false) */
  leavesArePaid: boolean
}

export interface PayrollCalculationResult {
  /** Daily salary rate (base salary / total days in month) */
  dailySalary: number
  /** Calculated absent days (totalDays - presentDays - leaveDays) */
  absentDays: number
  /** Total payable days after all deductions */
  payableDays: number
  /** Deduction amount for absent days */
  absentDeduction: number
  /** Deduction amount for half-day penalties */
  penaltyDeduction: number
  /** Deduction amount for unpaid leaves (0 if leaves are paid) */
  leaveDeduction: number
  /** Final calculated salary amount */
  finalSalary: number
}

/**
 * Validates payroll calculation inputs
 *
 * @param input - Payroll calculation input parameters
 * @throws Error if validation fails
 */
export function validatePayrollInput(input: PayrollCalculationInput): void {
  const { baseSalary, totalDays, totalDaysInMonth, presentDays, leaveDays } = input

  // Validate base salary
  if (baseSalary <= 0) {
    throw new Error('Base salary must be greater than 0')
  }

  // Validate total days
  if (totalDays <= 0) {
    throw new Error('Total days must be greater than 0')
  }

  if (totalDaysInMonth <= 0) {
    throw new Error('Total days in month must be greater than 0')
  }

  // Validate present days
  if (presentDays < 0) {
    throw new Error('Present days cannot be negative')
  }

  // Validate leave days
  if (leaveDays < 0) {
    throw new Error('Leave days cannot be negative')
  }

  // Validate that present + leave does not exceed total days
  if (presentDays + leaveDays > totalDays) {
    throw new Error(
      `Present days (${presentDays}) + Leave days (${leaveDays}) cannot exceed total days (${totalDays})`,
    )
  }

  // Validate half-day penalties
  if (input.halfDayPenalties < 0) {
    throw new Error('Half-day penalties cannot be negative')
  }
}

/**
 * Calculates absent days based on total days, present days, and leave days
 *
 * Formula: Absent Days = Total Days - (Present Days + Leave Days)
 *
 * @param totalDays - Total days in the payroll period
 * @param presentDays - Number of days present
 * @param leaveDays - Number of leave days taken
 * @returns Calculated absent days (always >= 0)
 */
export function calculateAbsentDays(
  totalDays: number,
  presentDays: number,
  leaveDays: number,
): number {
  const absentDays = totalDays - (presentDays + leaveDays)
  return Math.max(0, absentDays)
}

/**
 * Calculates payable days based on attendance, leaves, and penalties
 *
 * Logic:
 * - If leaves are paid: Payable Days = Present Days + Leave Days - Penalties
 * - If leaves are unpaid: Payable Days = Present Days - Penalties
 *
 * @param presentDays - Number of days present
 * @param leaveDays - Number of leave days taken
 * @param halfDayPenalties - Number of half-day penalties
 * @param leavesArePaid - Whether leaves are paid
 * @returns Calculated payable days (always >= 0)
 */
export function calculatePayableDays(
  presentDays: number,
  leaveDays: number,
  halfDayPenalties: number,
  leavesArePaid: boolean,
): number {
  // Calculate base payable days
  const basePayableDays = leavesArePaid
    ? presentDays + leaveDays // Paid leaves: count both present and leave days
    : presentDays // Unpaid leaves: only count present days

  // Calculate penalty deduction (each half-day penalty = 0.5 day deduction)
  const penaltyDeductionDays = halfDayPenalties * 0.5

  // Subtract penalties from payable days
  const payableDays = basePayableDays - penaltyDeductionDays

  // Ensure payable days is never negative
  return Math.max(0, payableDays)
}

/**
 * Calculates daily salary rate
 *
 * Formula: Daily Salary = Base Monthly Salary / Total Days in Month
 *
 * @param baseSalary - Base monthly salary
 * @param totalDaysInMonth - Total days in the month
 * @returns Daily salary rate (rounded to 2 decimal places)
 */
export function calculateDailySalary(baseSalary: number, totalDaysInMonth: number): number {
  if (totalDaysInMonth <= 0) {
    return 0
  }
  const dailySalary = baseSalary / totalDaysInMonth
  return roundToTwoDecimals(dailySalary)
}

/**
 * Calculates all deductions and final salary
 *
 * @param input - Payroll calculation input parameters
 * @returns Complete payroll calculation result
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  // Validate inputs first
  validatePayrollInput(input)

  const {
    baseSalary,
    totalDays,
    totalDaysInMonth,
    presentDays,
    leaveDays,
    halfDayPenalties,
    leavesArePaid,
  } = input

  // Calculate daily salary
  const dailySalary = calculateDailySalary(baseSalary, totalDaysInMonth)

  // Calculate absent days
  const absentDays = calculateAbsentDays(totalDays, presentDays, leaveDays)

  // Calculate payable days
  const payableDays = calculatePayableDays(presentDays, leaveDays, halfDayPenalties, leavesArePaid)

  // Calculate deductions
  const absentDeduction = roundToTwoDecimals(absentDays * dailySalary)
  const penaltyDeductionDays = halfDayPenalties * 0.5
  const penaltyDeduction = roundToTwoDecimals(penaltyDeductionDays * dailySalary)

  // Leave deduction: only if leaves are unpaid
  const leaveDeduction = leavesArePaid
    ? 0 // Paid leaves: no deduction
    : roundToTwoDecimals(leaveDays * dailySalary) // Unpaid leaves: deduct full amount

  // Calculate final salary
  const finalSalary = roundToTwoDecimals(payableDays * dailySalary)

  return {
    dailySalary,
    absentDays,
    payableDays,
    absentDeduction,
    penaltyDeduction,
    leaveDeduction,
    finalSalary,
  }
}

/**
 * Rounds a number to 2 decimal places (for currency precision)
 *
 * @param value - Number to round
 * @returns Rounded number with 2 decimal places
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Example usage and test cases
 */
export const PayrollCalculatorExamples = {
  /**
   * Example 1: Full month with paid leaves
   * - Base Salary: ₹50,000
   * - Total Days: 31
   * - Present Days: 25
   * - Leave Days: 3
   * - Half-day Penalties: 1
   * - Leaves are paid: true
   */
  example1: () => {
    const result = calculatePayroll({
      baseSalary: 50000,
      totalDays: 31,
      totalDaysInMonth: 31,
      presentDays: 25,
      leaveDays: 3,
      halfDayPenalties: 1,
      leavesArePaid: true,
    })
    // Expected:
    // - Absent Days: 31 - (25 + 3) = 3
    // - Payable Days: (25 + 3) - 0.5 = 27.5
    // - Daily Salary: 50000 / 31 = 1612.90
    // - Final Salary: 27.5 × 1612.90 = 44354.75
    return result
  },

  /**
   * Example 2: Full month with unpaid leaves
   * - Base Salary: ₹50,000
   * - Total Days: 31
   * - Present Days: 25
   * - Leave Days: 3
   * - Half-day Penalties: 1
   * - Leaves are paid: false
   */
  example2: () => {
    const result = calculatePayroll({
      baseSalary: 50000,
      totalDays: 31,
      totalDaysInMonth: 31,
      presentDays: 25,
      leaveDays: 3,
      halfDayPenalties: 1,
      leavesArePaid: false,
    })
    // Expected:
    // - Absent Days: 31 - (25 + 3) = 3
    // - Payable Days: 25 - 0.5 = 24.5
    // - Daily Salary: 50000 / 31 = 1612.90
    // - Final Salary: 24.5 × 1612.90 = 39516.05
    return result
  },

  /**
   * Example 3: Partial period (1 week) with no leaves
   * - Base Salary: ₹50,000
   * - Total Days in Period: 7
   * - Total Days in Month: 31
   * - Present Days: 5
   * - Leave Days: 0
   * - Half-day Penalties: 0
   * - Leaves are paid: true
   */
  example3: () => {
    const result = calculatePayroll({
      baseSalary: 50000,
      totalDays: 7,
      totalDaysInMonth: 31,
      presentDays: 5,
      leaveDays: 0,
      halfDayPenalties: 0,
      leavesArePaid: true,
    })
    // Expected:
    // - Absent Days: 7 - (5 + 0) = 2
    // - Payable Days: 5 - 0 = 5
    // - Daily Salary: 50000 / 31 = 1612.90
    // - Final Salary: 5 × 1612.90 = 8064.50
    return result
  },
}
