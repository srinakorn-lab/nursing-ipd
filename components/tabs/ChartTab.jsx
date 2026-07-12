'use client'
import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { THAI_MONTHS, ACTIVITIES } from '../../lib/constants'
import { loadDailyEntries, loadEntries, apiLoadDailyEntries, apiLoadEntries } from '../../lib/storage'
import { calcProd, calcPts, getAvailBeds } from '../../lib/calc'
import { useWards } from '../../lib/hooks/useWards'
import ProdBarChart from '../charts/ProdBarChart'
import BorBarChart from '../charts/BorBarChart'
import DailyPcChart from '../charts/DailyPcChart'

const THAI_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function calcGroup(rows, cfg, oos, shift = 'day') {
  const prods = rows.map(r => calcProd(r.e[shift], r.w.type, cfg)).filter(p => p != null)
  // Only count beds from wards that have data for this shift
  const withData = rows.filter(r => r.e[shift])
  const availSum = withData.reduce((s, r) => s + getAvailBeds(r.w, oos), 0)
  const ptsSum   = withData.reduce((s, r) => s + calcPts(r.e[shift]), 0)
  return {
    prod: prods.length ? +(prods.reduce((a, b) => a + b, 0) / prods.length).toFixed(1) : null,
    bor:  availSum > 0 && ptsSum > 0 ? +(ptsSum / availSum * 100).toFixed(1) : null,
  }
}

export default function ChartTab({ cfg, oos, year, month }) {
  const WARDS = useWards()
  const WARD_WARDS = useMemo(() => WARDS.filter(w => w.type === 'WARD'), [WARDS])
  const ICU_WARDS  = useMemo(() => WARDS.filter(w => w.type === 'ICU'),  [WARDS])
  const [viewMode, setViewMode] = useState('daily')
  const [group, setGroup]       = useState('all')
  const [selDay, setSelDay]     = useState(() => new Date().getDate())

  // ── Data state ────────────────────────────────────────────────
  const [dailyWardData, setDailyWardData] = useState({})
  const [monthlyData, setMonthlyData]     = useState([])
  const [yearlyData, setYearlyData]       = useState([])

  const daysInMonth = new Date(year - 543, month, 0).getDate()

  // ── Daily: load all wards' data for one day ──────────────────
  useEffect(() => {
    if (viewMode !== 'daily') return
    async function load() {
      const result = {}
      await Promise.all(WARDS.map(async w => {
        const data = await apiLoadDailyEntries(year, month, w.id)
        const src  = (data && Object.keys(data).length) ? data : loadDailyEntries(year, month, w.id)
        result[w.id] = src[selDay] || {}
      }))
      setDailyWardData(result)
    }
    load()
  }, [year, month, selDay, viewMode])

  // ── Monthly: each day of month aggregated ───────────────────
  useEffect(() => {
    if (viewMode !== 'monthly') return
    async function load() {
      const loaded = {}
      await Promise.all(WARDS.map(async w => {
        const data = await apiLoadDailyEntries(year, month, w.id)
        loaded[w.id] = (data && Object.keys(data).length) ? data : loadDailyEntries(year, month, w.id)
      }))
      const result = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        const wardRows = WARD_WARDS.map(w => ({ w, e: loaded[w.id][d] || {} }))
        const icuRows  = ICU_WARDS.map(w  => ({ w, e: loaded[w.id][d] || {} }))
        const allRows  = [...wardRows, ...icuRows]
        const lvTotals = { lv1:0, lv2:0, lv3:0, lv4:0, lv5:0 }
        allRows.forEach(r => {
          const e = r.e.day || {}
          ;['lv1','lv2','lv3','lv4','lv5'].forEach(k => { lvTotals[k] += e[k]||0 })
        })
        return {
          day:  d,
          ward: calcGroup(wardRows, cfg, oos),
          icu:  calcGroup(icuRows,  cfg, oos),
          all:  calcGroup(allRows, cfg, oos),
          ...lvTotals,
        }
      })
      setMonthlyData(result)
    }
    load()
  }, [year, month, viewMode, cfg, oos, daysInMonth, WARDS])

  // ── Yearly: each month of year ──────────────────────────────
  useEffect(() => {
    if (viewMode !== 'yearly') return
    async function load() {
      const result = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
        const m   = i + 1
        const data = await apiLoadEntries(year, m)
        const ent  = (data && Object.keys(data).length) ? data : loadEntries(year, m)
        const wardRows = WARD_WARDS.map(w => ({ w, e: ent[w.id] || {} }))
        const icuRows  = ICU_WARDS.map(w  => ({ w, e: ent[w.id] || {} }))
        const allRows = [...wardRows, ...icuRows]
        const lvTotals = { lv1:0, lv2:0, lv3:0, lv4:0, lv5:0 }
        allRows.forEach(r => {
          const e = r.e.day || {}
          ;['lv1','lv2','lv3','lv4','lv5'].forEach(k => { lvTotals[k] += e[k]||0 })
        })
        return {
          label: THAI_SHORT[i],
          ward:  calcGroup(wardRows, cfg, oos),
          icu:   calcGroup(icuRows,  cfg, oos),
          all:   calcGroup(allRows, cfg, oos),
          ...lvTotals,
        }
      }))
      setYearlyData(result)
    }
    load()
  }, [year, viewMode, cfg, oos, WARDS])

  // ── Level data per ward (daily view) ─────────────────────────
  const getLevelBars = (wards) => wards.map(w => {
    const e = dailyWardData[w.id]?.day || {}
    return { ward: w.id, lv1: e.lv1||0, lv2: e.lv2||0, lv3: e.lv3||0, lv4: e.lv4||0, lv5: e.lv5||0 }
  })

  // ── Derived daily bar data ────────────────────────────────────
  const getDailyBars = (wards) => wards.map(w => {
    const e    = dailyWardData[w.id] || {}
    const avail = getAvailBeds(w, oos)
    const pts   = calcPts(e.day)
    return {
      ward:  w.id,
      day:   calcProd(e.day,   w.type, cfg),
      night: calcProd(e.night, w.type, cfg),
      bor:   avail > 0 && pts > 0 ? +(pts / avail * 100).toFixed(1) : 0,
    }
  })

  const dailySummary = useMemo(() => {
    const makeRows = (wards) => wards.map(w => ({ w, e: dailyWardData[w.id] || {} }))
    return {
      ward: calcGroup(makeRows(WARD_WARDS), cfg, oos),
      icu:  calcGroup(makeRows(ICU_WARDS),  cfg, oos),
      all:  calcGroup(makeRows(WARDS),       cfg, oos),
    }
  }, [dailyWardData, cfg, oos, WARDS, WARD_WARDS, ICU_WARDS])

  // Workload activities summed across all wards (selected day)
  const activityBars = useMemo(() => {
    return ACTIVITIES.map(a => {
      let day = 0, night = 0
      Object.values(dailyWardData).forEach(e => {
        day   += e.day?.activities?.[a.key]   || 0
        night += e.night?.activities?.[a.key] || 0
      })
      return { label: a.label, day, night, total: day + night }
    })
  }, [dailyWardData])

  // ── Shared chart components ───────────────────────────────────
  const GroupProdLine = ({ data, xKey }) => (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
        <Tooltip formatter={v => v != null ? v.toFixed(1) + '%' : '—'} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={130} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '130%', position: 'right', fontSize: 9, fill: '#dc2626' }} />
        <ReferenceLine y={110} stroke="#d97706" strokeDasharray="4 4" label={{ value: '110%', position: 'right', fontSize: 9, fill: '#d97706' }} />
        <ReferenceLine y={95}  stroke="#16a34a" strokeDasharray="4 4" label={{ value: '95%',  position: 'right', fontSize: 9, fill: '#16a34a' }} />
        {(group === 'all' || group === 'ward') && <Line type="monotone" dataKey="ward.prod" name="🏥 IPD"     stroke="#6366f1" dot={{ r: 2 }} connectNulls />}
        {(group === 'all' || group === 'icu')  && <Line type="monotone" dataKey="icu.prod"  name="🏨 วิกฤต"  stroke="#8b5cf6" dot={{ r: 2 }} connectNulls />}
        {group === 'all'                        && <Line type="monotone" dataKey="all.prod"  name="📊 รวม"    stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
      </LineChart>
    </ResponsiveContainer>
  )

  const GroupBorLine = ({ data, xKey }) => (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} />
        <Tooltip formatter={v => v != null ? v.toFixed(1) + '%' : '—'} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={80} stroke="#d97706" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 9, fill: '#d97706' }} />
        {(group === 'all' || group === 'ward') && <Line type="monotone" dataKey="ward.bor" name="🏥 IPD"    stroke="#6366f1" dot={{ r: 2 }} connectNulls />}
        {(group === 'all' || group === 'icu')  && <Line type="monotone" dataKey="icu.bor"  name="🏨 วิกฤต" stroke="#8b5cf6" dot={{ r: 2 }} connectNulls />}
        {group === 'all'                        && <Line type="monotone" dataKey="all.bor"  name="📊 รวม"   stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
      </LineChart>
    </ResponsiveContainer>
  )

  // ── Summary KPI pills ─────────────────────────────────────────
  const SumPill = ({ label, prod, bor, color }) => (
    <div className="flex-1 rounded-xl border p-3 min-w-[120px]" style={{ borderColor: color + '44', background: color + '0a' }}>
      <div className="text-xs font-bold mb-1" style={{ color }}>{label}</div>
      <div className="text-sm">
        <span className="font-bold" style={{ color }}>{prod != null ? prod + '%' : '—'}</span>
        <span className="text-slate-400 text-xs ml-1">Prod</span>
      </div>
      <div className="text-sm">
        <span className="font-semibold text-slate-600">{bor != null ? bor + '%' : '—'}</span>
        <span className="text-slate-400 text-xs ml-1">BOR</span>
      </div>
    </div>
  )

  const titleMonth = THAI_MONTHS[month - 1]

  return (
    <div className="p-4 space-y-4">
      {/* Control bar */}
      <div className="card py-2.5 flex flex-wrap items-center gap-3">
        {/* View mode */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {[['daily','📅 รายวัน'],['monthly','📆 รายเดือน'],['yearly','📊 รายปี']].map(([id, label]) => (
            <button key={id} onClick={() => setViewMode(id)}
              className="text-xs px-3 py-1.5 rounded-md font-semibold transition-all"
              style={viewMode === id ? { background: '#6366f1', color: '#fff' } : { color: '#64748b' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Group filter */}
        <div className="flex gap-1 ml-auto">
          {[['all','ทั้งหมด','#0284c7'],['ward','🏥 IPD','#6366f1'],['icu','🏨 วิกฤต','#8b5cf6']].map(([id, label, color]) => (
            <button key={id} onClick={() => setGroup(id)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all"
              style={group === id
                ? { background: color, color: '#fff', borderColor: color }
                : { color: '#64748b', borderColor: '#e2e8f0' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DAILY view ── */}
      {viewMode === 'daily' && (
        <>
          {/* Date navigation */}
          <div className="card py-3 flex flex-wrap items-center gap-3">
            <button onClick={() => setSelDay(d => Math.max(1, d - 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold">
              ←
            </button>
            <div className="text-base font-bold text-slate-800">
              วันที่ <span className="text-indigo-600">{selDay}</span> {titleMonth} พ.ศ. {year}
            </div>
            <button onClick={() => setSelDay(d => Math.min(daysInMonth, d + 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold">
              →
            </button>
            <input type="number" min="1" max={daysInMonth} value={selDay}
              onChange={e => setSelDay(Math.max(1, Math.min(daysInMonth, +e.target.value || 1)))}
              className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-indigo-400" />
            <button onClick={() => setSelDay(new Date().getDate())}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              วันนี้
            </button>

            {/* Summary pills */}
            <div className="flex gap-2 ml-auto flex-wrap">
              {(group === 'all' || group === 'ward') && (
                <SumPill label="🏥 IPD" prod={dailySummary.ward.prod} bor={dailySummary.ward.bor} color="#6366f1" />
              )}
              {(group === 'all' || group === 'icu') && (
                <SumPill label="🏨 วิกฤต" prod={dailySummary.icu.prod} bor={dailySummary.icu.bor} color="#8b5cf6" />
              )}
              {group === 'all' && (
                <SumPill label="📊 รวม" prod={dailySummary.all.prod} bor={dailySummary.all.bor} color="#0284c7" />
              )}
            </div>
          </div>

          {/* IPD charts */}
          {(group === 'all' || group === 'ward') && (
            <>
              <div className="card">
                <div className="text-sm font-bold text-indigo-700 mb-3">🏥 IPD — Productivity% (วันที่ {selDay})</div>
                <ProdBarChart data={getDailyBars(WARD_WARDS)} cfg={cfg} />
              </div>
              <div className="card">
                <div className="text-sm font-bold text-indigo-700 mb-3">🏥 IPD — BOR% (วันที่ {selDay})</div>
                <BorBarChart data={getDailyBars(WARD_WARDS)} />
              </div>
            </>
          )}

          {/* ICU charts */}
          {(group === 'all' || group === 'icu') && (
            <>
              <div className="card">
                <div className="text-sm font-bold text-purple-700 mb-3">🏨 วิกฤต (ICU/CCU/NCU) — Productivity% (วันที่ {selDay})</div>
                <ProdBarChart data={getDailyBars(ICU_WARDS)} cfg={cfg} />
              </div>
              <div className="card">
                <div className="text-sm font-bold text-purple-700 mb-3">🏨 วิกฤต (ICU/CCU/NCU) — BOR% (วันที่ {selDay})</div>
                <BorBarChart data={getDailyBars(ICU_WARDS)} />
              </div>
            </>
          )}

          {/* Patient classification by level */}
          {(group === 'all' || group === 'ward') && getLevelBars(WARD_WARDS).some(r => r.lv1+r.lv2+r.lv3+r.lv4+r.lv5 > 0) && (
            <div className="card">
              <div className="text-sm font-bold text-indigo-700 mb-3">🏥 IPD — จำนวนผู้ป่วยตาม Level (วันที่ {selDay})</div>
              <DailyPcChart data={getLevelBars(WARD_WARDS)} xKey="ward" height={220} />
            </div>
          )}
          {(group === 'all' || group === 'icu') && getLevelBars(ICU_WARDS).some(r => r.lv1+r.lv2+r.lv3+r.lv4+r.lv5 > 0) && (
            <div className="card">
              <div className="text-sm font-bold text-purple-700 mb-3">🏨 วิกฤต — จำนวนผู้ป่วยตาม Level (วันที่ {selDay})</div>
              <DailyPcChart data={getLevelBars(ICU_WARDS)} xKey="ward" height={180} />
            </div>
          )}

          {/* Workload activities */}
          {activityBars.some(a => a.total > 0) && (
            <div className="card">
              <div className="text-sm font-bold text-slate-700 mb-3">⚙️ ภาระงานเฉพาะ / หัตถการ — รวมทุก Ward (วันที่ {selDay})</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={activityBars.filter(a => a.total > 0)} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="day"   name="☀️ DAY"   fill="#0284c7" radius={[3,3,0,0]} maxBarSize={22} />
                  <Bar dataKey="night" name="🌙 NIGHT" fill="#7c3aed" radius={[3,3,0,0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── MONTHLY view ── */}
      {viewMode === 'monthly' && (
        <>
          <div className="card">
            <div className="text-sm font-bold text-slate-700 mb-3">
              📈 Productivity% รายวัน — {titleMonth} พ.ศ. {year}
            </div>
            <GroupProdLine data={monthlyData} xKey="day" />
          </div>
          <div className="card">
            <div className="text-sm font-bold text-slate-700 mb-3">
              🛏 BOR% รายวัน — {titleMonth} พ.ศ. {year}
            </div>
            <GroupBorLine data={monthlyData} xKey="day" />
          </div>
          {monthlyData.some(d => d.lv1+d.lv2+d.lv3+d.lv4+d.lv5 > 0) && (
            <div className="card">
              <div className="text-sm font-bold text-slate-700 mb-3">
                🧑‍⚕️ จำนวนผู้ป่วยตาม Level รายวัน — {titleMonth} พ.ศ. {year}
              </div>
              <DailyPcChart data={monthlyData} xKey="day" height={220} />
            </div>
          )}
        </>
      )}

      {/* ── YEARLY view ── */}
      {viewMode === 'yearly' && (
        <>
          <div className="card">
            <div className="text-sm font-bold text-slate-700 mb-3">
              📈 Productivity% รายปี — พ.ศ. {year}
            </div>
            <GroupProdLine data={yearlyData} xKey="label" />
          </div>
          <div className="card">
            <div className="text-sm font-bold text-slate-700 mb-3">
              🛏 BOR% รายปี — พ.ศ. {year}
            </div>
            <GroupBorLine data={yearlyData} xKey="label" />
          </div>
          {yearlyData.some(d => d.lv1+d.lv2+d.lv3+d.lv4+d.lv5 > 0) && (
            <div className="card">
              <div className="text-sm font-bold text-slate-700 mb-3">
                🧑‍⚕️ จำนวนผู้ป่วยตาม Level รายเดือน — พ.ศ. {year}
              </div>
              <DailyPcChart data={yearlyData} xKey="label" height={220} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
