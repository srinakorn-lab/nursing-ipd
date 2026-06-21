import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

// GET /api/log?year=2569&month=6&day=21 — daily history
// GET /api/log?year=2569&month=6           — monthly history
// GET /api/log?year=2569                   — yearly history
// Returns: rows sorted by saved_at DESC
export async function GET(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json([], { status: 503 })
    const url = new URL(request.url)
    const year  = url.searchParams.get('year')
    const month = url.searchParams.get('month')
    const day   = url.searchParams.get('day')
    const ward  = url.searchParams.get('ward')

    if (!year) return Response.json({ error: 'year required' }, { status: 400 })

    let sql = 'SELECT * FROM entries_log WHERE year=?'
    const binds = [+year]
    if (month) { sql += ' AND month=?'; binds.push(+month) }
    if (day)   { sql += ' AND day=?';   binds.push(+day) }
    if (ward)  { sql += ' AND ward_id=?'; binds.push(ward) }
    sql += ' ORDER BY saved_at DESC LIMIT 5000'

    const { results } = await DB.prepare(sql).bind(...binds).all()
    return Response.json(results)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 503 })
  }
}
