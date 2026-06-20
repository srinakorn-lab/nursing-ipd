'use client'
import { useMemo, useState } from 'react'
import StatusBadge from '../ui/StatusBadge'
import WardChips from '../ui/WardChips'
import { calcProd, prodStatus, getAvailBeds, calcPts } from '../../lib/calc'
import { WARDS } from '../../lib/constants'

export default function TableTab({ entries, cfg, oos, selected, onToggle, onSelectAll, onClearAll, onOpenOos }) {
  const [expanded, setExpanded] = useState(null)

  const wardData = useMemo(() => {
    return WARDS.filter(w => selected.includes(w.id)).map(w => {
      const e = entries[w.id] || {}
      const de = e.day, ne = e.night
      const dProd = calcProd(de, w.type, cfg)
      const nProd = calcProd(ne, w.type, cfg)
      const dPts = calcPts(de), nPts = calcPts(ne)
      const avail = getAvailBeds(w, oos)
      const bor = avail > 0 && dPts > 0 ? +(dPts / avail * 100).toFixed(1) : 0
      const free = dPts > 0 ? avail - Math.round(dPts) : null
      const oosInfo = oos?.[w.id] || {}
      return { ...w, de, ne, dProd, nProd, dPts, nPts, avail, bor, free, oosInfo,
        dStatus: prodStatus(dProd, cfg), nStatus: prodStatus(nProd, cfg) }
    })
  }, [entries, cfg, oos, selected])

  const fmt = v => v != null ? `${v}%` : '—'
  const fmtN = v => v != null ? Math.round(v) : '—'

  return (
    <div className="p-4 space-y-3">
      <WardChips selected={selected} onToggle={onToggle} onSelectAll={onSelectAll} onClearAll={onClearAll} />
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">WARD</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">เตียง</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">เตียงว่าง</th>
              <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase">BOR%</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ PTS</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ RN</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">☀️ PROD%</th>
              <th className="px-3 py-3 text-xs font-bold text-blue-500 uppercase">สถานะ DAY</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 PTS</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 RN</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">🌙 PROD%</th>
              <th className="px-3 py-3 text-xs font-bold text-purple-500 uppercase">สถานะ NIGHT</th>
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
                  <td className="px-3 py-3 text-center font-bold" style={{ color: w.dStatus.color }}>{fmt(w.dProd)}</td>
                  <td className="px-3 py-3 text-center"><StatusBadge label={w.dStatus.label} color={w.dStatus.color} /></td>
                  <td className="px-3 py-3 text-center font-semibold text-purple-600">{fmtN(w.nPts) || '—'}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{w.ne?.rn ?? '—'}</td>
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
                    <td colSpan={13} className="px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        {/* DAY breakdown */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <div className="font-bold text-blue-700 mb-2">☀️ DAY Shift</div>
                          {w.de ? (
                            <div className="space-y-1 text-slate-700">
                              <div className="grid grid-cols-3 gap-1">
                                {['lv1','lv2','lv3','lv4','lv5'].map(k => (
                                  <div key={k}><span className="text-slate-400">Lv{k.slice(2)}: </span><b>{w.de[k]||0}</b></div>
                                ))}
                                <div><span className="text-slate-400">ADM: </span><b>{w.de.adm||0}</b></div>
                                {!w.de.isICU && <div><span className="text-slate-400">TRF: </span><b>{w.de.trf||0}</b></div>}
                              </div>
                              <div className="mt-2 pt-2 border-t border-blue-200">
                                RN: <b>{w.de.rn||0}</b> | PN: <b>{w.de.pn||0}</b>
                              </div>
                            </div>
                          ) : <div className="text-slate-400 italic">ไม่มีข้อมูล</div>}
                        </div>
                        {/* NIGHT breakdown */}
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                          <div className="font-bold text-purple-700 mb-2">🌙 NIGHT Shift</div>
                          {w.ne ? (
                            <div className="space-y-1 text-slate-700">
                              <div className="grid grid-cols-3 gap-1">
                                {['lv1','lv2','lv3','lv4','lv5'].map(k => (
                                  <div key={k}><span className="text-slate-400">Lv{k.slice(2)}: </span><b>{w.ne[k]||0}</b></div>
                                ))}
                                <div><span className="text-slate-400">ADM: </span><b>{w.ne.adm||0}</b></div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-purple-200">
                                RN: <b>{w.ne.rn||0}</b> | PN: <b>{w.ne.pn||0}</b>
                              </div>
                            </div>
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
