import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

// GET /api/beds-map[?ward=W6A] — return beds grouped by ward
export async function GET(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({}, { status: 503 })
    const url = new URL(request.url)
    const ward = url.searchParams.get('ward')
    let sql = 'SELECT * FROM beds_map'
    const binds = []
    if (ward) { sql += ' WHERE ward_id=?'; binds.push(ward) }
    sql += ' ORDER BY ward_id, bed_no'
    const { results } = await DB.prepare(sql).bind(...binds).all()
    const data = {}
    results.forEach(r => {
      if (!data[r.ward_id]) data[r.ward_id] = {}
      data[r.ward_id][r.bed_no] = r
    })
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 503 })
  }
}

// POST /api/beds-map — upsert one bed (assign / discharge / clean / update)
// body: { wardId, bedNo, status, hn?, name?, sex?, level?, admitted_at?, remark?, action? }
export async function POST(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const e = await request.json()
    const deviceId = request.headers.get('x-device-id') || 'unknown'
    const status = e.status || 'empty'
    const clearFields = status === 'empty' || status === 'cleaning'
    await DB.prepare(`
      INSERT INTO beds_map (ward_id, bed_no, status, hn, name, sex, level, admitted_at, remark, pay_right, specialty, diagnosis)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(ward_id, bed_no) DO UPDATE SET
        status = excluded.status,
        hn = excluded.hn, name = excluded.name, sex = excluded.sex,
        level = excluded.level, admitted_at = excluded.admitted_at, remark = excluded.remark,
        pay_right = excluded.pay_right, specialty = excluded.specialty, diagnosis = excluded.diagnosis,
        updated_at = datetime('now')
    `).bind(
      e.wardId, String(e.bedNo), status,
      clearFields ? null : (e.hn || null),
      clearFields ? null : (e.name || null),
      clearFields ? null : (e.sex || null),
      clearFields ? null : (e.level ? +e.level : null),
      clearFields ? null : (e.admitted_at || null),
      e.remark || null,
      clearFields ? null : (e.pay_right || null),
      clearFields ? null : (e.specialty || null),
      clearFields ? null : (e.diagnosis || null)
    ).run()

    await DB.prepare(`
      INSERT INTO beds_map_log (ward_id, bed_no, action, status, hn, name, sex, level, pay_right, specialty, diagnosis, device_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      e.wardId, String(e.bedNo), e.action || 'update', status,
      e.hn || null, e.name || null, e.sex || null, e.level ? +e.level : null,
      e.pay_right || null, e.specialty || null, e.diagnosis || null, deviceId
    ).run()

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 503 })
  }
}

// DELETE /api/beds-map?ward=W5A  → clear all beds for a ward
// DELETE /api/beds-map            → clear ALL bed map
export async function DELETE(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const url = new URL(request.url)
    const ward = url.searchParams.get('ward')
    if (ward) {
      await DB.prepare('DELETE FROM beds_map WHERE ward_id=?').bind(ward).run()
    } else {
      await DB.prepare('DELETE FROM beds_map').run()
    }
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 503 })
  }
}
