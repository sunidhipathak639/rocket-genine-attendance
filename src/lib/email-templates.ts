/**
 * Modern Email Templates for Rocket Genie
 * Blue & White Theme with Interactive Design
 */

const ROCKET_GENIE_LOGO = 'https://www.rocketgenie.co.in/img/logo.png'
const COMPANY_NAME = 'Rocket Genie'
const PRIMARY_COLOR = '#3b82f6' // Blue
const SECONDARY_COLOR = '#1e40af' // Dark Blue
const ACCENT_COLOR = '#60a5fa' // Light Blue

/**
 * Base email template with modern design
 */
function getEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${COMPANY_NAME}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .email-header {
          background: linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${SECONDARY_COLOR} 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .logo-container {
          background: white;
          width: 120px;
          height: 120px;
          margin: 0 auto 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .logo {
          max-width: 90px;
          max-height: 90px;
        }
        .company-name {
          color: #ffffff;
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .email-body {
          padding: 40px 30px;
        }
        .content-section {
          margin-bottom: 30px;
        }
        h1 {
          color: ${SECONDARY_COLOR};
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        h2 {
          color: ${PRIMARY_COLOR};
          font-size: 18px;
          font-weight: 600;
          margin: 25px 0 15px;
        }
        p {
          color: #4b5563;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 15px;
        }
        .info-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-left: 4px solid ${PRIMARY_COLOR};
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .info-row {
          display: flex;
          padding: 10px 0;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: ${SECONDARY_COLOR};
          min-width: 140px;
          font-size: 14px;
        }
        .info-value {
          color: #1f2937;
          font-size: 14px;
          flex: 1;
        }
        .summary-box {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${SECONDARY_COLOR} 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin: 20px 0;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          transition: all 0.3s ease;
        }
        .button:hover {
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
          transform: translateY(-2px);
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin: 5px 0;
        }
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .status-approved {
          background: #d1fae5;
          color: #065f46;
        }
        .status-rejected {
          background: #fee2e2;
          color: #991b1b;
        }
        .email-footer {
          background: #f9fafb;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.6;
        }
        .footer-links {
          margin-top: 15px;
        }
        .footer-link {
          color: ${PRIMARY_COLOR};
          text-decoration: none;
          margin: 0 10px;
          font-size: 13px;
          font-weight: 500;
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent);
          margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
          .email-body {
            padding: 30px 20px;
          }
          .email-header {
            padding: 30px 20px;
          }
          .company-name {
            font-size: 24px;
          }
          h1 {
            font-size: 20px;
          }
          .info-row {
            flex-direction: column;
          }
          .info-label {
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <div class="logo-container">
            <img src="${ROCKET_GENIE_LOGO}" alt="${COMPANY_NAME}" class="logo" />
          </div>
          <h1 class="company-name">${COMPANY_NAME}</h1>
        </div>
        <div class="email-body">
          ${content}
        </div>
        <div class="email-footer">
          <p class="footer-text">
            © ${new Date().getFullYear()} ${COMPANY_NAME} Intelligence Systems. All rights reserved.<br>
            This is an automated message from your attendance management system.
          </p>
          <div class="footer-links">
            <a href="${process.env.NEXT_PUBLIC_SERVER_URL}" class="footer-link">Dashboard</a>
            <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/admin" class="footer-link">Admin Panel</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Leave Request Email Template
 */
export function getLeaveRequestEmail({
  employeeName,
  employeeEmail,
  leaveType,
  startDate,
  endDate,
  reason,
  leaveId,
}: {
  employeeName: string
  employeeEmail: string
  leaveType: string
  startDate: string
  endDate: string
  reason?: string
  leaveId: string | number
}): string {
  const content = `
    <h1>🏖️ New Leave Request Received</h1>
    <p>A new leave request has been submitted and requires your review.</p>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Employee Name:</span>
        <span class="info-value">${employeeName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${employeeEmail}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Leave Type:</span>
        <span class="info-value"><strong>${leaveType.replace('_', ' ').toUpperCase()}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Start Date:</span>
        <span class="info-value">${startDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">End Date:</span>
        <span class="info-value">${endDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value"><span class="status-badge status-pending">Pending Review</span></span>
      </div>
    </div>

    ${
      reason
        ? `
      <h2>Reason for Leave</h2>
      <div class="summary-box">${reason}</div>
    `
        : '<p><em>No reason provided.</em></p>'
    }

    <div class="divider"></div>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/admin/collections/leaves/${leaveId}" class="button">
        Review Leave Request →
      </a>
    </p>

    <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 20px;">
      Please review and approve/reject this request at your earliest convenience.
    </p>
  `

  return getEmailTemplate(content)
}

/**
 * Work Summary Email Template
 */
export function getWorkSummaryEmail({
  employeeName,
  employeeEmail,
  date,
  checkInTime,
  checkOutTime,
  workSummary,
  activeDuration,
  inactiveDuration,
}: {
  employeeName: string
  employeeEmail: string
  date: string
  checkInTime: string
  checkOutTime: string
  workSummary?: string
  activeDuration?: number
  inactiveDuration?: number
}): string {
  const totalMinutes = (activeDuration || 0) + (inactiveDuration || 0)
  const activePercentage =
    totalMinutes > 0 ? Math.round(((activeDuration || 0) / totalMinutes) * 100) : 0

  const content = `
    <h1>📊 Daily Work Summary</h1>
    <p>End-of-day work summary for <strong>${employeeName}</strong></p>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Employee:</span>
        <span class="info-value">${employeeName} (${employeeEmail})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${date}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-in Time:</span>
        <span class="info-value">${checkInTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Check-out Time:</span>
        <span class="info-value">${checkOutTime}</span>
      </div>
      ${
        activeDuration !== undefined
          ? `
        <div class="info-row">
          <span class="info-label">Active Duration:</span>
          <span class="info-value">${Math.round(activeDuration / 60)} hours ${activeDuration % 60} minutes (${activePercentage}%)</span>
        </div>
      `
          : ''
      }
    </div>

    <h2>Work Summary</h2>
    <div class="summary-box">${workSummary || 'No summary provided.'}</div>

    <div class="divider"></div>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/admin" class="button">
        View Full Dashboard →
      </a>
    </p>

    <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 20px;">
      This summary was automatically generated when the employee checked out.
    </p>
  `

  return getEmailTemplate(content)
}

/**
 * Leave Status Update Email Template (for employees)
 */
export function getLeaveStatusEmail({
  employeeName,
  leaveType,
  startDate,
  endDate,
  status,
  adminNotes,
}: {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  status: 'approved' | 'rejected'
  adminNotes?: string
}): string {
  const statusClass = status === 'approved' ? 'status-approved' : 'status-rejected'
  const statusIcon = status === 'approved' ? '✅' : '❌'
  const statusText = status === 'approved' ? 'Approved' : 'Rejected'

  const content = `
    <h1>${statusIcon} Leave Request ${statusText}</h1>
    <p>Hello ${employeeName},</p>
    <p>Your leave request has been <strong>${status}</strong>.</p>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Leave Type:</span>
        <span class="info-value">${leaveType.replace('_', ' ').toUpperCase()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Start Date:</span>
        <span class="info-value">${startDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">End Date:</span>
        <span class="info-value">${endDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value"><span class="status-badge ${statusClass}">${statusText.toUpperCase()}</span></span>
      </div>
    </div>

    ${
      adminNotes
        ? `
      <h2>Admin Notes</h2>
      <div class="summary-box">${adminNotes}</div>
    `
        : ''
    }

    <div class="divider"></div>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/leaves" class="button">
        View My Leaves →
      </a>
    </p>

    <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 20px;">
      ${
        status === 'approved'
          ? 'Enjoy your time off! Please ensure all pending work is completed before your leave.'
          : 'If you have any questions about this decision, please contact your manager.'
      }
    </p>
  `

  return getEmailTemplate(content)
}
