'use client'
import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { WARDS, THAI_MONTHS } from '../../lib/constants'

const EMPTY = { wardId: '', date: '', shift: 'DAY', lv1:0,lv2:0,lv3:0,lv4:0,lv5:0, adm:0,trf:0,ods:0, rn:0,pn:0 }

export default function EntryModal({ open, onClose, onSave, initialData, year, month }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({ ...EMPTY, ...initialData })
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
  function setNum(k, v) { setForm(f => ({ ...f, [k]: Math.max(0, +v || 0) })) }

  function handleSave() {
    if (!form.wardId || !form.date) { alert('กรุณาเลือก Ward และวันที่'); return }
    if (!form.rn && form.rn !== 0) { alert('กรุณากรอกจำนวน RN'); return }
    onSave(form)
    onClose()
  }

  const numInput = (label, key) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <input type="number" min="0" value={form[key]}
        onChange={e => setNum(key, e.target.value)}
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

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: '#6366f1' }}>
            💾 บันทึก
          </button>
        </div>
      </div>
    </Modal>
  )
}
