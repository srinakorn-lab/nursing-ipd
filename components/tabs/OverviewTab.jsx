'use client'
import { useMemo } from 'react'
import KpiCard from '../ui/KpiCard'
import StatusBadge from '../ui/StatusBadge'
import WardChips from '../ui/WardChips'
import ProdBarChart from '../charts/ProdBarChart'
import { calcProd, prodStatus, getAvailBeds, calcPts } from '../../lib/calc'
import { WARDS } from '../../lib/constants'

export default function OverviewTab({ entries, cfg, oos, selected, onToggle, onSelectAll, onClearAll }) {
  const wardData = useMemo(() => {
    return WARDS.filter(w => selected.includes(w.id)).map(w => {
      const e = entries[w.id] || {}
      const de = e.day, ne = e.night
      const dProd = calcProd(de, w.type, cfg)
      const nProd = calcProd(ne, w.type, cfg)
      const dPts  = calcPts(de), nPts = calcPts(ne)
      const dRN   = de?.rn || 0
      const avail = getAvailBeds(w, oos)
      const bor   = avail > 0 && dPts > 0 ? +(dPts / avail * 100).toFixed(1) : 0
      const free  = dPts > 0 ? avail - Math.round(dPts) : null
      return { ...w, dProd, nProd, dPts, nPts, dRN, avail, bor, free,
        dStatus: prodStatus(dProd, cfg), nStatus: prodStatus(nProd, cfg) }
    })
  }, [entries, cfg, oos, selected])

  const totPts    = wardData.reduce((s, w) => s + w.dPts, 0)
  const totRN     = wardData.reduce((s, w) => s + w.dRN, 0)
  const totFree   = wardData.reduce((s, w) => s + (w.free ?? 0), 0)
  const avgProd   = wardData.length ? +(wardData.reduce((s,w) => s+(w.dProd||0), 0) / wardData.filter(w=>w.dProd).length || 0).toFixed(1) : 0
  const avgBOR    = wardData.length ? +(wardData.reduce((s,w) => s+w.bor, 0) / wardData.length).toFixed(1) : 0
  const riskCount = wardData.filter(w => w.dProd > cfg.thr_overload).length

  const buckets = {
    Overload:    wardData.filter(w => w.dStatus.label === 'Overload').length,
    'Under staff': wardData.filter(w => w.dStatus.label === 'Under staff').length,
    Optimal:     wardData.filter(w => w.dStatus.label === 'Optimal').length,
    'Over staff':  wardData.filter(w => w.dStatus.label === 'Over staff').length,
  }

  const chartData = wardData.map(w => ({ ward: w.id, day: w.dProd, night: w.nProd }))

  const STATUS_COLORS = { Overload:'#dc2626', 'Under staff':'#d97706', Optimal:'#16a34a', 'Over staff':'#2563eb' }
  const STATUS_ICONS  = { Overload:'🔴', 'Under staff':'🟠', Optimal:'🟢', 'Over staff':'🔵' }

  return (
    <div className="p-4 space-y-4">
      <WardChips selected={selected} onToggle={onToggle} onSelectAll={onSelectAll} onClearAll={onClearAll} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Ward ที่เลือก"   value={`${wardData.length} Ward`}        color="#6366f1" />
        <KpiCard label="ผู้ป่วยรวม (DAY)" value={`${Math.round(totPts)} ราย`}   color="#0284c7" />
        <KpiCard label="เตียงว่างรวม"     value={`${Math.round(totFree)} เตียง`} color={totFree < 5 ? '#dc2626' : '#16a34a'} />
        <KpiCard label="RN รวม (DAY)"     value={`${Math.round(totRN)} คน`}      color="#059669" />
        <KpiCard label="Productivity รวม" value={avgProd ? `${avgProd}%` : '—'}  color={avgProd > cfg.thr_overload ? '#dc2626' : avgProd > cfg.thr_under ? '#d97706' : '#16a34a'} />
        <KpiCard label="BOR เฉลี่ย"       value={avgBOR ? `${avgBOR}%` : '—'}   color="#7c3aed" />
        <KpiCard label="Ward เสี่ยง (🔴)"  value={`${riskCount} Ward`}            color={riskCount > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* Status Bar */}
      <div className="card">
        <div className="text-xs font-bold text-slate-500 uppercase mb-2">สถานะ WARD (เวร DAY)</div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(buckets).map(([label, count]) => (
            <div key={label} className="flex items-center gap-2">
              <span style={{ color: STATUS_COLORS[label] }}>{STATUS_ICONS[label]}</span>
              <span className="text-sm font-semibold text-slate-700">{label}</span>
              <span className="text-lg font-bold" style={{ color: STATUS_COLORS[label] }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="text-sm font-bold text-slate-700 mb-3">📊 Productivity% เปรียบเทียบทุก Ward</div>
        <ProdBarChart data={chartData} />
      </div>
    </div>
  )
}
