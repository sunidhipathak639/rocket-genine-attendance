import { NextRequest, NextResponse } from 'next/server'
import { getPayload, APIError } from 'payload'
import configPromise from '@payload-config'

const THEME_VALUES = ['light', 'dark', 'auto'] as const
const TIME_FORMAT_VALUES = ['12h', '24h'] as const

/**
 * PATCH: Update user preferences (timeFormat, theme). Uses userId from body when provided.
 * Body: { userId?: number, timeFormat?: '12h' | '24h', theme?: 'light' | 'dark' | 'auto' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayload({ config: await configPromise })
    const body = await request.json()
    const userIdFromBody = body?.userId
    const timeFormat = body?.timeFormat
    const theme = body?.theme

    let userId: number
    if (userIdFromBody != null && !Number.isNaN(Number(userIdFromBody))) {
      userId =
        typeof userIdFromBody === 'number' ? userIdFromBody : parseInt(String(userIdFromBody), 10)
    } else {
      const { user } = await payload.auth({ headers: request.headers })
      if (!user) {
        return NextResponse.json({ message: 'userId is required in body' }, { status: 400 })
      }
      userId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10)
    }

    const data: { timeFormat?: '12h' | '24h'; theme?: 'light' | 'dark' | 'auto' } = {}
    if (timeFormat != null && TIME_FORMAT_VALUES.includes(timeFormat)) {
      data.timeFormat = timeFormat
    }
    if (theme != null && THEME_VALUES.includes(theme)) {
      data.theme = theme
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Provide at least one of timeFormat or theme' },
        { status: 400 },
      )
    }

    const doc = await payload.update({
      collection: 'users',
      id: userId,
      data,
      overrideAccess: true,
    })

    return NextResponse.json({ doc })
  } catch (error) {
    console.error('User settings update error:', error)
    if (error instanceof APIError) {
      return NextResponse.json(
        { message: error.message, errors: (error as any).errors },
        { status: error.status },
      )
    }
    return NextResponse.json({ message: 'Failed to update settings' }, { status: 500 })
  }
}
