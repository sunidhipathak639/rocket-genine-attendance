import type { CollectionConfig } from 'payload'
import { sendEmail } from '@/lib/email'
import { getMeetingRequestEmail, getMeetingScheduledEmail } from '@/lib/email-templates'

export const MeetingRequests: CollectionConfig = {
  slug: 'meeting-requests',
  admin: {
    useAsTitle: 'topic',
    defaultColumns: ['staff', 'technicalStaff', 'topic', 'status', 'scheduledDate', 'createdAt'],
    group: 'Support',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      // Staff can read their own requests
      // Technical staff can read requests assigned to them
      // Admins can read all requests
      if (user.role === 'admin') return true
      if (user.role === 'technical') {
        return {
          technicalStaff: { equals: user.id },
        }
      }
      if (user.role === 'staff') {
        return {
          staff: { equals: user.id },
        }
      }
      return false
    },
    create: ({ req: { user } }) => {
      // Staff can create meeting requests
      return user?.role === 'staff' || Boolean(user)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      // Technical staff can update requests assigned to them
      // Admins can update all requests
      if (user.role === 'admin') return true
      if (user.role === 'technical') {
        return {
          technicalStaff: { equals: user.id },
        }
      }
      return false
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'staff',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Staff member requesting the meeting',
      },
    },
    {
      name: 'technicalStaff',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        description: 'Technical Staff member assigned to handle this request',
      },
    },
    {
      name: 'topic',
      type: 'text',
      required: true,
      admin: {
        description: 'Meeting topic or reason',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Additional details about the meeting request',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'pending',
      required: true,
    },
    {
      name: 'scheduledDate',
      type: 'date',
      admin: {
        description: 'Scheduled meeting date and time',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'meetingLink',
      type: 'text',
      admin: {
        description: 'Meeting link (Zoom, Google Meet, etc.)',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Additional notes from technical staff',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req, previousDoc }) => {
        try {
          if (operation === 'create') {
            // Get staff member
            const staffMember = await req.payload.findByID({
              collection: 'users',
              id: typeof doc.staff === 'object' ? doc.staff.id : doc.staff,
            })

            // Find technical staff with least workload (open/pending meeting requests)
            const technicalStaffList = await req.payload.find({
              collection: 'users',
              where: { role: { equals: 'technical' } },
              limit: 100,
            })

            let assignedTechnicalStaff = null
            let minWorkload = Infinity

            for (const techStaff of technicalStaffList.docs) {
              const workload = await req.payload.find({
                collection: 'meeting-requests',
                where: {
                  and: [
                    { technicalStaff: { equals: techStaff.id } },
                    {
                      or: [{ status: { equals: 'pending' } }, { status: { equals: 'scheduled' } }],
                    },
                  ],
                },
                limit: 1000,
              })

              if (workload.totalDocs < minWorkload) {
                minWorkload = workload.totalDocs
                assignedTechnicalStaff = techStaff
              }
            }

            // Assign to technical staff with least workload
            if (assignedTechnicalStaff) {
              await req.payload.update({
                collection: 'meeting-requests',
                id: doc.id,
                data: {
                  technicalStaff: assignedTechnicalStaff.id,
                },
                req,
              })

              // Notify assigned technical staff
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: assignedTechnicalStaff.id,
                  title: 'New Meeting Request',
                  message: `Staff member ${(staffMember as any)?.name || 'Staff'} requested a meeting: "${doc.topic}"`,
                  type: 'meeting',
                  read: false,
                },
                req,
              })

              // Send email to technical staff
              if ((assignedTechnicalStaff as any).email) {
                try {
                  await sendEmail({
                    to: (assignedTechnicalStaff as any).email,
                    subject: `📅 New Meeting Request: ${doc.topic}`,
                    html: getMeetingRequestEmail({
                      topic: doc.topic,
                      description: doc.description || '',
                      staffName: (staffMember as any)?.name || 'Staff Member',
                      staffEmail: (staffMember as any)?.email || '',
                      requestId: doc.id,
                    }),
                  })
                } catch (emailError) {
                  console.error('Error sending meeting request email:', emailError)
                }
              }
            }

            // Notify all admins
            const admins = await req.payload.find({
              collection: 'users',
              where: { role: { equals: 'admin' } },
              limit: 1000,
            })

            for (const admin of admins.docs) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: admin.id,
                  title: 'New Meeting Request',
                  message: `Staff member ${(staffMember as any)?.name || 'Staff'} requested a meeting: "${doc.topic}"`,
                  type: 'meeting',
                  read: false,
                },
                req,
              })
            }
          } else if (operation === 'update' && previousDoc) {
            // Handle status change to scheduled
            if (doc.status === 'scheduled' && previousDoc.status !== 'scheduled') {
              // Get staff member
              const staffMember = await req.payload.findByID({
                collection: 'users',
                id: typeof doc.staff === 'object' ? doc.staff.id : doc.staff,
              })

              // Get technical staff
              const technicalStaff = await req.payload.findByID({
                collection: 'users',
                id:
                  typeof doc.technicalStaff === 'object'
                    ? doc.technicalStaff.id
                    : doc.technicalStaff,
              })

              // Send email to staff member with meeting details
              if (
                staffMember &&
                (staffMember as any).email &&
                doc.scheduledDate &&
                doc.meetingLink
              ) {
                try {
                  await sendEmail({
                    to: (staffMember as any).email,
                    subject: `📅 Meeting Scheduled: ${doc.topic}`,
                    html: getMeetingScheduledEmail({
                      topic: doc.topic,
                      scheduledDate: doc.scheduledDate,
                      meetingLink: doc.meetingLink,
                      staffName: (staffMember as any).name || 'Staff Member',
                      technicalStaffName: (technicalStaff as any)?.name || 'Technical Staff',
                      notes: doc.notes || '',
                    }),
                  })
                } catch (emailError) {
                  console.error('Error sending meeting scheduled email:', emailError)
                }
              }

              // Notify staff member
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: doc.staff,
                  title: 'Meeting Scheduled',
                  message: `Your meeting "${doc.topic}" has been scheduled`,
                  type: 'meeting',
                  read: false,
                },
                req,
              })

              // Notify technical staff
              if (doc.technicalStaff) {
                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    user: doc.technicalStaff,
                    title: 'Meeting Scheduled',
                    message: `Meeting "${doc.topic}" has been scheduled`,
                    type: 'meeting',
                    read: false,
                  },
                  req,
                })
              }

              // Notify all admins
              const admins = await req.payload.find({
                collection: 'users',
                where: { role: { equals: 'admin' } },
                limit: 1000,
              })

              for (const admin of admins.docs) {
                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    user: admin.id,
                    title: 'Meeting Scheduled',
                    message: `Meeting "${doc.topic}" has been scheduled`,
                    type: 'meeting',
                    read: false,
                  },
                  req,
                })
              }
            }
          }
        } catch (error) {
          console.error('Error in meeting request hooks:', error)
          // Don't throw - notifications are not critical
        }
      },
    ],
  },
  timestamps: true,
}
