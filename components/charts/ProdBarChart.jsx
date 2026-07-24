'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

function getThresholds(cfg, shift) {
  if (!cfg) return { opt_lo: 95, under: 110, overload: 130 }
  if (shift === 'day') return {
    opt_lo:   cfg.thr_opt_lo_day   ?? cfg.thr_opt_lo   ?? 95,
    under:    cfg.thr_under_day    ?? cfg.thr_under    ?? 110,
    overload: cfg.thr_overload_day ?? cfg.thr_overload ?? 130,
  }
  if (shift === 'night') return {
    opt_lo:   cfg.thr_opt_lo_night   ?? cfg.thr_opt_lo   ?? 95,
    under:    cfg.thr_under_night    ?? cfg.thr_under    ?? 110,
    overload: cfg.thr_overload_night ?? cfg.thr_overload ?? 130,
  }
  return {
    opt_lo:   cfg.thr_opt_lo   ?? 95,
    under:    cfg.thr_under    ?? 110,
    overload: cfg.thr_overload ?? 130,
  }
}

export default function ProdBarChart({ data, cfg, shift }) {
  // data: [{ ward, day, night }]
  const showBoth = !shift
  const dayT   = getThresholds(cfg, 'day')
  const nightT = getThresholds(cfg, 'night')
  const single = getThresholds(cfg, shift)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
        <Tooltip formatter={(v) => v != null ? v.toFixed(1) + '%' : '—'} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {showBoth ? (
          <>
            {/* DAY — solid-ish dashes */}
            <ReferenceLine y={dayT.overload} stroke="#dc2626" strokeDasharray="4 4"
              label={{ value: `D ${dayT.overload}%`, position: 'right', fontSize: 9, fill: '#dc2626' }} />
            <ReferenceLine y={dayT.under}    stroke="#d97706" strokeDasharray="4 4"
              label={{ value: `D ${dayT.under}%`,    position: 'right', fontSize: 9, fill: '#d97706' }} />
            <ReferenceLine y={dayT.opt_lo}   stroke="#16a34a" strokeDasharray="4 4"
              label={{ value: `D ${dayT.opt_lo}%`,   position: 'right', fontSize: 9, fill: '#16a34a' }} />
            {/* NIGHT — faint dotted */}
            <ReferenceLine y={nightT.overload} stroke="#dc2626" strokeDasharray="2 6" strokeOpacity={0.5}
              label={{ value: `N ${nightT.overload}%`, position: 'left', fontSize: 9, fill: '#dc2626', fillOpacity: 0.7 }} />
            <ReferenceLine y={nightT.under}    stroke="#d97706" strokeDasharray="2 6" strokeOpacity={0.5}
              label={{ value: `N ${nightT.under}%`,    position: 'left', fontSize: 9, fill: '#d97706', fillOpacity: 0.7 }} />
            <ReferenceLine y={nightT.opt_lo}   stroke="#16a34a" strokeDasharray="2 6" strokeOpacity={0.5}
              label={{ value: `N ${nightT.opt_lo}%`,   position: 'left', fontSize: 9, fill: '#16a34a', fillOpacity: 0.7 }} />
          </>
        ) : (
          <>
            <ReferenceLine y={single.overload} stroke="#dc2626" strokeDasharray="4 4" />
            <ReferenceLine y={single.under}    stroke="#d97706" strokeDasharray="4 4" />
            <ReferenceLine y={single.opt_lo}   stroke="#16a34a" strokeDasharray="4 4" />
          </>
        )}
        {(showBoth || shift === 'day') &&
          <Bar dataKey="day"   name="DAY ☀️"   fill="#6366f1" radius={[3,3,0,0]} maxBarSize={showBoth ? 28 : 48} />}
        {(showBoth || shift === 'night') &&
          <Bar dataKey="night" name="NIGHT 🌙" fill="#8b5cf6" radius={[3,3,0,0]} maxBarSize={showBoth ? 28 : 48} />}
      </BarChart>
    </ResponsiveContainer>
  )
}
