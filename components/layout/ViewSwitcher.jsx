'use client'
const VIEWS = [
  { id: 'desktop', label: '💻 Desktop' },
  { id: 'tablet',  label: '🖥️ Tablet', sub: '768px' },
  { id: 'mobile',  label: '📱 Mobile', sub: '390px' },
]
export default function ViewSwitcher({ active, onChange }) {
  return (
    <div className="bg-slate-800 flex items-center justify-center gap-2 px-4 py-1.5">
      <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">VIEW:</span>
      {VIEWS.map(v => (
        <button key={v.id} onClick={() => onChange(v.id)}
          className={`text-xs font-medium px-3 py-1 rounded-full border transition-all ${
            active === v.id
              ? 'bg-indigo-500 border-indigo-500 text-white'
              : 'bg-transparent border-slate-600 text-slate-300 hover:border-slate-400'
          }`}>
          {v.label}{v.sub && <span className="ml-1 opacity-70">{v.sub}</span>}
        </button>
      ))}
    </div>
  )
}
