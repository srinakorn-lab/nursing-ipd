'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const LV_COLORS = { lv1: '#93c5fd', lv2: '#6ee7b7', lv3: '#fcd34d', lv4: '#fb923c', lv5: '#f87171', adm: '#c084fc' }

export default function DailyPcChart({ data }) {
  // data: [{ day, lv1, lv2, lv3, lv4, lv5, adm }]
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="lv1" name="Lv.1" stackId="a" fill={LV_COLORS.lv1} maxBarSize={28} />
        <Bar dataKey="lv2" name="Lv.2" stackId="a" fill={LV_COLORS.lv2} maxBarSize={28} />
        <Bar dataKey="lv3" name="Lv.3" stackId="a" fill={LV_COLORS.lv3} maxBarSize={28} />
        <Bar dataKey="lv4" name="Lv.4" stackId="a" fill={LV_COLORS.lv4} maxBarSize={28} />
        <Bar dataKey="lv5" name="Lv.5" stackId="a" fill={LV_COLORS.lv5} maxBarSize={28} radius={[3,3,0,0]} />
        <Bar dataKey="adm" name="ADM"  stackId="b" fill={LV_COLORS.adm} maxBarSize={28} radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
