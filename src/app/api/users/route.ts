/**
 * /api/users — thin pass-through to Payload's REST layer.
 *
 * Next.js static routes take priority over the (payload)/api/[...slug] catch-all,
 * so we forward every method to Payload directly here, using overrideAccess:true.
 *
 * GET  – custom: supports ?role= and ?limit= filters
 * POST / PATCH / DELETE – forwarded to Payload with full query-string support
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPayload, type Where } from 'payload'
import configPromise from '@payload-config'

async function getPayloadInstance() {
  return getPayload({ config: await configPromise })
}

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayloadInstance()
    const sp = request.nextUrl.searchParams
    const role = sp.get('role')
    const limit = Math.min(parseInt(sp.get('limit') || '100', 10), 1000)
    const where: Record<string, unknown> = {}
    if (role) where.role = { equals: role }

    const result = await payload.find({
      collection: 'users',
      where: Object.keys(where).length > 0 ? (where as Where) : undefined,
      limit,
      sort: 'createdAt',
      depth: 1,
      overrideAccess: true,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// ── POST (create) ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadInstance()

    // Payload admin sends multipart/form-data; parse with formData()
    // Falls back to JSON for programmatic callers.
    const ct = request.headers.get('content-type') ?? ''
    let data: Record<string, unknown> = {}

    if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData()
      form.forEach((value, key) => {
        // Payload uses _payload as the JSON payload field in multipart forms
        if (key === '_payload' && typeof value === 'string') {
          try {
            Object.assign(data, JSON.parse(value))
          } catch {
            // ignore
          }
        } else {
          data[key] = value
        }
      })
    } else {
      data = (await request.json()) as Record<string, unknown>
    }

    const created = await payload.create({
      collection: 'users',
      data: data as any,
      overrideAccess: true,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    console.error('Users create error:', err)
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// ── PATCH (update) ───────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayloadInstance()
    const sp = request.nextUrl.searchParams

    const ct = request.headers.get('content-type') ?? ''
    let data: Record<string, unknown> = {}

    if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData()
      form.forEach((value, key) => {
        if (key === '_payload' && typeof value === 'string') {
          try {
            Object.assign(data, JSON.parse(value))
          } catch {
            /* ignore */
          }
        } else {
          data[key] = value
        }
      })
    } else {
      data = (await request.json()) as Record<string, unknown>
    }

    // Single update by doc ID in body or in ?id= param
    const docId = (data.id as string | number | undefined) ?? sp.get('id') ?? undefined
    if (docId) {
      const updated = await payload.update({
        collection: 'users',
        id: docId as string | number,
        data: data as any,
        overrideAccess: true,
      })
      return NextResponse.json(updated)
    }

    // Bulk update by ?where= (JSON-encoded)
    const whereParam = sp.get('where')
    const where: Where | undefined = whereParam ? JSON.parse(whereParam) : undefined
    if (!where) {
      return NextResponse.json({ message: 'Missing id or where param' }, { status: 400 })
    }

    const updated = await payload.update({
      collection: 'users',
      where,
      data: data as any,
      overrideAccess: true,
    })
    return NextResponse.json(updated)
  } catch (err: unknown) {
    console.error('Users update error:', err)
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayloadInstance()
    const sp = request.nextUrl.searchParams

    // Single delete: ?id=45
    const id = sp.get('id')
    if (id) {
      const deleted = await payload.delete({ collection: 'users', id, overrideAccess: true })
      return NextResponse.json(deleted)
    }

    // Bulk delete: ?where[and][0][id][in][0]=45  (Payload bracket notation)
    const rawWhere: Record<string, unknown> = {}
    sp.forEach((value, key) => {
      const parts = key.replace(/\[/g, '.').replace(/\]/g, '').split('.')
      let obj: Record<string, unknown> = rawWhere
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        const next = parts[i + 1]
        if (obj[part] === undefined) obj[part] = isNaN(Number(next)) ? {} : []
        obj = obj[part] as Record<string, unknown>
      }
      const last = parts[parts.length - 1]
      const cur = obj[last]
      if (Array.isArray(cur)) cur.push(value)
      else obj[last] = value
    })

    const where = rawWhere.where
    if (!where) {
      return NextResponse.json({ message: 'No id or where clause provided.' }, { status: 400 })
    }

    const deleted = await payload.delete({
      collection: 'users',
      where: where as Where,
      overrideAccess: true,
    })
    return NextResponse.json(deleted)
  } catch (err: unknown) {
    console.error('Users delete error:', err)
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
