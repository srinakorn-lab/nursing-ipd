export const runtime = 'edge'

function getDB() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRequestContext } = require('@cloudflare/next-on-pages')
    return getRequestContext().env.DB
  } catch { return null }
}

export async function GET(request, { params }) {
  try {
    const DB = getDB()
    if (!DB) return Response.json({}, { status: 503 })
    const { year, month } = await params
    const { results } = await DB.prepare(
      'SELECT * FROM monthly_entries WHERE year=? AND month=?'
    ).bind(+year, +month).all()

    const data = {}
    results.forEach(r => {
      if (!data[r.ward_id]) data[r.ward_id] = {}
      data[r.ward_id][r.shift] = {
        wardId: r.ward_id, shift: r.shift,
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
    const { year, month } = await params
    const e = await request.json()
    await DB.prepare(`
      INSERT INTO monthly_entries (year,month,ward_id,shift,lv1,lv2,lv3,lv4,lv5,adm,trf,ods,rn,pn,na)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(year,month,ward_id,shift) DO UPDATE SET
        lv1=excluded.lv1, lv2=excluded.lv2, lv3=excluded.lv3, lv4=excluded.lv4, lv5=excluded.lv5,
        adm=excluded.adm, trf=excluded.trf, ods=excluded.ods,
        rn=excluded.rn, pn=excluded.pn, na=excluded.na, updated_at=datetime('now')
    `).bind(+year, +month, e.wardId, e.shift,
      e.lv1||0, e.lv2||0, e.lv3||0, e.lv4||0, e.lv5||0,
      e.adm||0, e.trf||0, e.ods||0, e.rn||0, e.pn||0, e.na||0
    ).run()
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
