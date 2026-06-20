'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function ProdBarChart({ data }) {
  // data: [{ ward, day, night }]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
        <Tooltip formatter={(v) => v != null ? v.toFixed(1) + '%' : '—'} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={130} stroke="#dc2626" strokeDasharray="4 4" />
        <ReferenceLine y={110} stroke="#d97706" strokeDasharray="4 4" />
        <ReferenceLine y={95}  stroke="#16a34a" strokeDasharray="4 4" />
        <Bar dataKey="day"   name="DAY ☀️"   fill="#6366f1" radius={[3,3,0,0]} maxBarSize={28} />
        <Bar dataKey="night" name="NIGHT 🌙" fill="#8b5cf6" radius={[3,3,0,0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
