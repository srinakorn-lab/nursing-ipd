export default function StatusBadge({ label, color }) {
  if (!label || label === '—') return <span className="text-slate-400 text-sm">—</span>
  const bg = color + '18'
  return (
    <span className="inline-block rounded-full px-3 py-0.5 text-xs font-bold border"
          style={{ color, background: bg, borderColor: color + '44' }}>
      {label}
    </span>
  )
}
