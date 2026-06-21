import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  try { return getRequestContext().env.DB } catch { return null }
}

export async function GET(request, { params }) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({}, { status: 503 })
    const { year, month, wardId } = await params
    const { results } = await DB.prepare(
      'SELECT * FROM daily_entries WHERE year=? AND month=? AND ward_id=?'
    ).bind(+year, +month, wardId).all()

    const data = {}
    results.forEach(r => {
      if (!data[r.day]) data[r.day] = {}
      const shift = r.shift.toLowerCase()
      data[r.day][shift] = {
        wardId: r.ward_id, shift, day: r.day,
        lv1: r.lv1, lv2: r.lv2, lv3: r.lv3, lv4: r.lv4, lv5: r.lv5,
        adm: r.adm, trf: r.trf, ods: r.ods,
        rn: r.rn, pn: r.pn, na: r.na,
      }
    })
    return Response.json(data)
  } catch {
    return Response.json({}, { status: 503 })
  }
}

export async function POST(request, { params }) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({ ok: false }, { status: 503 })
    const { year, month, wardId } = await params
    const e = await request.json()
    const deviceId = request.headers.get('x-device-id') || 'unknown'
    // Main table (current state)
    await DB.prepare(`
      INSERT INTO daily_entries (year,month,day,ward_id,shift,lv1,lv2,lv3,lv4,lv5,adm,trf,ods,rn,pn,na)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(year,month,day,ward_id,shift) DO UPDATE SET
        lv1=excluded.lv1, lv2=excluded.lv2, lv3=excluded.lv3, lv4=excluded.lv4, lv5=excluded.lv5,
        adm=excluded.adm, trf=excluded.trf, ods=excluded.ods,
        rn=excluded.rn, pn=excluded.pn, na=excluded.na, updated_at=datetime('now')
    `).bind(+year, +month, e.day|0, wardId, e.shift,
      e.lv1||0, e.lv2||0, e.lv3||0, e.lv4||0, e.lv5||0,
      e.adm||0, e.trf||0, e.ods||0, e.rn||0, e.pn||0, e.na||0
    ).run()
    // Audit log
    await DB.prepare(`
      INSERT INTO entries_log (year,month,day,ward_id,shift,lv1,lv2,lv3,lv4,lv5,adm,trf,ods,rn,pn,na,device_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(+year, +month, e.day|0, wardId, e.shift,
      e.lv1||0, e.lv2||0, e.lv3||0, e.lv4||0, e.lv5||0,
      e.adm||0, e.trf||0, e.ods||0, e.rn||0, e.pn||0, e.na||0, deviceId
    ).run()
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
