'use client'
import { useMemo, useState, useEffect } from 'react'
import { WARDS } from '../../lib/constants'
import { loadDailyEntries, apiLoadDailyEntries, dailyStorageKey } from '../../lib/storage'
import { calcProd, prodStatus, calcPts } from '../../lib/calc'
import DailyProdChart from '../charts/DailyProdChart'
import DailyPcChart from '../charts/DailyPcChart'
import DailyRatioChart from '../charts/DailyRatioChart'
import StatusBadge from '../ui/StatusBadge'

export default function DailyTab({ cfg, year, month, onOpenDailyEdit }) {
  const [wardId, setWardId] = useState(WARDS[0].id)
  const [daily, setDaily] = useState({})
  const ward = WARDS.find(w => w.id === wardId)

  useEffect(() => {
    const local = loadDailyEntries(year, month, wardId)
    setDaily(local)  // optimistic from cache
    apiLoadDailyEntries(year, month, wardId).then(data => {
      if (data !== null) {
        const merged = { ...local, ...data }
        if (typeof window !== 'undefined')
          localStorage.setItem(dailyStorageKey(year, month, wardId), JSON.stringify(merged))
        setDaily(merged)
      }
    })
  }, [year, month, wardId])

  const daysInMonth = new Date(year - 543, month, 0).getDate()

  const rows = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const de = daily[d]?.day
      const ne = daily[d]?.night
      const dProd = calcProd(de, ward?.type || 'WARD', cfg)
      const nProd = calcProd(ne, ward?.type || 'WARD', cfg)
      return { d, de, ne, dPts: calcPts(de), nPts: calcPts(ne), dProd, nProd,
        dStatus: prodStatus(dProd, cfg), nStatus: prodStatus(nProd, cfg) }
    })
  }, [daily, ward, cfg, daysInMonth])

  const chartProd = rows.filter(r => r.dProd || r.nProd).map(r => ({ day: r.d, dayProd: r.dProd, nightProd: r.nProd }))
  const chartPc   = rows.filter(r => r.de).map(r => ({ day: r.d, lv1: r.de.lv1||0, lv2: r.de.lv2||0, lv3: r.de.lv3||0, lv4: r.de.lv4||0, lv5: r.de.lv5||0, adm: r.de.adm||0 }))
  const chartRatio = rows.filter(r => r.dPts || r.nPts).map(r => ({
    day: r.d,
    dayRatio:   r.de && r.dPts > 0 ? +(r.dPts / (r.de.rn || 1)).toFixed(1) : null,
    nightRatio: r.ne && r.nPts > 0 ? +(r.nPts / (r.ne.rn || 1)).toFixed(1) : null,
  }))
  const ratioTarget = ward?.type === 'ICU' ? cfg.icu_ratio : cfg.ward_ratio

  return (
    <div className="p-4 space-y-4">
      {/* Ward selector */}
      <div className="card py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Ward:</span>
          {WARDS.map(w => (
            <button key={w.id} onClick={() => setWardId(w.id)}
              className="text-xs font-bold px-3 py-1 rounded-full border transition-all"
              style={wardId === w.id
                ? { background: '#6366f1', color: '#fff', borderColor: '#6366f1' }
                : { background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}>
              {w.id}
            </button>
          ))}
        </div>
      </div>

      {/* Daily table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left">วันที่</th>
              <th className="px-3 py-2 bg-blue-50 text-blue-600">☀️ PTS</th>
              <th className="px-3 py-2 bg-blue-50 text-blue-600">☀️ RN</th>
              <th className="px-3 py-2 bg-blue-50 text-blue-600">☀️ PROD%</th>
              <th className="px-3 py-2 bg-blue-50 text-blue-600">สถานะ</th>
              <th className="px-3 py-2 bg-purple-50 text-purple-600">🌙 PTS</th>
              <th className="px-3 py-2 bg-purple-50 text-purple-600">🌙 RN</th>
              <th className="px-3 py-2 bg-purple-50 text-purple-600">🌙 PROD%</th>
              <th className="px-3 py-2 bg-purple-50 text-purple-600">สถานะ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.d} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-700">{r.d}</td>
                <td className="px-3 py-2 text-center text-blue-600">{r.dPts || '—'}</td>
                <td className="px-3 py-2 text-center">{r.de?.rn ?? '—'}</td>
                <td className="px-3 py-2 text-center font-bold" style={{ color: r.dStatus.color }}>
                  {r.dProd != null ? `${r.dProd}%` : '—'}
                </td>
                <td className="px-3 py-2 text-center"><StatusBadge label={r.dStatus.label} color={r.dStatus.color} /></td>
                <td className="px-3 py-2 text-center text-purple-600">{r.nPts || '—'}</td>
                <td className="px-3 py-2 text-center">{r.ne?.rn ?? '—'}</td>
                <td className="px-3 py-2 text-center font-bold" style={{ color: r.nStatus.color }}>
                  {r.nProd != null ? `${r.nProd}%` : '—'}
                </td>
                <td className="px-3 py-2 text-center"><StatusBadge label={r.nStatus.label} color={r.nStatus.color} /></td>
                <td className="px-3 py-2">
                  <button onClick={() => onOpenDailyEdit(wardId, r.d)}
                    className="text-xs px-2 py-0.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                    ✏️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      {chartProd.length > 0 && (
        <div className="card">
          <div className="text-sm font-bold text-slate-700 mb-3">📈 Productivity% รายวัน</div>
          <DailyProdChart data={chartProd} />
        </div>
      )}
      {chartPc.length > 0 && (
        <div className="card">
          <div className="text-sm font-bold text-slate-700 mb-3">🏥 Patient Classification รายวัน (DAY)</div>
          <DailyPcChart data={chartPc} />
        </div>
      )}
      {chartRatio.length > 0 && (
        <div className="card">
          <div className="text-sm font-bold text-slate-700 mb-3">👩‍⚕️ RN:Pt Ratio รายวัน</div>
          <DailyRatioChart data={chartRatio} target={ratioTarget} />
        </div>
      )}
    </div>
  )
}
