import { TechnicalDashboard } from '@/components/technical-dashboard'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TechnicalDashboardPage() {
  const payload = await getPayload({ config: await configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user || user.role !== 'technical') {
    redirect('/technical/login')
  }

  // Fetch assigned tasks with relationships populated
  const tasks = await payload.find({
    collection: 'tasks',
    where: {
      assignedTo: { equals: user.id },
    },
    sort: '-createdAt',
    limit: 100,
    depth: 2, // Populate relationships including comment authors
  })

  return <TechnicalDashboard user={user} tasks={tasks.docs} />
}
