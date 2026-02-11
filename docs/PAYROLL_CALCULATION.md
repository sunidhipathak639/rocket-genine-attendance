# Payroll Calculation System - Documentation

## Overview

The payroll calculation system has been redesigned with clean, modular, and production-ready code that follows realistic business logic. The system supports both paid and unpaid leave configurations and handles edge cases properly.

## Key Features

1. **Realistic Absent Days Calculation**: Absent days are calculated using the formula: `Total Days - (Present Days + Leave Days)`
2. **Configurable Paid/Unpaid Leave**: Support for both paid and unpaid leave (configured in Work Settings)
3. **Penalty Deductions**: Half-day penalties are properly deducted from payable days
4. **Validation**: Comprehensive input validation with clear error messages
5. **Currency Precision**: All amounts rounded to 2 decimal places
6. **Modular Design**: Clean, reusable utility functions

## Architecture

### Core Module: `src/lib/payroll-calculator.ts`

This module contains all payroll calculation logic:

- **`calculatePayroll()`**: Main function that orchestrates the entire calculation
- **`calculateAbsentDays()`**: Calculates absent days from total, present, and leave days
- **`calculatePayableDays()`**: Calculates payable days based on paid/unpaid leave setting
- **`calculateDailySalary()`**: Calculates daily salary rate
- **`validatePayrollInput()`**: Validates all inputs before calculation
- **`roundToTwoDecimals()`**: Utility for currency precision

### Configuration: Work Settings

The `leavesArePaid` checkbox in Work Settings controls whether leaves are paid:
- **Checked (true)**: Leaves are paid → included in salary calculation
- **Unchecked (false)**: Leaves are unpaid → deducted from salary

## Calculation Logic

### Step 1: Calculate Absent Days

```
Absent Days = Total Days - (Present Days + Leave Days)
```

**Example:**
- Total Days: 31
- Present Days: 25
- Leave Days: 3
- **Absent Days: 31 - (25 + 3) = 3**

### Step 2: Calculate Daily Salary

```
Daily Salary = Base Monthly Salary / Total Days in Month
```

**Example:**
- Base Salary: ₹50,000
- Total Days in Month: 31
- **Daily Salary: 50,000 / 31 = ₹1,612.90**

### Step 3: Calculate Payable Days

**If Leaves are Paid:**
```
Payable Days = (Present Days + Leave Days) - Penalty Deductions
```

**If Leaves are Unpaid:**
```
Payable Days = Present Days - Penalty Deductions
```

**Penalty Deductions:**
```
Penalty Deduction Days = Half-Day Penalties × 0.5
```

**Example (Paid Leaves):**
- Present Days: 25
- Leave Days: 3
- Half-Day Penalties: 1
- **Payable Days: (25 + 3) - 0.5 = 27.5**

**Example (Unpaid Leaves):**
- Present Days: 25
- Leave Days: 3 (not counted)
- Half-Day Penalties: 1
- **Payable Days: 25 - 0.5 = 24.5**

### Step 4: Calculate Deductions

**Absent Deduction:**
```
Absent Deduction = Absent Days × Daily Salary
```

**Penalty Deduction:**
```
Penalty Deduction = (Half-Day Penalties × 0.5) × Daily Salary
```

**Leave Deduction (only if unpaid):**
```
Leave Deduction = Leave Days × Daily Salary (if leaves are unpaid)
Leave Deduction = 0 (if leaves are paid)
```

### Step 5: Calculate Final Salary

```
Final Salary = Payable Days × Daily Salary
```

All amounts are rounded to 2 decimal places.

## Examples

### Example 1: Full Month with Paid Leaves

**Input:**
- Base Salary: ₹50,000
- Total Days: 31
- Present Days: 25
- Leave Days: 3
- Half-Day Penalties: 1
- Leaves are Paid: Yes

**Calculation:**
1. Absent Days: 31 - (25 + 3) = **3**
2. Daily Salary: 50,000 / 31 = **₹1,612.90**
3. Payable Days: (25 + 3) - 0.5 = **27.5**
4. Absent Deduction: 3 × 1,612.90 = **₹4,838.70**
5. Penalty Deduction: 0.5 × 1,612.90 = **₹806.45**
6. Leave Deduction: **₹0** (leaves are paid)
7. Final Salary: 27.5 × 1,612.90 = **₹43,354.75**

### Example 2: Full Month with Unpaid Leaves

**Input:**
- Base Salary: ₹50,000
- Total Days: 31
- Present Days: 25
- Leave Days: 3
- Half-Day Penalties: 1
- Leaves are Paid: No

**Calculation:**
1. Absent Days: 31 - (25 + 3) = **3**
2. Daily Salary: 50,000 / 31 = **₹1,612.90**
3. Payable Days: 25 - 0.5 = **24.5**
4. Absent Deduction: 3 × 1,612.90 = **₹4,838.70**
5. Penalty Deduction: 0.5 × 1,612.90 = **₹806.45**
6. Leave Deduction: 3 × 1,612.90 = **₹4,838.70**
7. Final Salary: 24.5 × 1,612.90 = **₹39,516.05**

### Example 3: Partial Period (1 Week)

**Input:**
- Base Salary: ₹50,000
- Total Days in Period: 7
- Total Days in Month: 31
- Present Days: 5
- Leave Days: 0
- Half-Day Penalties: 0
- Leaves are Paid: Yes

**Calculation:**
1. Absent Days: 7 - (5 + 0) = **2**
2. Daily Salary: 50,000 / 31 = **₹1,612.90**
3. Payable Days: (5 + 0) - 0 = **5**
4. Absent Deduction: 2 × 1,612.90 = **₹3,225.80**
5. Penalty Deduction: **₹0**
6. Leave Deduction: **₹0**
7. Final Salary: 5 × 1,612.90 = **₹8,064.50**

## Validation Rules

The system validates all inputs before calculation:

1. **Base Salary**: Must be greater than 0
2. **Total Days**: Must be greater than 0
3. **Total Days in Month**: Must be greater than 0
4. **Present Days**: Cannot be negative
5. **Leave Days**: Cannot be negative
6. **Half-Day Penalties**: Cannot be negative
7. **Present + Leave Days**: Cannot exceed Total Days

**Error Example:**
```
Present days (26) + Leave days (6) cannot exceed total days (31)
```

## Edge Cases Handled

1. **Zero Present Days**: System handles cases where employee was absent for entire period
2. **Zero Leave Days**: Works correctly when no leaves were taken
3. **Negative Values**: Prevented by validation
4. **Overflow**: Present + Leave cannot exceed Total Days
5. **Partial Periods**: Daily salary always based on full month, payable days based on period
6. **Rounding**: All currency amounts rounded to 2 decimal places

## Usage

### In Payload Collection Hook

The `Payroll` collection automatically uses the calculator:

```typescript
import { calculatePayroll } from '@/lib/payroll-calculator'

const payrollResult = calculatePayroll({
  baseSalary: 50000,
  totalDays: 31,
  totalDaysInMonth: 31,
  presentDays: 25,
  leaveDays: 3,
  halfDayPenalties: 1,
  leavesArePaid: true,
})

// Access results
const { finalSalary, payableDays, absentDays } = payrollResult
```

### Direct Usage

```typescript
import {
  calculatePayroll,
  calculateAbsentDays,
  calculatePayableDays,
  calculateDailySalary,
} from '@/lib/payroll-calculator'

// Calculate individual components
const absentDays = calculateAbsentDays(31, 25, 3) // Returns 3
const dailySalary = calculateDailySalary(50000, 31) // Returns 1612.90
const payableDays = calculatePayableDays(25, 3, 1, true) // Returns 27.5
```

## Configuration

### Setting Paid/Unpaid Leave

1. Go to **Payload Admin** → **Globals** → **Work Settings**
2. Check/uncheck **"Leaves are Paid"** checkbox
3. Save settings
4. All future payroll calculations will use this setting

## Testing

The module includes example functions for testing:

```typescript
import { PayrollCalculatorExamples } from '@/lib/payroll-calculator'

// Run examples
const example1 = PayrollCalculatorExamples.example1()
const example2 = PayrollCalculatorExamples.example2()
const example3 = PayrollCalculatorExamples.example3()
```

## Migration Notes

### Changes from Previous System

1. **Absent Days Calculation**: Now calculated from formula instead of counting attendance records
2. **Paid/Unpaid Leave**: New configurable setting (previously all leaves were unpaid)
3. **Validation**: Added comprehensive input validation
4. **Modularity**: Logic extracted to reusable utility functions
5. **Precision**: All amounts rounded to 2 decimal places

### Backward Compatibility

- Existing payroll records remain unchanged
- New calculations use the updated logic
- Work Settings default: Leaves are unpaid (matches previous behavior)

## Troubleshooting

### Common Issues

1. **"Present days + Leave days cannot exceed total days"**
   - Check attendance records and leave records for the period
   - Ensure no duplicate entries

2. **"Base salary must be greater than 0"**
   - Verify user has a salary set in their profile

3. **Unexpected deductions**
   - Check Work Settings for paid/unpaid leave configuration
   - Verify half-day penalty count

## Support

For issues or questions about payroll calculations, refer to:
- `src/lib/payroll-calculator.ts` - Core calculation logic
- `src/collections/Payroll.ts` - Payload collection hook
- `src/globals/WorkSettings.ts` - Configuration settings
