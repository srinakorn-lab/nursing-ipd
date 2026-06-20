'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function DailyProdChart({ data }) {
  // data: [{ day, dayProd, nightProd }]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
        <Tooltip formatter={v => v != null ? v.toFixed(1) + '%' : '—'} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={130} stroke="#dc2626" strokeDasharray="4 4" />
        <ReferenceLine y={110} stroke="#d97706" strokeDasharray="4 4" label={{ value: '110%', fontSize: 10, fill: '#d97706' }} />
        <ReferenceLine y={95}  stroke="#16a34a" strokeDasharray="4 4" label={{ value: '95%',  fontSize: 10, fill: '#16a34a' }} />
        <Line type="monotone" dataKey="dayProd"   name="DAY ☀️"   stroke="#6366f1" dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="nightProd" name="NIGHT 🌙" stroke="#8b5cf6" dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
