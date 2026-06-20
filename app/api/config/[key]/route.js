import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

export async function GET(request, { params }) {
  try {
    const DB = getDB()
    if (!DB) return Response.json(null, { status: 503 })
    const { key } = await params
    const row = await DB.prepare('SELECT value FROM config WHERE key=?').bind(key).first()
    if (!row) return Response.json(null)
    return Response.json(JSON.parse(row.value))
  } catch {
    return Response.json(null, { status: 503 })
  }
}

export async function POST(request, { params }) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const { key } = await params
    const value = await request.json()
    await DB.prepare(`
      INSERT INTO config (key, value) VALUES (?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
    `).bind(key, JSON.stringify(value)).run()
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
