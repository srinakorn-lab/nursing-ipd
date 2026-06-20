'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function BorBarChart({ data }) {
  // data: [{ ward, bor }]
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} />
        <Tooltip formatter={v => v != null ? v.toFixed(1) + '%' : '—'} />
        <ReferenceLine y={80} stroke="#d97706" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 10 }} />
        <Bar dataKey="bor" name="BOR%" fill="#0284c7" radius={[3,3,0,0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
