# Rocket Genie – Project Overview

**For presentations and non-technical readers**

---

## What is Rocket Genie?

**Rocket Genie** is an **attendance and workforce management system** for companies. It helps:

- **Employees (Staff)** to mark their daily check-in and check-out, apply for leave, view holidays and salary summary, and get reminders.
- **Managers (Admin)** to see who is present, approve or reject leave, set company rules, manage payroll, and receive email alerts.

Everything is in one place: a simple app for staff and a control panel for admins.

---

## Two Types of Users

### 👤 Staff (Employees)

**Login and dashboard**

- Log in to the **main app** (employee dashboard).
- See greeting, today’s date, and quick links (My Calendar, Apply Leave).

**Check-in**

- **Check in** when they start work.
- Optional **photo/selfie** for proof of attendance.
- Optional **face verification** (live check that a real face is present).
- Optional **location** (captured automatically or manually).
- Only one check-in per day; not allowed on holidays (see rules below).

**Check-out and daily report**

- **Check out** when they finish work.
- Can fill a **daily shift report**:
  - Work summary (what they did).
  - Accomplishments (key wins).
  - Challenges (blockers).
  - Tasks planned for tomorrow.
  - Mood (e.g. productive, good, challenging, exhausting, blocked).
  - Attachments (e.g. PDFs, screenshots).
- Optional **location** at check-out.
- Admin and employee receive an email with this summary.

**Shift and salary**

- **Shift status:** Shows work start and end time, and how much of the shift has passed (e.g. circular progress).
- **Estimated salary:** For the current month, based on working days and payable days (after approved leave). Shown in INR.

**Leave**

- **Apply for leave:** Choose date range, type (full day, half day, paid, unpaid), and reason.
- **View leave status:** See list of own requests as Pending, Approved, or Rejected.
- Calendar view to see leave and attendance together.

**Holidays and history**

- **Holidays:** Calendar of company and public holidays (name, date, type, description).
- **History:** View own attendance and calendar over time.

**Profile**

- Update **name**, **profile photo**, **time format** (12-hour or 24-hour), and **theme** (light, dark, or auto).

**Notifications**

- Bell icon shows **notifications** (e.g. meeting link, announcements). Only their own; can mark as read. Clicking can open a link (e.g. meeting URL).

**“Are you still working?” popup**

- While **checked in** (and not yet checked out), if there is no activity for a set number of minutes (e.g. 10), a popup asks: “Are you still working?” Staff can confirm or ignore; the system records this for the day. Duration is set by admin in Work Settings.

Staff **cannot** open the backend admin panel. They only use the employee dashboard.

---

### 👔 Admin (Managers / HR)

**Two places Admin works**

1. **Backend admin panel** – Full control: employees, attendance, leave, holidays, payroll, notifications, meetings, work settings, media.
2. **Frontend dashboard** (main app when logged in as admin) – Quick view: KPIs, charts, today’s attendance table, pending leaves, upcoming holidays, and shortcuts to the backend.

**Backend admin panel – what Admin can do**

- **Employees (Users):** Add or edit employees. Set name, email, role (admin/staff), salary (INR), department, profile photo. **Generate payroll** for a person for a given month from the employee edit screen.
- **Attendance:** See all check-in/check-out records. View status (present, late, absent, half-day), **photo/selfie**, **location**, work summary, accomplishments, challenges, mood, attachments. See activity logs (e.g. “Are you still working?” responses).
- **Leaves:** See all leave requests. **Approve** or **Reject** with optional notes. **Resend leave email** to the employee (e.g. after approval) from the leave record.
- **Holidays:** Add company and public holidays. Set name, date, type (public / company / optional), description, and icon.
- **Payroll:** Create payroll for an employee for a month (e.g. Jan 2026). System auto-calculates working days, present days, leave, deductions, and final amount (INR). Mark as **Pending** or **Paid**.
- **Notifications:** Create notifications for staff (e.g. meeting or general). Add title, body, and optional link. Staff see only their own.
- **Meetings:** Create a meeting (topic, meeting link, date, participants). **Send meeting email** to participants from the meeting record.
- **Media:** Upload and manage images (e.g. profile photos, holiday icons, attachments).
- **Work Settings (global):** Set Saturday as working day or not, work start time, work end time, admin notification email(s), and “Are you still working?” interval in minutes.

**Backend dashboard (first screen in admin panel)**

- Total number of employees.
- Today’s total attendance count.
- **Live Indian clock (IST)** with date.
- Button to **open the frontend dashboard** in the main app.

**Frontend admin dashboard (main app when admin)**

- **Numbers:** Total employees, present today, late, absent, pending (not checked in), and live Indian clock (IST).
- **Charts:** Weekly attendance trend (last 7 days); department-wise employee distribution.
- **Quick actions:** Open backend admin, Manage employees, Work Settings.
- **Pending leave requests:** List with link to approve/reject in backend.
- **Upcoming holidays:** Next holidays with dates and types.
- **Today’s attendance table:** All employees with search and filter (All / Present / Late / Absent / Pending). Shows check-in time, check-out time, status. Link to full attendance in backend.

**Emails Admin receives**

- When someone **checks in** (and to the employee).
- When someone **applies for leave**.
- When a leave is **approved or rejected** (to employee and admin).
- When someone **checks out with a work summary** (and to the employee).

**When Admin deletes an employee**

- That person’s **attendance**, **leaves**, and **payroll** records are also removed so data stays consistent.

---

## Work Settings (Company Rules)

The admin sets these once in the backend; they apply to everyone:

| Setting | What it means |
|--------|----------------|
| **Saturday is a working day** | Yes/No. Affects working days, leave, and payroll. |
| **Work start time** | e.g. 9:00 AM – used to decide if someone is “late”. |
| **Work end time** | e.g. 6:00 PM – shown on staff dashboard. |
| **Admin notification email** | Email address(es) that get check-in, leave, and work-summary alerts. |
| **Activity check interval (minutes)** | After how many minutes of no activity the app asks: “Are you still working?” (e.g. 10). |

---

## Attendance Rules (For Staff)

1. **One check-in per day** – Staff can check in only once per day.
2. **No check-in on holidays** – On a company/public holiday, check-in is not allowed.
3. **Check-in time** – Allowed only from **1 hour before** work start time. Earlier is not allowed.
4. **Late** – If they check in **after** work start time, the day is marked **Late**.
5. **Two late days in a row** – If someone was late (or half-day) yesterday and is late again today, today is marked **Half-day**.
6. **Forgot to check out** – If they did not check out yesterday and check in today, the previous day is automatically marked **Absent**.
7. **Check-out and hours worked:**
   - Worked **less than 4.5 hours** → **Absent**
   - Worked **4.5 to 9 hours** → **Half-day**
   - Worked **9 or more hours** → **Present** (or Late, as the case may be)
8. **“Are you still working?” popup** – Only while checked in. After the set minutes of no activity, a popup appears. Staff can confirm they are working or ignore it; the system records this for the day.

---

## Leave Rules (For Staff)

1. **No past dates** – Leave can be requested only for **today or future** dates.
2. **No Sundays** – Leave cannot be requested for Sunday or for a range that includes Sunday.
3. **No holidays** – Leave cannot be requested for a date that is already a company/public holiday, or for a range that includes any holiday.
4. **No duplicate leave** – Staff cannot have two overlapping leave requests (pending or approved) for the same dates.
5. **Leave types** – Full day, half day, paid, unpaid (as configured).
6. **Approval** – Only admin can approve or reject; admin can add notes (e.g. reason for rejection).

---

## Payroll (For Admin)

- Admin creates **payroll** for an employee for a **month** (e.g. January 2026).
- The system **automatically**:
  - Counts **working days** in that month (Monday–Friday, and Saturday only if “Saturday is a working day” is on). Holidays are excluded.
  - Counts **days present** (including late and half-days; half-day counts as 0.5).
  - Subtracts **approved leave** and **half-day deductions** (from consecutive late days).
  - Calculates **payable days** and **final salary** (in INR).
- Admin can mark payment as **Pending** or **Paid**.

---

## Notifications

- **Staff** see only **their own** notifications (e.g. meeting link, announcement). They can mark them as read. Notifications can open a link (e.g. meeting URL).
- **Admin** can create and send notifications to selected staff. Types: **Meeting** (e.g. invite with link) or **General** (announcement).

---

## Holidays

- **Types:** Public holiday, Company holiday, Optional holiday.
- Admin adds name, date, type, description, and optional icon.
- Staff can only view; no check-in on these dates.

---

## Summary for PPT

- **Slide 1:** Rocket Genie = Attendance + Leave + Payroll + Notifications system.
- **Slide 2:** Two roles – **Staff** (check-in/out with optional photo and face check, daily report, leave, holidays, history, profile, notifications) and **Admin** (backend + frontend dashboard, employees, attendance, leave, holidays, payroll, meetings, notifications, work settings).
- **Slide 3:** **Work Settings** – Office time, Saturday working or not, who gets emails, “Are you still working?” interval.
- **Slide 4:** **Attendance rules** – One check-in per day, no holiday check-in, 1 hour before start, late = after start, 2 late days in a row = half-day, forgot checkout = absent, checkout hours (4.5 / 9) decide absent/half-day/present, activity popup while checked in.
- **Slide 5:** **Leave rules** – Today or future only, no Sunday, no holidays, no overlapping leave; types (full/half, paid/unpaid); admin approves with notes.
- **Slide 6:** **Payroll** – Per person per month; working days, present days, leave and half-day deductions auto-calculated; final amount in INR; Pending/Paid.
- **Slide 7:** **Admin extras** – Backend dashboard (total employees, today attendance, IST clock), frontend dashboard (KPIs, charts, pending leaves, today’s table), resend leave email, send meeting email, delete employee removes their data.

---

*This document is for explanation and presentations only. It does not include technical or coding details.*
