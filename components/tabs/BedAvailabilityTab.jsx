'use client'
import { useState, useEffect, useMemo } from 'react'
import { WARDS } from '../../lib/constants'
import { apiLoadBeds, saveBeds, apiLoadBedsHistory } from '../../lib/storage'

const FIELDS = [
  { key: 'single_free',    label: 'ห้องว่างเดี่ยว', color: '#0284c7' },
  { key: 'male_free',      label: 'รวมชาย',         color: '#2563eb' },
  { key: 'female_free',    label: 'รวมหญิง',        color: '#db2777' },
  { key: 'monitor_male',   label: 'Monitor ชาย',    color: '#7c3aed' },
  { key: 'monitor_female', label: 'Monitor หญิง',   color: '#c026d3' },
]

const EMPTY_ENTRY = { wardId: WARDS[0].id, single_free: 0, male_free: 0, female_free: 0, monitor_male: 0, monitor_female: 0, remark: '' }

export default function BedAvailabilityTab() {
  const [data, setData] = useState({})
  const [form, setForm] = useState(EMPTY_ENTRY)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    apiLoadBeds().then(d => { setData(d || {}); setLoading(false) })
  }, [reloadKey])

  useEffect(() => {
    if (showHistory) {
      apiLoadBedsHistory(form.wardId, 50).then(setHistory)
    }
  }, [showHistory, form.wardId, reloadKey])

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setN(k, v) { setForm(f => ({ ...f, [k]: Math.max(0, +v || 0) })) }

  async function handleSave() {
    await saveBeds(form)
    setForm(EMPTY_ENTRY)
    setReloadKey(k => k + 1)
  }

  function pickWard(wardId) {
    const last = data[wardId]
    if (last) {
      setForm({
        wardId,
        single_free: last.single_free, male_free: last.male_free, female_free: last.female_free,
        monitor_male: last.monitor_male, monitor_female: last.monitor_female,
        remark: last.remark || '',
      })
    } else {
      setForm({ ...EMPTY_ENTRY, wardId })
    }
  }

  const totals = useMemo(() => {
    const t = { single_free: 0, male_free: 0, female_free: 0, monitor_male: 0, monitor_female: 0 }
    Object.values(data).forEach(d => FIELDS.forEach(f => { t[f.key] += d[f.key] || 0 }))
    return t
  }, [data])

  const fmtTime = ts => {
    if (!ts) return '—'
    try { return new Date(ts + 'Z').toLocaleString('th-TH', { hour12: false }) }
    catch { return ts }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Totals across all wards */}
      <div className="card">
        <div className="text-sm font-bold text-slate-700 mb-3">🛏 สรุปเตียงว่างทุก Ward</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {FIELDS.map(f => (
            <div key={f.key} className="rounded-xl border px-3 py-3 text-center"
                 style={{ borderColor: f.color + '44', background: f.color + '0a' }}>
              <div className="text-xs text-slate-500">{f.label}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: f.color }}>{totals[f.key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-ward summary table */}
      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center">
          <div className="text-sm font-bold text-slate-700 flex-1">รายแผนก (snapshot ล่าสุด)</div>
          {loading && <span className="text-xs text-slate-400">⏳ โหลด...</span>}
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">Ward</th>
              {FIELDS.map(f => (
                <th key={f.key} className="px-3 py-2.5 text-xs font-bold uppercase" style={{ color: f.color }}>{f.label}</th>
              ))}
              <th className="px-3 py-2.5 text-xs font-bold text-slate-500 uppercase">อัปเดตล่าสุด</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {WARDS.map(w => {
              const d = data[w.id]
              return (
                <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-bold text-slate-800">{w.name}</td>
                  {FIELDS.map(f => (
                    <td key={f.key} className="px-3 py-2 text-center font-semibold"
                        style={{ color: d ? f.color : '#cbd5e1' }}>
                      {d ? (d[f.key] || 0) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center text-xs text-slate-500">{fmtTime(d?.saved_at)}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => pickWard(w.id)}
                      className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100">
                      📝 แก้
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Entry form */}
      <div className="card">
        <div className="text-sm font-bold text-slate-700 mb-3">+ ลงข้อมูลเตียงว่าง</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">แผนก</label>
            <select value={form.wardId} onChange={e => pickWard(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              {WARDS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: f.color }}>{f.label}</label>
              <input type="number" min="0" value={form[f.key]}
                onChange={e => setN(f.key, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          ))}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">หมายเหตุ</label>
            <input type="text" value={form.remark}
              onChange={e => setF('remark', e.target.value)}
              placeholder="เช่น ห้อง 501 ปิดปรับปรุง"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowHistory(s => !s)}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            {showHistory ? '⬆️ ซ่อนประวัติ' : '📜 ดูประวัติ'}
          </button>
          <button onClick={handleSave}
            className="text-sm px-5 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600">
            💾 บันทึก
          </button>
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="card p-0 overflow-x-auto">
          <div className="px-4 py-2.5 border-b border-slate-200 text-sm font-bold text-slate-700">
            📜 ประวัติ {WARDS.find(w => w.id === form.wardId)?.name} ({history.length} record)
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-slate-500 font-bold uppercase">เวลา</th>
                {FIELDS.map(f => <th key={f.key} className="px-2 py-2 font-bold uppercase" style={{ color: f.color }}>{f.label}</th>)}
                <th className="text-left px-3 py-2 text-slate-500 font-bold">หมายเหตุ</th>
                <th className="px-2 py-2 text-slate-500 font-bold">Device</th>
              </tr>
            </thead>
            <tbody>
              {history.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1.5 whitespace-nowrap text-slate-600">{fmtTime(r.saved_at)}</td>
                  {FIELDS.map(f => <td key={f.key} className="px-2 py-1.5 text-center">{r[f.key] || 0}</td>)}
                  <td className="px-3 py-1.5 text-slate-500">{r.remark || ''}</td>
                  <td className="px-2 py-1.5 text-slate-400 text-[10px]">{r.device_id?.slice(0,8) || ''}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={8} className="text-center text-slate-400 py-6">ยังไม่มีประวัติ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
