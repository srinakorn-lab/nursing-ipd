'use client'
import { useState, useEffect, useMemo } from 'react'
import { useWards } from '../../lib/hooks/useWards'
import { apiLoadBedsMap, apiLoadConfig } from '../../lib/storage'
import { getBedUnits, bedCategoryField, ROOM_CATEGORIES } from '../../lib/bedLayout'

// Summary buckets — order & colors match room categories
const FIELDS = ROOM_CATEGORIES.map(c => ({ key: c.field, label: c.label, color: c.color }))

export default function BedAvailabilityTab() {
  const WARDS = useWards()
  const [beds, setBeds] = useState({})       // beds_map: { wardId: { bedCode: bed } }
  const [layoutCfg, setLayoutCfg] = useState({})
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([apiLoadBedsMap(), apiLoadConfig('bed_layout')]).then(([b, layout]) => {
      setBeds(b || {})
      if (layout && typeof layout === 'object') setLayoutCfg(layout)
      setLoading(false)
    })
  }, [reloadKey])

  // Per-ward computed stats from bed map
  const wardStats = useMemo(() => {
    const stats = {}
    WARDS.forEach(w => {
      const wd = beds[w.id] || {}
      const units = getBedUnits(w, layoutCfg)
      const free = {}   // field → count
      FIELDS.forEach(f => { free[f.key] = 0 })
      let total = 0, occupied = 0, cleaning = 0, male = 0, female = 0
      units.forEach(u => {
        total++
        const bed = wd[u.code]
        const status = bed?.status || 'empty'
        if (status === 'occupied') {
          occupied++
          if (bed.sex === 'M') male++
          else if (bed.sex === 'F') female++
        } else if (status === 'cleaning') {
          cleaning++
        } else {
          free[bedCategoryField(u)]++
        }
      })
      stats[w.id] = { total, occupied, cleaning, male, female, freeTotal: total - occupied - cleaning, free }
    })
    return stats
  }, [WARDS, beds, layoutCfg])

  // Totals across all wards
  const totals = useMemo(() => {
    const t = {}
    FIELDS.forEach(f => { t[f.key] = 0 })
    let total = 0, occupied = 0, cleaning = 0, freeTotal = 0
    WARDS.forEach(w => {
      const s = wardStats[w.id]
      if (!s) return
      FIELDS.forEach(f => { t[f.key] += s.free[f.key] })
      total += s.total; occupied += s.occupied; cleaning += s.cleaning; freeTotal += s.freeTotal
    })
    return { byField: t, total, occupied, cleaning, freeTotal }
  }, [WARDS, wardStats])

  // Which wards contribute to each free-bed category
  const breakdown = useMemo(() => {
    const b = {}
    FIELDS.forEach(f => {
      b[f.key] = WARDS
        .filter(w => (wardStats[w.id]?.free[f.key] || 0) > 0)
        .map(w => ({ name: w.name, n: wardStats[w.id].free[f.key] }))
    })
    return b
  }, [WARDS, wardStats])

  return (
    <div className="p-4 space-y-4">
      {/* Header note */}
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <div className="text-sm font-bold text-slate-700 flex-1">
          🛏 สรุปเตียงว่าง — อ้างอิงตามผังเตียงอัตโนมัติ
          <div className="text-xs text-slate-400 font-normal mt-0.5">
            นับจากเตียงจริงในผังเตียง · กำหนดประเภทห้องได้ในหน้า "🗺 ผังเตียง" (🏷 ประเภทห้อง)
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5">
          🛌 <b className="text-red-600">{totals.occupied}</b> / {totals.total}
          · ว่าง <b className="text-green-600">{totals.freeTotal}</b>
          {totals.cleaning > 0 && <span className="text-amber-600"> · 🧹 {totals.cleaning}</span>}
        </div>
        <button onClick={() => setReloadKey(k => k + 1)}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">
          🔄 รีเฟรช
        </button>
      </div>

      {/* Free-bed category cards */}
      <div className="card">
        <div className="text-sm font-bold text-slate-700 mb-3">เตียงว่างตามประเภท {loading && <span className="text-xs text-slate-400">⏳</span>}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {FIELDS.map(f => (
            <div key={f.key} className="rounded-xl border px-3 py-3"
                 style={{ borderColor: f.color + '44', background: f.color + '0a' }}>
              <div className="text-xs text-slate-500 text-center">{f.label}</div>
              <div className="text-2xl font-bold mt-1 text-center" style={{ color: f.color }}>{totals.byField[f.key]}</div>
              {breakdown[f.key].length > 0 && (
                <div className="mt-2 pt-2 border-t space-y-0.5" style={{ borderColor: f.color + '33' }}>
                  {breakdown[f.key].map(w => (
                    <div key={w.name} className="flex justify-between text-xs">
                      <span className="text-slate-600 font-medium">{w.name}</span>
                      <span className="font-bold" style={{ color: f.color }}>{w.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Per-ward table */}
      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-bold text-slate-700">รายแผนก</div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">Ward</th>
              <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">ทั้งหมด</th>
              <th className="px-3 py-2.5 text-xs font-bold text-blue-500 uppercase">♂ ชาย</th>
              <th className="px-3 py-2.5 text-xs font-bold text-pink-500 uppercase">♀ หญิง</th>
              <th className="px-3 py-2.5 text-xs font-bold text-amber-500 uppercase">🧹 เตรียม</th>
              <th className="px-3 py-2.5 text-xs font-bold text-green-600 uppercase">ว่างรวม</th>
              {FIELDS.map(f => (
                <th key={f.key} className="px-2 py-2.5 text-xs font-bold uppercase" style={{ color: f.color }}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WARDS.map(w => {
              const s = wardStats[w.id]
              if (!s) return null
              return (
                <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-bold text-slate-800">{w.name}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{s.total}</td>
                  <td className="px-3 py-2 text-center font-semibold text-blue-600">{s.male || '—'}</td>
                  <td className="px-3 py-2 text-center font-semibold text-pink-600">{s.female || '—'}</td>
                  <td className="px-3 py-2 text-center font-semibold text-amber-600">{s.cleaning || '—'}</td>
                  <td className="px-3 py-2 text-center font-bold text-green-600">{s.freeTotal}</td>
                  {FIELDS.map(f => (
                    <td key={f.key} className="px-2 py-2 text-center font-semibold"
                        style={{ color: s.free[f.key] > 0 ? f.color : '#cbd5e1' }}>
                      {s.free[f.key] || '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
