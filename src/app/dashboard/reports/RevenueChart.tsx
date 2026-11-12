'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export interface RevenuePoint { date: string; revenue: number; expenses: number; net: number }

interface Props {
  data: RevenuePoint[]
  labels: { revenue: string; expenses: string; net: string; empty: string }
}

const COLORS = { revenue: '#d4667a', expenses: '#e8960a', net: '#10b981' }

const money = (v: unknown) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(v) || 0)
const compact = (v: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

export default function RevenueChart({ data, labels }: Props) {
  const empty = data.every(d => !d.revenue && !d.expenses)

  return (
    // Charts are always drawn left to right, also on the Arabic page
    <div dir="ltr" style={{ direction: 'ltr', position: 'relative' }}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <defs>
            {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map(k => (
              <linearGradient key={k} id={`rc-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[k]} stopOpacity={0.28} />
                <stop offset="95%" stopColor={COLORS[k]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'var(--txt2)', fontSize: 11 }} axisLine={false} tickLine={false}
            interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fill: 'var(--txt2)', fontSize: 11 }} axisLine={false} tickLine={false}
            width={48} tickFormatter={compact} />
          <Tooltip
            formatter={value => money(value)}
            contentStyle={{ background: 'var(--bg-popup)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--txt1)' }}
            labelStyle={{ color: 'var(--txt2)' }}
          />
          <Legend wrapperStyle={{ paddingTop: 20, color: 'var(--txt2)', fontSize: 13 }} />
          <Area type="monotone" dataKey="revenue" name={labels.revenue} stroke={COLORS.revenue} strokeWidth={2} fill="url(#rc-revenue)" />
          <Area type="monotone" dataKey="expenses" name={labels.expenses} stroke={COLORS.expenses} strokeWidth={2} fill="url(#rc-expenses)" />
          <Area type="monotone" dataKey="net" name={labels.net} stroke={COLORS.net} strokeWidth={2} fill="url(#rc-net)" />
        </AreaChart>
      </ResponsiveContainer>
      {empty && (
        <p style={{
          position: 'absolute', inset: '0 0 60px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--txt2)', fontSize: 13, pointerEvents: 'none',
        }}>{labels.empty}</p>
      )}
    </div>
  )
}
