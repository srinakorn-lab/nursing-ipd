import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

// GET /api/beds — latest bed-availability snapshot per ward
export async function GET() {
  try {
    const DB = getDB()
    if (!DB) return Response.json({}, { status: 503 })
    const { results } = await DB.prepare(`
      SELECT b.* FROM bed_availability_log b
      JOIN (
        SELECT ward_id, MAX(saved_at) AS m
        FROM bed_availability_log GROUP BY ward_id
      ) lt ON b.ward_id = lt.ward_id AND b.saved_at = lt.m
    `).all()
    const data = {}
    results.forEach(r => { data[r.ward_id] = r })
    return Response.json(data)
  } catch {
    return Response.json({}, { status: 503 })
  }
}

// DELETE /api/beds          → clear ALL bed-availability records
// DELETE /api/beds?ward=W5A  → clear records for one ward
// DELETE /api/beds?id=123    → delete a single record
export async function DELETE(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const url = new URL(request.url)
    const id   = url.searchParams.get('id')
    const ward = url.searchParams.get('ward')
    if (id) {
      const r = await DB.prepare('DELETE FROM bed_availability_log WHERE id=?').bind(+id).run()
      return Response.json({ ok: true, deleted: r.meta?.changes ?? 0 })
    }
    if (ward) {
      const r = await DB.prepare('DELETE FROM bed_availability_log WHERE ward_id=?').bind(ward).run()
      return Response.json({ ok: true, deleted: r.meta?.changes ?? 0 })
    }
    const r = await DB.prepare('DELETE FROM bed_availability_log').run()
    return Response.json({ ok: true, deleted: r.meta?.changes ?? 0 })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 503 })
  }
}

// POST /api/beds — append new snapshot
export async function POST(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const e = await request.json()
    const deviceId = request.headers.get('x-device-id') || 'unknown'
    await DB.prepare(`
      INSERT INTO bed_availability_log
        (ward_id, single_free, male_free, female_free, monitor_male, monitor_female, remark, device_id)
      VALUES (?,?,?,?,?,?,?,?)
    `).bind(
      e.wardId,
      e.single_free|0, e.male_free|0, e.female_free|0,
      e.monitor_male|0, e.monitor_female|0,
      e.remark || '', deviceId
    ).run()
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 503 })
  }
}
