'use client'
import { useMemo, useState, useEffect } from 'react'
import StatusBadge from '../ui/StatusBadge'
import WardChips from '../ui/WardChips'
import { calcProd, prodStatus, getAvailBeds, calcPts } from '../../lib/calc'
import { WARDS, THAI_MONTHS } from '../../lib/constants'
import { apiLoadDailyEntries, loadDailyEntries } from '../../lib/storage'

const LV_COLORS = ['#93c5fd','#6ee7b7','#fcd34d','#fb923c','#f87171']

export default function TableTab({ cfg, oos, selected, onToggle, onSelectAll, onClearAll, onOpenOos, year, month, dataVersion = 0 }) {
  const [expanded, setExpanded] = useState(null)
  const [selDay, setSelDay] = useState(1)
  const [dailyAll, setDailyAll] = useState({})
  const daysInMonth = new Date(year - 543, month, 0).getDate()

  useEffect(() => { setSelDay(new Date().getDate()) }, [])

  useEffect(() => {
    async function load() {
      const result = {}
      await Promise.all(WARDS.map(async w => {
        const local = loadDailyEntries(year, month, w.id)
        const remote = await apiLoadDailyEntries(year, month, w.id)
        const src = { ...local, ...(remote || {}) }
        result[w.id] = src[selDay] || {}
      }))
      setDailyAll(result)
    }
    load()
  }, [year, month, selDay, dataVersion])

  const wardData = useMemo(() => {
    return WARDS.filter(w => selected.includes(w.id)).map(w => {
      const e  = dailyAll[w.id] || {}
      const de = e.day, ne = e.night
      const dProd = calcProd(de, w.type, cfg)
      const nProd = calcProd(ne, w.type, cfg)
      const dPts = calcPts(de), nPts = calcPts(ne)
      const dRN  = de?.rn || 0, nRN = ne?.rn || 0
      const avail = getAvailBeds(w, oos)
      const bor = avail > 0 && dPts > 0 ? +(dPts / avail * 100).toFixed(1) : 0
      const free = dPts > 0 ? avail - Math.round(dPts) : null
      const oosInfo = oos?.[w.id] || {}
      const dRatio = dPts > 0 && dRN > 0 ? +(dPts / dRN).toFixed(1) : null
      const nRatio = nPts > 0 && nRN > 0 ? +(nPts / nRN).toFixed(1) : null
      return { ...w, de, ne, dProd, nProd, dPts, nPts, dRN, nRN, avail, bor, free, oosInfo, dRatio, nRatio,
        dStatus: prodStatus(dProd, cfg, 'day'), nStatus: prodStatus(nProd, cfg, 'night') }
    })
  }, [dailyAll, cfg, oos, selected])

  const fmt = v => v != null ? `${v}%` : '—'
  const fmtN = v => v != null ? Math.round(v) : '—'

  return (
    <div className="p-4 space-y-3">
      <WardChips selected={selected} onToggle={onToggle} onSelectAll={onSelectAll} onClearAll={onClearAll} />
      <div className="card py-2.5 flex flex-wrap items-center gap-3" suppressHydrationWarning>
        <button onClick={() => setSelDay(d => Math.max(1, d-1))}
          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm">←</button>
        <div className="text-sm font-bold text-slate-800">
          📅 ข้อมูลวันที่ <span className="text-indigo-600">{selDay}</span> {THAI_MONTHS[month-1]} พ.ศ. {year}
        </div>
        <button onClick={() => setSelDay(d => Math.min(daysInMonth, d+1))}
          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-sm">→</button>
        <button onClick={() => setSelDay(new Date().getDate())}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">วันนี้</button>
      </div>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">WARD</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">เตียง</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">ว่าง</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">BOR%</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ Pt</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ RN</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ RN:Pt</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ PROD%</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">DAY</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 Pt</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 RN</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 RN:Pt</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 PROD%</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">NIGHT</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {wardData.map(w => (
              <>
                <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{w.name}</span>
                      {w.type === 'ICU' && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">ICU</span>}
                    </div>
                    {w.oosInfo.count > 0 && (
                      <div className="text-xs text-red-500 mt-0.5">🔧 ปิด {w.oosInfo.count} เตียง</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">{w.beds}</td>
                  <td className="px-3 py-3 text-center font-bold"
                    style={{ color: w.free === null ? '#94a3b8' : w.free < 0 ? '#dc2626' : w.free < 3 ? '#d97706' : '#16a34a' }}>
                    {w.free === null ? '—' : w.free}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">{w.bor ? `${w.bor}%` : '0%'}</td>
                  <td className="px-3 py-3 text-center font-semibold text-blue-600">{fmtN(w.dPts) || '—'}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{w.de?.rn ?? '—'}</td>
                  <td className="px-3 py-3 text-center font-semibold"
                    style={{ color: w.dRatio != null && w.dRatio > (w.type==='ICU'?cfg.icu_ratio:cfg.ward_ratio) ? '#dc2626' : '#0284c7' }}>
                    {w.dRatio ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-center font-bold" style={{ color: w.dStatus.color }}>{fmt(w.dProd)}</td>
                  <td className="px-3 py-3 text-center"><StatusBadge label={w.dStatus.label} color={w.dStatus.color} /></td>
                  <td className="px-3 py-3 text-center font-semibold text-purple-600">{fmtN(w.nPts) || '—'}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{w.ne?.rn ?? '—'}</td>
                  <td className="px-3 py-3 text-center font-semibold"
                    style={{ color: w.nRatio != null && w.nRatio > (w.type==='ICU'?cfg.icu_ratio:cfg.ward_ratio) ? '#dc2626' : '#7c3aed' }}>
                    {w.nRatio ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-center font-bold" style={{ color: w.nStatus.color }}>{fmt(w.nProd)}</td>
                  <td className="px-3 py-3 text-center"><StatusBadge label={w.nStatus.label} color={w.nStatus.color} /></td>
                  <td className="px-3 py-3">
                    <button onClick={e => { e.stopPropagation(); onOpenOos(w.id) }}
                      className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-100">
                      🔧 ซ่อม?
                    </button>
                  </td>
                </tr>
                {expanded === w.id && (
                  <tr key={w.id + '-expand'} className="bg-slate-50">
                    <td colSpan={15} className="px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        {/* DAY breakdown */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <div className="font-bold text-blue-700 mb-2">☀️ DAY — Pt by Level</div>
                          {w.de ? (
                            <>
                              <div className="flex gap-1 mb-2">
                                {['lv1','lv2','lv3','lv4','lv5'].map((k,i) => (
                                  <div key={k} className="flex-1 rounded-lg text-center py-1.5"
                                    style={{ background: LV_COLORS[i] + '33', border: `1px solid ${LV_COLORS[i]}88` }}>
                                    <div className="text-slate-500 font-semibold" style={{ fontSize: 9 }}>Lv.{i+1}</div>
                                    <div className="font-bold text-slate-800">{w.de[k]||0}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="text-slate-500 space-y-0.5 border-t border-blue-200 pt-2">
                                <div>ADM: <b>{w.de.adm||0}</b> | TRF: <b>{w.de.trf||0}</b></div>
                                <div>RN: <b>{w.de.rn||0}</b> | PN: <b>{w.de.pn||0}</b> | NA: <b>{w.de.na||0}</b></div>
                                <div>RN:Pt = <b className="text-blue-700">{w.dRatio ?? '—'}</b></div>
                              </div>
                            </>
                          ) : <div className="text-slate-400 italic">ไม่มีข้อมูล</div>}
                        </div>
                        {/* NIGHT breakdown */}
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                          <div className="font-bold text-purple-700 mb-2">🌙 NIGHT — Pt by Level</div>
                          {w.ne ? (
                            <>
                              <div className="flex gap-1 mb-2">
                                {['lv1','lv2','lv3','lv4','lv5'].map((k,i) => (
                                  <div key={k} className="flex-1 rounded-lg text-center py-1.5"
                                    style={{ background: LV_COLORS[i] + '33', border: `1px solid ${LV_COLORS[i]}88` }}>
                                    <div className="text-slate-500 font-semibold" style={{ fontSize: 9 }}>Lv.{i+1}</div>
                                    <div className="font-bold text-slate-800">{w.ne[k]||0}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="text-slate-500 space-y-0.5 border-t border-purple-200 pt-2">
                                <div>ADM: <b>{w.ne.adm||0}</b></div>
                                <div>RN: <b>{w.ne.rn||0}</b> | PN: <b>{w.ne.pn||0}</b> | NA: <b>{w.ne.na||0}</b></div>
                                <div>RN:Pt = <b className="text-purple-700">{w.nRatio ?? '—'}</b></div>
                              </div>
                            </>
                          ) : <div className="text-slate-400 italic">ไม่มีข้อมูล</div>}
                        </div>
                        {/* Bed info */}
                        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                          <div className="font-bold text-slate-700 mb-2">🛏 เตียง</div>
                          <div className="space-y-1 text-slate-700">
                            <div>ทั้งหมด: <b>{w.beds}</b></div>
                            <div>เปิดใช้งาน: <b>{w.avail}</b></div>
                            {w.oosInfo.count > 0 && (
                              <div className="text-red-600">ปิด: <b>{w.oosInfo.count}</b></div>
                            )}
                            {w.oosInfo.remark && (
                              <div className="text-amber-600 mt-1 whitespace-pre-line">📝 {w.oosInfo.remark}</div>
                            )}
                            <div>BOR%: <b>{w.bor}%</b></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {wardData.length === 0 && (
          <div className="p-8 text-center text-slate-400">ไม่มีข้อมูล — กรุณาเลือก Ward หรือเพิ่มข้อมูล</div>
        )}
      </div>
    </div>
  )
}
