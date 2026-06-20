'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function DailyRatioChart({ data, target = 8 }) {
  // data: [{ day, dayRatio, nightRatio }]
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={v => v != null ? '1:' + v.toFixed(1) : '—'} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={target} stroke="#6366f1" strokeDasharray="4 4"
          label={{ value: `Target 1:${target}`, position: 'right', fontSize: 10, fill: '#6366f1' }} />
        <Line type="monotone" dataKey="dayRatio"   name="DAY ☀️"   stroke="#6366f1" dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="nightRatio" name="NIGHT 🌙" stroke="#8b5cf6" dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
