import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

// GET /api/beds/history?ward=W5A&limit=100 — audit log per ward
export async function GET(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json([], { status: 503 })
    const url = new URL(request.url)
    const ward = url.searchParams.get('ward')
    const limit = Math.min(+(url.searchParams.get('limit') || 200), 1000)
    let sql = 'SELECT * FROM bed_availability_log'
    const binds = []
    if (ward) { sql += ' WHERE ward_id=?'; binds.push(ward) }
    sql += ' ORDER BY saved_at DESC LIMIT ?'
    binds.push(limit)
    const { results } = await DB.prepare(sql).bind(...binds).all()
    return Response.json(results)
  } catch {
    return Response.json([], { status: 503 })
  }
}
