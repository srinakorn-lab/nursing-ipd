'use client'
import { THAI_MONTHS } from '../../lib/constants'

export default function Header({ year, month, onYearChange, onMonthChange, onOpenEntry }) {
  const years = [2566, 2567, 2568, 2569, 2570]
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 flex-none bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg">🏥</div>
        <div className="min-w-0">
          <div className="font-bold text-slate-800 text-sm leading-tight truncate">IPD Productivity Dashboard</div>
          <div className="text-xs text-slate-500 truncate">Admin Overview · ภาพรวมทุกวอร์ด</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <select value={year} onChange={e => onYearChange(+e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-indigo-400">
          {years.map(y => <option key={y} value={y}>พ.ศ. {y}</option>)}
        </select>
        <select value={month} onChange={e => onMonthChange(+e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-indigo-400">
          {THAI_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <button onClick={onOpenEntry}
          className="text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-lg text-white whitespace-nowrap flex-none"
          style={{ background: '#6366f1' }}>
          + บันทึกข้อมูล
        </button>
      </div>
    </header>
  )
}
