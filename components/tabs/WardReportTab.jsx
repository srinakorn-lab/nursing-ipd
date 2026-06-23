'use client'
import { useState, useEffect, useMemo } from 'react'
import { WARDS, THAI_MONTHS } from '../../lib/constants'
import { apiLoadLog } from '../../lib/storage'
import { calcProd, calcPts } from '../../lib/calc'

const VIEWS = [
  { id: 'daily',   label: '🗓 รายวัน' },
  { id: 'weekly',  label: '📆 รายสัปดาห์' },
  { id: 'monthly', label: '📅 รายเดือน' },
  { id: 'yearly',  label: '🗓 รายปี' },
]

export default function WardReportTab({ cfg, year, month }) {
  const [wardId, setWardId] = useState(WARDS[0].id)
  const [view, setView]     = useState('daily')
  const [selDay, setSelDay] = useState(1)
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { setSelDay(new Date().getDate()) }, [])

  useEffect(() => {
    setLoading(true)
    const params = { ward: wardId, year }
    if (view !== 'yearly') params.month = month
    if (view === 'daily') params.day = selDay
    apiLoadLog(params).then(data => {
      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [wardId, view, year, month, selDay])

  const ward = WARDS.find(w => w.id === wardId)
  const enriched = useMemo(() => rows.map(r => ({
    ...r,
    _pts:  calcPts(r),
    _prod: calcProd(r, ward?.type || 'WARD', cfg),
  })), [rows, ward, cfg])

  const daysInMonth = new Date(year - 543, month, 0).getDate()

  // ─── weekly: ISO-week (Mon-Sun) grouping ─────────────────────────
  const weekly = useMemo(() => {
    if (view !== 'weekly') return []
    const buckets = {}
    enriched.forEach(r => {
      if (!r.day) return
      const date = new Date(year - 543, month - 1, r.day)
      // Week number: days since 1st / 7 (simple Mon-Sun)
      const first = new Date(year - 543, month - 1, 1)
      const dayOffset = Math.floor((date - first) / (1000*60*60*24))
      const weekNo = Math.floor((dayOffset + first.getDay()) / 7) + 1
      if (!buckets[weekNo]) buckets[weekNo] = { week: weekNo, count: 0, totalPts: 0, prodSum: 0, prodN: 0, days: new Set() }
      buckets[weekNo].count++
      buckets[weekNo].totalPts += r._pts
      if (r._prod != null) { buckets[weekNo].prodSum += r._prod; buckets[weekNo].prodN++ }
      buckets[weekNo].days.add(r.day)
    })
    return Object.values(buckets).sort((a,b) => a.week - b.week).map(b => ({
      week: b.week,
      count: b.count,
      days: [...b.days].sort((a,b)=>a-b),
      avgPts: b.count ? +(b.totalPts / b.count).toFixed(1) : 0,
      avgProd: b.prodN ? +(b.prodSum / b.prodN).toFixed(1) : null,
    }))
  }, [view, enriched, year, month])

  // ─── monthly: aggregate by day ───────────────────────────────────
  const monthly = useMemo(() => {
    if (view !== 'monthly') return []
    const byDay = {}
    enriched.forEach(r => {
      if (!r.day) return
      const k = r.day
      if (!byDay[k]) byDay[k] = { day: k, count: 0, dayPts: 0, nightPts: 0, dayProdSum: 0, dayProdN: 0, nightProdSum: 0, nightProdN: 0 }
      byDay[k].count++
      if (r.shift === 'day') {
        byDay[k].dayPts += r._pts
        if (r._prod != null) { byDay[k].dayProdSum += r._prod; byDay[k].dayProdN++ }
      } else {
        byDay[k].nightPts += r._pts
        if (r._prod != null) { byDay[k].nightProdSum += r._prod; byDay[k].nightProdN++ }
      }
    })
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = byDay[i+1]
      return d ? {
        day: i+1, count: d.count,
        dayPts: d.dayPts, nightPts: d.nightPts,
        dayProd: d.dayProdN ? +(d.dayProdSum / d.dayProdN).toFixed(1) : null,
        nightProd: d.nightProdN ? +(d.nightProdSum / d.nightProdN).toFixed(1) : null,
      } : { day: i+1, count: 0, dayPts: 0, nightPts: 0, dayProd: null, nightProd: null }
    })
  }, [view, enriched, daysInMonth])

  // ─── yearly: aggregate by month ──────────────────────────────────
  const yearly = useMemo(() => {
    if (view !== 'yearly') return []
    const byMonth = {}
    enriched.forEach(r => {
      const k = r.month
      if (!byMonth[k]) byMonth[k] = { month: k, count: 0, totalPts: 0, prodSum: 0, prodN: 0 }
      byMonth[k].count++
      byMonth[k].totalPts += r._pts
      if (r._prod != null) { byMonth[k].prodSum += r._prod; byMonth[k].prodN++ }
    })
    return Array.from({ length: 12 }, (_, i) => {
      const m = byMonth[i+1] || { month: i+1, count: 0, totalPts: 0, prodSum: 0, prodN: 0 }
      return {
        month: m.month, records: m.count,
        avgPts: m.count ? +(m.totalPts / m.count).toFixed(1) : 0,
        avgProd: m.prodN ? +(m.prodSum / m.prodN).toFixed(1) : null,
      }
    })
  }, [view, enriched])

  function exportCSV() {
    const BOM = '﻿'
    let header, csvRows
    if (view === 'daily') {
      header = 'เวลาบันทึก,วัน,เวร,Lv1,Lv2,Lv3,Lv4,Lv5,ADM,TRF,ODS,RN,PN,NA,Pts,PROD%,Device\n'
      csvRows = enriched.map(r =>
        `${r.saved_at},${r.day ?? ''},${r.shift},${r.lv1},${r.lv2},${r.lv3},${r.lv4},${r.lv5},${r.adm},${r.trf},${r.ods},${r.rn},${r.pn},${r.na},${r._pts},${r._prod ?? ''},${r.device_id || ''}`
      ).join('\n')
    } else if (view === 'weekly') {
      header = 'สัปดาห์,จำนวน Record,วันที่,Pts เฉลี่ย,PROD% เฉลี่ย\n'
      csvRows = weekly.map(r => `สัปดาห์ ${r.week},${r.count},"${r.days.join(',')}",${r.avgPts},${r.avgProd ?? ''}`).join('\n')
    } else if (view === 'monthly') {
      header = 'วัน,จำนวน Record,DAY Pts,DAY PROD%,NIGHT Pts,NIGHT PROD%\n'
      csvRows = monthly.map(r => `${r.day},${r.count},${r.dayPts},${r.dayProd ?? ''},${r.nightPts},${r.nightProd ?? ''}`).join('\n')
    } else {
      header = 'เดือน,จำนวน Record,Pts เฉลี่ย,PROD% เฉลี่ย\n'
      csvRows = yearly.map(r => `${THAI_MONTHS[r.month-1]},${r.records},${r.avgPts},${r.avgProd ?? ''}`).join('\n')
    }
    const blob = new Blob([BOM + header + csvRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IPD_${wardId}_${view}_${year}_${month}${view==='daily'?'_'+selDay:''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmtTime = ts => {
    if (!ts) return '—'
    try { return new Date(ts + 'Z').toLocaleString('th-TH', { hour12: false }) }
    catch { return ts }
  }
  const fmtP = v => v != null ? `${v}%` : '—'

  return (
    <div className="p-4 space-y-4">
      {/* Ward + view picker */}
      <div className="card py-2 flex flex-wrap items-center gap-2">
        <div className="text-sm font-bold text-slate-700">รายงานเฉพาะ Ward:</div>
        <select value={wardId} onChange={e => setWardId(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 font-bold">
          {WARDS.map(w => <option key={w.id} value={w.id}>{w.name} {w.type === 'ICU' ? '(ICU)' : ''}</option>)}
        </select>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-2">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`text-sm px-3 py-1.5 font-semibold ${view===v.id ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {v.label}
            </button>
          ))}
        </div>
        {view === 'daily' && (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => setSelDay(d => Math.max(1, d-1))}
              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm">←</button>
            <span className="text-sm font-bold text-slate-700 px-2">วันที่ {selDay} {THAI_MONTHS[month-1]} {year}</span>
            <button onClick={() => setSelDay(d => Math.min(daysInMonth, d+1))}
              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm">→</button>
          </div>
        )}
        <div className="flex-1" />
        <button onClick={exportCSV}
          className="text-sm px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
          ⬇️ Export CSV
        </button>
      </div>

      <div className="text-sm text-slate-500">
        {loading ? '⏳ กำลังโหลด...' : `${ward?.name} • ${rows.length} record`}
      </div>

      {/* Daily view: raw log */}
      {view === 'daily' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase">บันทึกเมื่อ</th>
                <th className="px-2 py-2 font-bold text-slate-500">เวร</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv1</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv2</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv3</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv4</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv5</th>
                <th className="px-2 py-2 font-bold text-slate-500">Pts</th>
                <th className="px-2 py-2 font-bold text-slate-500">RN</th>
                <th className="px-2 py-2 font-bold text-slate-500">PN</th>
                <th className="px-2 py-2 font-bold text-slate-500">PROD%</th>
                <th className="px-2 py-2 font-bold text-slate-500">Device</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{fmtTime(r.saved_at)}</td>
                  <td className="px-2 py-1.5 text-center" style={{ color: r.shift==='day'?'#0284c7':'#7c3aed' }}>
                    {r.shift==='day' ? '☀️' : '🌙'}
                  </td>
                  <td className="px-2 py-1.5 text-center">{r.lv1}</td>
                  <td className="px-2 py-1.5 text-center">{r.lv2}</td>
                  <td className="px-2 py-1.5 text-center">{r.lv3}</td>
                  <td className="px-2 py-1.5 text-center">{r.lv4}</td>
                  <td className="px-2 py-1.5 text-center">{r.lv5}</td>
                  <td className="px-2 py-1.5 text-center font-bold text-blue-700">{r._pts}</td>
                  <td className="px-2 py-1.5 text-center">{r.rn}</td>
                  <td className="px-2 py-1.5 text-center">{r.pn}</td>
                  <td className="px-2 py-1.5 text-center font-bold">{fmtP(r._prod)}</td>
                  <td className="px-2 py-1.5 text-slate-400 text-[10px]">{r.device_id?.slice(0,8) || '—'}</td>
                </tr>
              ))}
              {!loading && enriched.length === 0 && (
                <tr><td colSpan={12} className="text-center text-slate-400 py-8">ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Weekly view */}
      {view === 'weekly' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">สัปดาห์</th>
                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">วันที่</th>
                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">จำนวน Record</th>
                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">Pts เฉลี่ย</th>
                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">PROD% เฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map(r => (
                <tr key={r.week} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-bold text-slate-800">สัปดาห์ {r.week}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{r.days.join(', ')}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{r.count}</td>
                  <td className="px-3 py-2 text-center font-semibold text-blue-600">{r.avgPts}</td>
                  <td className="px-3 py-2 text-center font-bold">{fmtP(r.avgProd)}</td>
                </tr>
              ))}
              {weekly.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">ไม่มีข้อมูล</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly view */}
      {view === 'monthly' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">วัน</th>
                <th className="px-2 py-2.5 text-xs font-bold text-slate-500 uppercase">Record</th>
                <th className="px-2 py-2.5 text-xs font-bold text-blue-500">☀️ Pts</th>
                <th className="px-2 py-2.5 text-xs font-bold text-blue-500">☀️ PROD%</th>
                <th className="px-2 py-2.5 text-xs font-bold text-purple-500">🌙 Pts</th>
                <th className="px-2 py-2.5 text-xs font-bold text-purple-500">🌙 PROD%</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(r => (
                <tr key={r.day} className={`border-b border-slate-100 hover:bg-slate-50 ${r.count===0 ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-1.5 font-bold text-slate-800">{r.day}</td>
                  <td className="px-2 py-1.5 text-center text-slate-700">{r.count || '—'}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-blue-600">{r.dayPts || '—'}</td>
                  <td className="px-2 py-1.5 text-center font-bold">{fmtP(r.dayProd)}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-purple-600">{r.nightPts || '—'}</td>
                  <td className="px-2 py-1.5 text-center font-bold">{fmtP(r.nightProd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Yearly view */}
      {view === 'yearly' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">เดือน</th>
                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">จำนวน Record</th>
                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">Pts เฉลี่ย</th>
                <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">PROD% เฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map(r => (
                <tr key={r.month} className={`border-b border-slate-100 hover:bg-slate-50 ${r.records===0 ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-2 font-bold text-slate-800">{THAI_MONTHS[r.month-1]}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{r.records}</td>
                  <td className="px-3 py-2 text-center font-semibold text-blue-600">{r.avgPts || '—'}</td>
                  <td className="px-3 py-2 text-center font-bold">{fmtP(r.avgProd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
