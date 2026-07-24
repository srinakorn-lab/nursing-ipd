'use client'
import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { WARDS, THAI_MONTHS, ACTIVITIES } from '../../lib/constants'

const EMPTY = { wardId: '', date: '', shift: 'DAY', lv1:0,lv2:0,lv3:0,lv4:0,lv5:0, adm:0,trf:0,ods:0, rn:0,pn:0, activities: {} }

export default function EntryModal({ open, onClose, onSave, initialData, year, month }) {
  const [form, setForm] = useState(EMPTY)
  const [showAct, setShowAct] = useState(false)
  const actCount = Object.values(form.activities || {}).filter(v => v > 0).length

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({ ...EMPTY, ...initialData, activities: initialData.activities || {} })
      } else {
        const today = new Date()
        const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        setForm({ ...EMPTY, date: dateStr, wardId: WARDS[0].id })
      }
    }
  }, [open, initialData])

  const ward = WARDS.find(w => w.id === form.wardId)
  const isICU = ward?.type === 'ICU'

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  const clamp = v => Math.max(0, Math.floor(+v || 0))

  // Keep the raw string while the user is typing — clamping on every keystroke
  // snaps the DOM value back to a canonical number mid-edit, which resets the
  // cursor and (on mobile keyboards especially) feels like the field "kicks you out".
  // Clamp only on blur, plus a final safety pass in handleSave.
  function setNum(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function blurNum(k) { setForm(f => ({ ...f, [k]: clamp(f[k]) })) }
  function setAct(k, v) { setForm(f => ({ ...f, activities: { ...f.activities, [k]: v } })) }
  function blurAct(k) { setForm(f => ({ ...f, activities: { ...f.activities, [k]: clamp(f.activities?.[k]) } })) }

  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.wardId || !form.date) { alert('กรุณาเลือก Ward และวันที่'); return }
    if (!form.rn && form.rn !== 0) { alert('กรุณากรอกจำนวน RN'); return }
    // Final safety pass — clamp any field that never got a blur event (e.g. saved right after typing)
    const NUM_KEYS = ['lv1','lv2','lv3','lv4','lv5','adm','trf','ods','rn','pn','na']
    const cleanForm = { ...form }
    NUM_KEYS.forEach(k => { if (k in cleanForm) cleanForm[k] = clamp(cleanForm[k]) })
    cleanForm.activities = Object.fromEntries(
      Object.entries(form.activities || {}).map(([k, v]) => [k, clamp(v)])
    )
    setSaving(true)
    const ok = await onSave(cleanForm)
    setSaving(false)
    if (ok === false) {
      alert('⚠️ บันทึกไม่สำเร็จ — เครือข่ายขัดข้องหรือเซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองกดบันทึกอีกครั้ง')
      return  // keep modal + form data open so the user can retry without re-typing
    }
    onClose()
  }

  const numInput = (label, key) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <input type="number" min="0" value={form[key]}
        onChange={e => setNum(key, e.target.value)}
        onBlur={() => blurNum(key)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="📋 บันทึกข้อมูลรายวัน">
      <div className="space-y-4">
        {/* Ward + Date + Shift */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ward</label>
            <select value={form.wardId} onChange={e => set('wardId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              <option value="">-- เลือก --</option>
              {WARDS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">วันที่</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">เวร</label>
            <select value={form.shift} onChange={e => set('shift', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              <option value="DAY">☀️ DAY</option>
              <option value="NIGHT">🌙 NIGHT</option>
            </select>
          </div>
        </div>

        {/* Patient Classification */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <div className="text-xs font-bold text-blue-700 mb-2">🏥 Patient Classification</div>
          <div className="grid grid-cols-3 gap-2">
            {numInput('Lv.1 Self Care', 'lv1')}
            {numInput('Lv.2 Minimal', 'lv2')}
            {numInput('Lv.3 Intermediate', 'lv3')}
            {numInput('Lv.4 Mod.Intensive', 'lv4')}
            {numInput('Lv.5 Intensive', 'lv5')}
            {numInput('ADM รับใหม่', 'adm')}
            {!isICU && numInput('TRF รับย้าย', 'trf')}
            {!isICU && form.shift === 'DAY' && numInput('ODS Day Case', 'ods')}
          </div>
        </div>

        {/* Staff */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
          <div className="text-xs font-bold text-green-700 mb-2">👩‍⚕️ อัตรากำลัง</div>
          <div className="grid grid-cols-3 gap-2">
            {numInput('RN (พยาบาล)', 'rn')}
            {numInput('PN (เจ้าพนักงาน)', 'pn')}
            {numInput('NA (ผู้ช่วย)', 'na')}
          </div>
        </div>

        {/* Workload activities */}
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
          <button type="button" onClick={() => setShowAct(s => !s)}
            className="w-full flex items-center justify-between text-xs font-bold text-purple-700">
            <span>⚙️ หัตถการ / ภาระงานเฉพาะ (ไม่บังคับ)</span>
            <span>{showAct ? '▲ ซ่อน' : '▼ แสดง'}{actCount > 0 ? ` · ${actCount} รายการ` : ''}</span>
          </button>
          {showAct && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {ACTIVITIES.map(a => (
                <div key={a.key}>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 truncate" title={a.label}>{a.label}</label>
                  <input type="number" min="0" value={form.activities?.[a.key] ?? 0}
                    onChange={e => setAct(a.key, e.target.value)}
                    onBlur={() => blurAct(a.key)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-purple-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: '#6366f1' }}>
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
