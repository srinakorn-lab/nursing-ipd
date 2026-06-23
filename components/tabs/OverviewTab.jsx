'use client'
import { useMemo, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import KpiCard from '../ui/KpiCard'
import StatusBadge from '../ui/StatusBadge'
import WardChips from '../ui/WardChips'
import ProdBarChart from '../charts/ProdBarChart'
import { calcProd, prodStatus, getAvailBeds, calcPts } from '../../lib/calc'
import { WARDS, THAI_MONTHS } from '../../lib/constants'
import { apiLoadDailyEntries, loadDailyEntries, dailyStorageKey } from '../../lib/storage'

export default function OverviewTab({ entries, cfg, oos, selected, onToggle, onSelectAll, onClearAll, year, month, dataVersion = 0 }) {
  const [selDay, setSelDay] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [selShift, setSelShift] = useState('day')
  useEffect(() => { setSelDay(new Date().getDate()); setMounted(true) }, [])
  const [dailyAll, setDailyAll] = useState({})
  const daysInMonth = new Date(year - 543, month, 0).getDate()

  useEffect(() => {
    async function load() {
      const result = {}
      await Promise.all(WARDS.map(async w => {
        const local = loadDailyEntries(year, month, w.id)
        const data = await apiLoadDailyEntries(year, month, w.id)
        const src  = { ...local, ...(data || {}) }
        result[w.id] = src[selDay] || {}
      }))
      setDailyAll(result)
    }
    load()
  }, [year, month, selDay, dataVersion])

  const wardData = useMemo(() => {
    return WARDS.filter(w => selected.includes(w.id)).map(w => {
      const daily   = dailyAll[w.id] || {}
      const de = daily.day
      const ne = daily.night
      const hasDaily = !!(de || ne)
      // active entry based on selected shift
      const ae = selShift === 'day' ? de : ne
      const dProd = calcProd(de, w.type, cfg)
      const nProd = calcProd(ne, w.type, cfg)
      const aProd = selShift === 'day' ? dProd : nProd
      const dPts  = calcPts(de), nPts = calcPts(ne)
      const aPts  = selShift === 'day' ? dPts : nPts
      const aRN   = ae?.rn || 0
      const avail = getAvailBeds(w, oos)
      const bor   = avail > 0 && aPts > 0 ? +(aPts / avail * 100).toFixed(1) : 0
      const free  = ae ? avail - Math.round(aPts) : null
      const aRatio = aPts > 0 && aRN > 0 ? +(aPts / aRN).toFixed(1) : null
      const target = w.type === 'ICU' ? cfg.icu_ratio : cfg.ward_ratio
      return { ...w, de, ne, ae, dProd, nProd, aProd, dPts, nPts, aPts, aRN, avail, bor, free, aRatio, target,
        aStatus: prodStatus(aProd, cfg, selShift), dStatus: prodStatus(dProd, cfg, 'day'), nStatus: prodStatus(nProd, cfg, 'night'), hasDaily }
    })
  }, [dailyAll, cfg, oos, selected, selShift])

  const hasAnyData = wardData.some(w => w.ae)
  const totPts   = wardData.reduce((s, w) => s + w.aPts, 0)
  const totRN    = wardData.reduce((s, w) => s + w.aRN, 0)
  const totFree  = wardData.reduce((s, w) => s + (w.free ?? 0), 0)
  const avgProd  = (() => {
    const ws = wardData.filter(w => w.aProd != null)
    return ws.length ? +(ws.reduce((s,w)=>s+w.aProd,0)/ws.length).toFixed(1) : 0
  })()
  const avgBOR   = wardData.length ? +(wardData.reduce((s,w) => s+w.bor, 0) / wardData.length).toFixed(1) : 0
  const riskCount = wardData.filter(w => w.aProd > cfg.thr_overload).length

  const buckets = {
    Overload:      wardData.filter(w => w.aStatus?.label === 'Overload').length,
    'Under staff': wardData.filter(w => w.aStatus?.label === 'Under staff').length,
    Optimal:       wardData.filter(w => w.aStatus?.label === 'Optimal').length,
    'Over staff':  wardData.filter(w => w.aStatus?.label === 'Over staff').length,
  }

  const chartData = wardData.map(w => ({ ward: w.id, day: w.dProd, night: w.nProd }))
  const ratioData = wardData.filter(w => w.aRatio != null).map(w => ({
    ward: w.id, ratio: w.aRatio, target: w.target, over: w.aRatio > w.target,
  }))

  const STATUS_COLORS = { Overload:'#dc2626', 'Under staff':'#d97706', Optimal:'#16a34a', 'Over staff':'#2563eb' }
  const STATUS_ICONS  = { Overload:'🔴', 'Under staff':'🟠', Optimal:'🟢', 'Over staff':'🔵' }
  const shiftLabel = selShift === 'day' ? '☀️ DAY' : '🌙 NIGHT'
  const titleMonth = THAI_MONTHS[month - 1]

  return (
    <div className="p-4 space-y-4">
      <WardChips selected={selected} onToggle={onToggle} onSelectAll={onSelectAll} onClearAll={onClearAll} />

      {/* Date + Shift navigator */}
      <div className="card py-2.5 flex flex-wrap items-center gap-3" suppressHydrationWarning>
        <button onClick={() => setSelDay(d => Math.max(1, d-1))}
          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm">←</button>
        <div className="text-sm font-bold text-slate-800">
          📅 ข้อมูลวันที่ <span className="text-indigo-600">{selDay}</span> {titleMonth} พ.ศ. {year}
        </div>
        <button onClick={() => setSelDay(d => Math.min(daysInMonth, d+1))}
          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm">→</button>
        <button onClick={() => setSelDay(new Date().getDate())}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">วันนี้</button>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-2">
          {['day','night'].map(s => (
            <button key={s} onClick={() => setSelShift(s)}
              className={`text-xs px-3 py-1.5 font-semibold transition-colors ${selShift===s ? (s==='day'?'bg-blue-500 text-white':'bg-purple-600 text-white') : 'text-slate-500 hover:bg-slate-50'}`}>
              {s==='day' ? '☀️ DAY' : '🌙 NIGHT'}
            </button>
          ))}
        </div>
        {mounted && !hasAnyData && (
          <span className="text-xs text-amber-500 ml-1">⚠️ ไม่มีข้อมูลรายวัน — แสดงข้อมูลประจำเดือน</span>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Ward ที่เลือก"          value={`${wardData.length} Ward`}         color="#6366f1" />
        <KpiCard label={`ผู้ป่วยรวม (${shiftLabel})`} value={`${Math.round(totPts)} ราย`} color="#0284c7" />
        <KpiCard label="เตียงว่างรวม"            value={`${Math.round(totFree)} เตียง`}   color={totFree < 5 ? '#dc2626' : '#16a34a'} />
        <KpiCard label={`RN รวม (${shiftLabel})`}     value={`${Math.round(totRN)} คน`}   color="#059669" />
        <KpiCard label="Productivity รวม"        value={avgProd ? `${avgProd}%` : '—'}     color={avgProd > cfg.thr_overload ? '#dc2626' : avgProd > cfg.thr_under ? '#d97706' : '#16a34a'} />
        <KpiCard label="BOR เฉลี่ย"              value={avgBOR ? `${avgBOR}%` : '—'}      color="#7c3aed" />
        <KpiCard label="Ward เสี่ยง (🔴)"        value={`${riskCount} Ward`}               color={riskCount > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* Status Bar */}
      <div className="card">
        <div className="text-xs font-bold text-slate-500 uppercase mb-2">สถานะ WARD (เวร {shiftLabel})</div>
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

      {/* Productivity Chart */}
      <div className="card">
        <div className="text-sm font-bold text-slate-700 mb-3">📊 Productivity% เปรียบเทียบทุก Ward</div>
        <ProdBarChart data={chartData} />
      </div>

      {/* RN:Pt Ratio Chart */}
      {ratioData.length > 0 && (
        <div className="card">
          <div className="text-sm font-bold text-slate-700 mb-3">👩‍⚕️ อัตราส่วน RN:Pt — {shiftLabel}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratioData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, 'RN:Pt']} />
              <ReferenceLine y={cfg.ward_ratio} stroke="#16a34a" strokeDasharray="4 4"
                label={{ value: `เป้า ${cfg.ward_ratio}`, position: 'right', fontSize: 9, fill: '#16a34a' }} />
              <Bar dataKey="ratio" name="RN:Pt" fill={selShift==='day'?'#6366f1':'#7c3aed'} maxBarSize={32} radius={[4,4,0,0]}
                label={{ position: 'top', fontSize: 10, fill: '#475569' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Beds per ward grid */}
      <div className="card">
        <div className="text-sm font-bold text-slate-700 mb-3">🛏 เตียงว่างราย Ward</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {wardData.map(w => {
            const freeColor = w.free === null ? '#94a3b8'
              : w.free < 0 ? '#dc2626'
              : w.free < 3 ? '#d97706'
              : '#16a34a'
            return (
              <div key={w.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5"
                style={{ borderColor: freeColor + '44', background: freeColor + '0a' }}>
                <div>
                  <div className="text-xs font-bold text-slate-700">{w.id}</div>
                  <div className="text-xs text-slate-400">{w.avail} เตียง</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold leading-none" style={{ color: freeColor }}>
                    {w.free === null ? '—' : w.free < 0 ? `${w.free}` : `+${w.free}`}
                  </div>
                  <div className="text-xs" style={{ color: freeColor }}>
                    {w.free === null ? '' : w.free < 0 ? 'เกิน' : 'ว่าง'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
