import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

export async function GET() {
  try {
    const DB = getDB()
    if (!DB) return Response.json({}, { status: 503 })
    const { results } = await DB.prepare('SELECT * FROM oos').all()
    const data = {}
    results.forEach(r => { data[r.ward_id] = { count: r.count, remark: r.remark } })
    return Response.json(data)
  } catch {
    return Response.json({}, { status: 503 })
  }
}

export async function POST(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const data = await request.json()
    await Promise.all(Object.entries(data).map(([wardId, d]) =>
      DB.prepare(`
        INSERT INTO oos (ward_id, count, remark) VALUES (?,?,?)
        ON CONFLICT(ward_id) DO UPDATE SET count=excluded.count, remark=excluded.remark, updated_at=datetime('now')
      `).bind(wardId, d.count||0, d.remark||'').run()
    ))
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
