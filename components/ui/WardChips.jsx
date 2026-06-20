'use client'
import { WARDS } from '../../lib/constants'

const WARD_COLORS = {
  WARD: { active: '#6366f1', bg: '#eef2ff', border: '#6366f133' },
  ICU:  { active: '#7c3aed', bg: '#f5f3ff', border: '#7c3aed33' },
}

export default function WardChips({ selected, onToggle, onSelectAll, onClearAll }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">เลือก WARD</span>
        <button onClick={onSelectAll}
          className="text-xs px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 font-medium text-slate-600 border border-slate-200">
          ทั้งหมด
        </button>
        <button onClick={onClearAll}
          className="text-xs px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 font-medium text-slate-600 border border-slate-200">
          ยกเลิก
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        {WARDS.map(w => {
          const isSelected = selected.includes(w.id)
          const c = WARD_COLORS[w.type]
          return (
            <button key={w.id} onClick={() => onToggle(w.id)}
              className="text-xs font-bold px-3 py-1 rounded-full border transition-all"
              style={isSelected
                ? { background: c.active, color: '#fff', borderColor: c.active }
                : { background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}>
              {w.id}
            </button>
          )
        })}
      </div>
    </div>
  )
}
