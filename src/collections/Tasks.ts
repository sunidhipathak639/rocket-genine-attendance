import type { CollectionConfig } from 'payload'
import { sendEmail } from '@/lib/email'
import {
  getTaskAssignedEmail,
  getTaskStatusUpdatedEmail,
  getTaskCreatedConfirmationEmail,
} from '@/lib/email-templates'

export const Tasks: CollectionConfig = {
  slug: 'tasks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'assignedTo', 'createdBy', 'createdAt'],
  },
  access: {
    create: ({ req: { user } }) => {
      // Staff can create tasks, admins can create tasks
      return Boolean(user)
    },
    read: ({ req: { user } }) => {
      if (!user) return false
      // Staff can read their own tasks
      // Technical staff can read assigned tasks
      // Admins can read all tasks
      if (user.role === 'admin') return true
      if (user.role === 'technical') {
        const where: { assignedTo: { equals: number | string } } = {
          assignedTo: { equals: user.id },
        }
        return where
      }
      if (user.role === 'staff') {
        const where: { createdBy: { equals: number | string } } = {
          createdBy: { equals: user.id },
        }
        return where
      }
      return false
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      // Technical staff can update assigned tasks
      // Admins can update all tasks
      if (user.role === 'admin') return true
      if (user.role === 'technical') {
        return {
          assignedTo: { equals: user.id },
        }
      }
      return false
    },
    delete: ({ req: { user } }) => {
      // Only admins can delete tasks
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Brief title describing the issue',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Detailed description of the issue',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'open',
      required: true,
      admin: {
        description: 'Current status of the task',
      },
    },
    {
      name: 'priority',
      type: 'select',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' },
      ],
      defaultValue: 'medium',
      required: true,
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Technical Staff member assigned to this task',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Staff member who created this task',
      },
    },
    {
      name: 'attachments',
      type: 'array',
      fields: [
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
      admin: {
        description: 'Supporting files (images or documents, max 3MB each)',
      },
    },
    {
      name: 'comments',
      type: 'array',
      fields: [
        {
          name: 'comment',
          type: 'textarea',
          required: true,
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: false,
          admin: {
            description: 'User who wrote the comment (optional - allows anonymous comments)',
          },
        },
        {
          name: 'createdAt',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
      admin: {
        description: 'Comments and updates on this task',
      },
    },
    {
      name: 'auditLog',
      type: 'array',
      fields: [
        {
          name: 'action',
          type: 'text',
          required: true,
        },
        {
          name: 'performedBy',
          type: 'relationship',
          relationTo: 'users',
          required: false,
          admin: {
            description: 'User who performed this action (auto-populated)',
          },
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'details',
          type: 'textarea',
        },
      ],
      admin: {
        description: 'Audit log of all actions performed on this task',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        // Add audit log entry
        if (operation === 'create') {
          if (!data.auditLog) {
            data.auditLog = []
          }
          // Use createdBy if req.user is not available (e.g., when creating via API with email)
          const performedBy = req.user?.id || data.createdBy
          if (performedBy) {
            data.auditLog.push({
              action: 'Task Created',
              performedBy: typeof performedBy === 'object' ? performedBy.id : performedBy,
              timestamp: new Date().toISOString(),
              details: `Task "${data.title}" was created`,
            })
          }
        } else if (operation === 'update' && originalDoc) {
          if (!data.auditLog) {
            data.auditLog = originalDoc.auditLog || []
          }

          // Use req.user?.id if available, otherwise skip audit log entry
          const performedBy = req.user?.id
          if (!performedBy) {
            return data // Skip audit logging if no user context
          }

          // Log status changes
          if (data.status && data.status !== originalDoc.status) {
            data.auditLog.push({
              action: `Status Changed: ${originalDoc.status} → ${data.status}`,
              performedBy: performedBy,
              timestamp: new Date().toISOString(),
              details: `Task status updated from ${originalDoc.status} to ${data.status}`,
            })
          }

          // Log assignment changes
          if (data.assignedTo && String(data.assignedTo) !== String(originalDoc.assignedTo)) {
            data.auditLog.push({
              action: 'Task Reassigned',
              performedBy: performedBy,
              timestamp: new Date().toISOString(),
              details: `Task reassigned to different Technical Staff member`,
            })
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req, previousDoc }) => {
        // Send notifications for task events
        try {
          if (operation === 'create') {
            // Get assigned Technical Staff member
            const assignedUser = await req.payload.findByID({
              collection: 'users',
              id: typeof doc.assignedTo === 'object' ? doc.assignedTo.id : doc.assignedTo,
            })

            // Get creator (staff member)
            const creator = await req.payload.findByID({
              collection: 'users',
              id: typeof doc.createdBy === 'object' ? doc.createdBy.id : doc.createdBy,
            })

            // Notify assigned Technical Staff
            await req.payload.create({
              collection: 'notifications',
              data: {
                user: doc.assignedTo,
                title: 'New Task Assigned',
                message: `You have been assigned a new task: "${doc.title}"`,
                type: 'task_assigned',
                relatedTask: doc.id,
                read: false,
              },
              req,
            })

            // Send email to Technical Staff
            if (assignedUser && (assignedUser as any).email) {
              try {
                await sendEmail({
                  to: (assignedUser as any).email,
                  subject: `🔧 New Task Assigned: ${doc.title}`,
                  html: getTaskAssignedEmail({
                    taskTitle: doc.title,
                    taskDescription: doc.description || '',
                    createdBy: (creator as any)?.name || 'Staff Member',
                    taskId: doc.id,
                    technicalStaffName: (assignedUser as any).name || 'Technical Staff',
                  }),
                })
              } catch (emailError) {
                console.error('Error sending task assignment email:', emailError)
              }
            }

            // Send confirmation email to staff member who created the issue
            if (creator && (creator as any).email) {
              try {
                await sendEmail({
                  to: (creator as any).email,
                  subject: `✅ Issue Reported: ${doc.title}`,
                  html: getTaskCreatedConfirmationEmail({
                    taskTitle: doc.title,
                    taskDescription: doc.description || '',
                    staffName: (creator as any).name || 'Staff Member',
                  }),
                })
              } catch (emailError) {
                console.error('Error sending task confirmation email:', emailError)
              }
            }

            // Notify admin
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
                  title: 'New Task Created',
                  message: `A new task "${doc.title}" has been created`,
                  type: 'task_created',
                  relatedTask: doc.id,
                  read: false,
                },
                req,
              })
            }
          } else if (operation === 'update' && previousDoc) {
            // Notify on status change
            if (doc.status !== previousDoc.status) {
              // Get creator (staff member)
              const creator = await req.payload.findByID({
                collection: 'users',
                id: typeof doc.createdBy === 'object' ? doc.createdBy.id : doc.createdBy,
              })

              // Get Technical Staff who updated
              const updater = await req.payload.findByID({
                collection: 'users',
                id: req.user?.id || doc.assignedTo,
              })

              // Get latest comment if any
              const latestComment =
                Array.isArray(doc.comments) && doc.comments.length > 0
                  ? doc.comments[doc.comments.length - 1]
                  : null

              // Notify creator (staff)
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: doc.createdBy,
                  title: 'Task Status Updated',
                  message: `Task "${doc.title}" status changed to ${doc.status}`,
                  type: 'task_status_changed',
                  relatedTask: doc.id,
                  read: false,
                },
                req,
              })

              // Send email to creator (staff)
              if (creator && (creator as any).email) {
                try {
                  await sendEmail({
                    to: (creator as any).email,
                    subject: `📋 Task Status Updated: ${doc.title}`,
                    html: getTaskStatusUpdatedEmail({
                      taskTitle: doc.title,
                      newStatus: doc.status,
                      staffName: (creator as any).name || 'Staff Member',
                      technicalStaffName: (updater as any)?.name || 'Technical Staff',
                      comment:
                        latestComment && typeof latestComment === 'object'
                          ? latestComment.comment
                          : undefined,
                    }),
                  })
                } catch (emailError) {
                  console.error('Error sending task status email:', emailError)
                }
              }

              // Notify admin
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
                    title: 'Task Status Updated',
                    message: `Task "${doc.title}" status changed to ${doc.status}`,
                    type: 'task_status_changed',
                    relatedTask: doc.id,
                    read: false,
                  },
                  req,
                })
              }
            }

            // Notify on reassignment
            if (String(doc.assignedTo) !== String(previousDoc.assignedTo)) {
              // Notify new assignee
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: doc.assignedTo,
                  title: 'Task Reassigned to You',
                  message: `Task "${doc.title}" has been reassigned to you`,
                  type: 'task_reassigned',
                  relatedTask: doc.id,
                  read: false,
                },
                req,
              })

              // Notify previous assignee
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: previousDoc.assignedTo,
                  title: 'Task Reassigned',
                  message: `Task "${doc.title}" has been reassigned to another Technical Staff member`,
                  type: 'task_reassigned',
                  relatedTask: doc.id,
                  read: false,
                },
                req,
              })
            }
          }
        } catch (error) {
          console.error('Error creating notifications:', error)
          // Don't throw - notifications are not critical
        }
      },
    ],
  },
  timestamps: true,
}
