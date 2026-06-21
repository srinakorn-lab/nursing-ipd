'use client'
import { useMemo, useState, useEffect } from 'react'
import { WARDS, THAI_MONTHS } from '../../lib/constants'
import { apiLoadLog } from '../../lib/storage'
import { calcProd, calcPts } from '../../lib/calc'

const VIEWS = [
  { id: 'daily',   label: '🗓 รายวัน' },
  { id: 'monthly', label: '📅 รายเดือน' },
  { id: 'yearly',  label: '📆 รายปี' },
]

export default function ReportTab({ cfg, year, month }) {
  const [view, setView] = useState('daily')
  const [selDay, setSelDay] = useState(1)
  const [wardFilter, setWardFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { setSelDay(new Date().getDate()) }, [])

  useEffect(() => {
    setLoading(true)
    const params = { year }
    if (view === 'daily')   { params.month = month; params.day = selDay }
    if (view === 'monthly') { params.month = month }
    if (wardFilter !== 'all') params.ward = wardFilter
    apiLoadLog(params).then(data => {
      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [view, year, month, selDay, wardFilter])

  const enriched = useMemo(() => rows.map(r => {
    const w = WARDS.find(x => x.id === r.ward_id)
    const pts = calcPts(r)
    const prod = calcProd(r, w?.type || 'WARD', cfg)
    return { ...r, _pts: pts, _prod: prod, _wardName: w?.name || r.ward_id, _wardType: w?.type || 'WARD' }
  }), [rows, cfg])

  // Yearly summary (group by month)
  const yearlySummary = useMemo(() => {
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
        month: m.month,
        records: m.count,
        avgPts: m.count ? +(m.totalPts / m.count).toFixed(1) : 0,
        avgProd: m.prodN ? +(m.prodSum / m.prodN).toFixed(1) : null,
      }
    })
  }, [view, enriched])

  const daysInMonth = new Date(year - 543, month, 0).getDate()

  function exportCSV() {
    const BOM = '﻿'
    let header, rowsCsv
    if (view === 'yearly') {
      header = 'เดือน,จำนวน Record,Pts เฉลี่ย,PROD% เฉลี่ย\n'
      rowsCsv = yearlySummary.map(r =>
        `${THAI_MONTHS[r.month-1]},${r.records},${r.avgPts},${r.avgProd ?? ''}`
      ).join('\n')
    } else {
      header = 'วันที่บันทึก,ปี,เดือน,วัน,Ward,เวร,Lv1,Lv2,Lv3,Lv4,Lv5,ADM,TRF,ODS,RN,PN,NA,Pts,PROD%,Device\n'
      rowsCsv = enriched.map(r =>
        `${r.saved_at},${r.year},${r.month},${r.day ?? ''},${r.ward_id},${r.shift},${r.lv1},${r.lv2},${r.lv3},${r.lv4},${r.lv5},${r.adm},${r.trf},${r.ods},${r.rn},${r.pn},${r.na},${r._pts},${r._prod ?? ''},${r.device_id || ''}`
      ).join('\n')
    }
    const blob = new Blob([BOM + header + rowsCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IPD_Report_${view}_${year}_${month}${view==='daily'?'_'+selDay:''}.csv`
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
      {/* View switcher */}
      <div className="card py-2 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`text-sm px-4 py-1.5 font-semibold ${view===v.id ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
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
        {view !== 'yearly' && (
          <select value={wardFilter} onChange={e => setWardFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400 ml-2">
            <option value="all">ทุก Ward</option>
            {WARDS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <div className="flex-1" />
        <button onClick={exportCSV}
          className="text-sm px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
          ⬇️ Export CSV
        </button>
      </div>

      {/* Counter */}
      <div className="text-sm text-slate-500">
        {loading ? '⏳ กำลังโหลด...' : `พบ ${view==='yearly' ? yearlySummary.filter(r=>r.records>0).length+' เดือน' : enriched.length+' record'}`}
      </div>

      {/* Yearly view: monthly summary */}
      {view === 'yearly' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">เดือน</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">จำนวน Record</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">Pts เฉลี่ย</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">PROD% เฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              {yearlySummary.map(r => (
                <tr key={r.month} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-slate-800">{THAI_MONTHS[r.month-1]}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700">{r.records}</td>
                  <td className="px-3 py-2.5 text-center text-blue-600 font-semibold">{r.avgPts || '—'}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-slate-700">{fmtP(r.avgProd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily/Monthly view: raw log rows */}
      {view !== 'yearly' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase">บันทึกเมื่อ</th>
                <th className="px-2 py-2 font-bold text-slate-500 uppercase">วัน</th>
                <th className="px-2 py-2 font-bold text-slate-500 uppercase">Ward</th>
                <th className="px-2 py-2 font-bold text-slate-500 uppercase">เวร</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv1</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv2</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv3</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv4</th>
                <th className="px-2 py-2 font-bold text-blue-500">Lv5</th>
                <th className="px-2 py-2 font-bold text-slate-500">Pts</th>
                <th className="px-2 py-2 font-bold text-slate-500">RN</th>
                <th className="px-2 py-2 font-bold text-slate-500">PN</th>
                <th className="px-2 py-2 font-bold text-slate-500">NA</th>
                <th className="px-2 py-2 font-bold text-slate-500">PROD%</th>
                <th className="px-2 py-2 font-bold text-slate-500">Device</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{fmtTime(r.saved_at)}</td>
                  <td className="px-2 py-1.5 text-center text-slate-700">{r.day ?? '—'}</td>
                  <td className="px-2 py-1.5 text-center font-bold text-slate-800">{r._wardName}</td>
                  <td className="px-2 py-1.5 text-center font-semibold" style={{ color: r.shift==='day'?'#0284c7':'#7c3aed' }}>
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
                  <td className="px-2 py-1.5 text-center">{r.na}</td>
                  <td className="px-2 py-1.5 text-center font-bold">{fmtP(r._prod)}</td>
                  <td className="px-2 py-1.5 text-slate-400 text-[10px]">{r.device_id?.slice(0,8) || '—'}</td>
                </tr>
              ))}
              {!loading && enriched.length === 0 && (
                <tr><td colSpan={15} className="text-center text-slate-400 py-8">ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
