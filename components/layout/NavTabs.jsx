'use client'
const TABS = [
  { id: 'overview',   label: '🏢 Admin Overview' },
  { id: 'table',      label: '📋 ตารางรายวอร์ด' },
  { id: 'chart',      label: '📊 กราฟเปรียบเทียบ' },
  { id: 'daily',      label: '📅 รายวัน' },
  { id: 'wardreport', label: '🏥 รายงาน Ward' },
  { id: 'beds',       label: '🛏 เตียงว่าง' },
  { id: 'report',     label: '📊 รายงานรวม' },
  { id: 'settings',   label: '⚙️ ตั้งค่า' },
]
export default function NavTabs({ active, onChange }) {
  return (
    <nav className="bg-white border-b border-slate-200 px-4 flex gap-1 overflow-x-auto sticky top-[61px] z-20">
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`text-sm font-medium px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
            active === t.id
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
