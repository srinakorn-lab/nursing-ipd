import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

// POST /api/beds-map/move
// body: { fromWard, fromBed, toWard, toBed }
export async function POST(request) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const e = await request.json()
    const deviceId = request.headers.get('x-device-id') || 'unknown'

    // Read source bed
    const src = await DB.prepare(
      'SELECT * FROM beds_map WHERE ward_id=? AND bed_no=?'
    ).bind(e.fromWard, String(e.fromBed)).first()

    if (!src) return Response.json({ ok: false, error: 'source bed not found' }, { status: 400 })
    if (src.status !== 'occupied') return Response.json({ ok: false, error: 'source not occupied' }, { status: 400 })

    // Check destination
    const dst = await DB.prepare(
      'SELECT * FROM beds_map WHERE ward_id=? AND bed_no=?'
    ).bind(e.toWard, String(e.toBed)).first()
    if (dst && dst.status === 'occupied')
      return Response.json({ ok: false, error: 'destination occupied' }, { status: 400 })

    // Move: assign to destination, clear source
    await DB.prepare(`
      INSERT INTO beds_map (ward_id, bed_no, status, hn, name, sex, level, admitted_at, remark, pay_right, specialty, diagnosis)
      VALUES (?,?,'occupied',?,?,?,?,?,?,?,?,?)
      ON CONFLICT(ward_id, bed_no) DO UPDATE SET
        status='occupied',
        hn=excluded.hn, name=excluded.name, sex=excluded.sex,
        level=excluded.level, admitted_at=excluded.admitted_at, remark=excluded.remark,
        pay_right=excluded.pay_right, specialty=excluded.specialty, diagnosis=excluded.diagnosis,
        updated_at=datetime('now')
    `).bind(
      e.toWard, String(e.toBed),
      src.hn, src.name, src.sex, src.level, src.admitted_at, src.remark,
      src.pay_right, src.specialty, src.diagnosis
    ).run()

    await DB.prepare(`
      UPDATE beds_map SET status='cleaning', hn=NULL, name=NULL, sex=NULL, level=NULL,
        admitted_at=NULL, remark=NULL, pay_right=NULL, specialty=NULL, diagnosis=NULL, updated_at=datetime('now')
      WHERE ward_id=? AND bed_no=?
    `).bind(e.fromWard, String(e.fromBed)).run()

    // Log both
    await DB.prepare(`
      INSERT INTO beds_map_log (ward_id, bed_no, action, status, hn, name, sex, level, moved_from_ward, moved_from_bed, device_id)
      VALUES (?,?, 'move', 'occupied', ?,?,?,?, ?,?, ?)
    `).bind(e.toWard, String(e.toBed), src.hn, src.name, src.sex, src.level, e.fromWard, String(e.fromBed), deviceId).run()
    await DB.prepare(`
      INSERT INTO beds_map_log (ward_id, bed_no, action, status, device_id)
      VALUES (?, ?, 'move_out', 'cleaning', ?)
    `).bind(e.fromWard, String(e.fromBed), deviceId).run()

    return Response.json({ ok: true, patient: { hn: src.hn, name: src.name } })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 503 })
  }
}
