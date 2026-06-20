'use client'
import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { WARDS } from '../../lib/constants'

export default function OosModal({ open, wardId, oosData, onClose, onSave }) {
  const ward = WARDS.find(w => w.id === wardId)
  const [count, setCount] = useState(0)
  const [remark, setRemark] = useState('')

  useEffect(() => {
    if (open && wardId) {
      const d = oosData?.[wardId] || {}
      setCount(d.count || 0)
      setRemark(d.remark || '')
    }
  }, [open, wardId, oosData])

  const avail = Math.max(0, (ward?.beds || 0) - count)

  function handleSave() {
    onSave(wardId, { count: Math.max(0, +count || 0), remark })
    onClose()
  }
  function handleClear() {
    setCount(0); setRemark('')
  }

  return (
    <Modal open={open} onClose={onClose} title={`🔧 ห้องซ่อม / ใช้ไม่ได้ — ${ward?.name || wardId}`} maxWidth="420px">
      <p className="text-xs text-slate-500 mb-4">ระบุจำนวนห้องที่ซ่อมและรายละเอียด ระบบจะหักออกจากเตียงทั้งหมดอัตโนมัติ</p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">🛏 จำนวนห้องซ่อม</label>
          <input type="number" min="0" max={ward?.beds} value={count}
            onChange={e => setCount(Math.max(0, Math.min(ward?.beds || 999, +e.target.value || 0)))}
            className="w-full border-2 border-red-200 rounded-xl px-3 py-2 text-2xl font-bold text-center text-red-600 focus:outline-none focus:border-red-400" />
          <div className="text-xs text-slate-500 mt-1 text-center">เหลือ {avail} เตียง</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">📝 รายละเอียดห้อง</label>
          <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3}
            placeholder={'เช่น\n801 น้ำรั่ว\n802 แอร์ไม่เย็น'}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
        </div>
      </div>
      <div className={`rounded-xl p-3 text-sm mb-4 ${count === 0 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-orange-50 border border-orange-200 text-orange-700'}`}>
        {count === 0
          ? `✅ ไม่มีห้องซ่อม — ใช้งานได้ทั้ง ${ward?.beds} เตียง`
          : `🔧 ซ่อม ${count} ห้อง → เปิดใช้งาน ${avail} / ${ward?.beds} เตียง`}
      </div>
      <div className="flex gap-2 justify-between">
        <button onClick={handleClear} className="px-3 py-2 text-sm rounded-lg text-red-600 border border-red-200 hover:bg-red-50">ล้างข้อมูล</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: '#6366f1' }}>💾 บันทึก</button>
        </div>
      </div>
    </Modal>
  )
}
