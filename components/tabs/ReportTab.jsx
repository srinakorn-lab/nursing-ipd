'use client'
import { useMemo, useState } from 'react'
import { WARDS, THAI_MONTHS } from '../../lib/constants'
import { loadEntries } from '../../lib/storage'
import { calcProd, calcPts, getAvailBeds } from '../../lib/calc'
import YearlyChart from '../charts/YearlyChart'

export default function ReportTab({ cfg, year, month, oos, entries = {} }) {
  const [chartWardId, setChartWardId] = useState(WARDS[0].id)

  const tableData = useMemo(() => {
    return WARDS.map(w => {
      const e = entries[w.id] || {}
      const dPts  = calcPts(e.day)
      const nPts  = calcPts(e.night)
      const dProd = calcProd(e.day,   w.type, cfg)
      const nProd = calcProd(e.night, w.type, cfg)
      const avail = getAvailBeds(w, oos)
      const bor   = avail > 0 && dPts > 0 ? +(dPts / avail * 100).toFixed(1) : 0
      const free  = dPts > 0 ? avail - Math.round(dPts) : null
      return { w, dPts, nPts, dProd, nProd, bor, free, avail }
    })
  }, [entries, cfg, oos])

  const yearlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const ent = loadEntries(year, m)
      const ward = WARDS.find(w => w.id === chartWardId)
      const e = ent[chartWardId] || {}
      return {
        month: m,
        dayProd:   calcProd(e.day,   ward?.type || 'WARD', cfg),
        nightProd: calcProd(e.night, ward?.type || 'WARD', cfg),
      }
    })
  }, [year, chartWardId, cfg])

  function exportCSV() {
    const BOM = '﻿'
    const header = 'Ward,เตียง,เตียงว่าง,BOR%,PTS DAY,PROD% DAY,PTS NIGHT,PROD% NIGHT\n'
    const rows = tableData.map(r =>
      `${r.w.name},${r.w.beds},${r.free ?? ''},${r.bor},${Math.round(r.dPts)},${r.dProd ?? ''},${Math.round(r.nPts)},${r.nProd ?? ''}`
    ).join('\n')
    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IPD_Report_${year}_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmtP = v => v != null ? `${v}%` : '—'

  return (
    <div className="p-4 space-y-4">
      {/* Actions */}
      <div className="card py-3 flex gap-2 flex-wrap">
        <div className="text-sm font-bold text-slate-700 flex-1">
          📊 รายงานเดือน {THAI_MONTHS[month-1]} พ.ศ. {year}
        </div>
        <button onClick={exportCSV}
          className="text-sm px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
          ⬇️ Export CSV
        </button>
        <button onClick={() => window.print()}
          className="text-sm px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
          🖨️ พิมพ์
        </button>
      </div>

      {/* Summary table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Ward</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">เตียง</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">เตียงว่าง</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">BOR%</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ PTS</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ PROD%</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 PTS</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 PROD%</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map(r => (
              <tr key={r.w.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-bold text-slate-800">{r.w.name}</td>
                <td className="px-3 py-2.5 text-center text-slate-600">{r.w.beds}</td>
                <td className="px-3 py-2.5 text-center font-bold"
                  style={{ color: r.free === null ? '#94a3b8' : r.free < 0 ? '#dc2626' : r.free < 3 ? '#d97706' : '#16a34a' }}>
                  {r.free === null ? '—' : r.free}
                </td>
                <td className="px-3 py-2.5 text-center text-slate-600">{r.bor ? `${r.bor}%` : '—'}</td>
                <td className="px-3 py-2.5 text-center font-semibold text-blue-600">{Math.round(r.dPts) || '—'}</td>
                <td className="px-3 py-2.5 text-center font-bold text-slate-700">{fmtP(r.dProd)}</td>
                <td className="px-3 py-2.5 text-center font-semibold text-purple-600">{Math.round(r.nPts) || '—'}</td>
                <td className="px-3 py-2.5 text-center font-bold text-slate-700">{fmtP(r.nProd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yearly trend */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-sm font-bold text-slate-700">📈 Trend รายปี พ.ศ. {year}</div>
          <select value={chartWardId} onChange={e => setChartWardId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400">
            {WARDS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <YearlyChart data={yearlyData} />
      </div>
    </div>
  )
}
