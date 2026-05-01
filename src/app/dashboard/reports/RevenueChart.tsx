'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function RevenueChart({ data, labels }: { data: any[]; labels: { revenue: string; expenses: string; net: string } }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px', color: 'rgba(255,255,255,0.5)' }} />
        <Area type="monotone" dataKey="revenue" name={labels.revenue} stroke="#f43f5e" strokeWidth={2} fill="url(#revenue)" />
        <Area type="monotone" dataKey="expenses" name={labels.expenses} stroke="#ef4444" strokeWidth={2} fill="url(#expenses)" />
        <Area type="monotone" dataKey="net" name={labels.net} stroke="#10b981" strokeWidth={2} fill="url(#net)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
