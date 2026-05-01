import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { format, subDays, startOfMonth } from 'date-fns'
import dynamic from 'next/dynamic'
import { getTranslations, getLocale } from 'next-intl/server'

const RevenueChart = dynamic(() => import('./RevenueChart'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sk" style={{ width: '100%', height: 280, borderRadius: 8 }} />
    </div>
  ),
})

export default async function ReportsPage() {
  const t      = await getTranslations('reports')
  const tc     = await getTranslations('common')
  const locale = await getLocale()
  const isRtl  = locale === 'ar'
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: last30Payments } = await supabase
    .from('payments')
    .select('date, amount_paid, type')
    .gte('date', format(subDays(new Date(), 29), 'yyyy-MM-dd'))
    .lte('date', today)
    .order('date')

  const { data: last30Expenses } = await supabase
    .from('expenses')
    .select('date, amount')
    .gte('date', format(subDays(new Date(), 29), 'yyyy-MM-dd'))
    .lte('date', today)

  const revenueByDay: Record<string, number> = {}
  const expenseByDay: Record<string, number> = {}

  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    revenueByDay[d] = 0
    expenseByDay[d] = 0
  }

  last30Payments?.forEach(p => { revenueByDay[p.date] = (revenueByDay[p.date] || 0) + p.amount_paid })
  last30Expenses?.forEach(e => { expenseByDay[e.date] = (expenseByDay[e.date] || 0) + e.amount })

  const chartData = Object.keys(revenueByDay).map(date => ({
    date: format(new Date(date), 'dd/MM'),
    revenue: revenueByDay[date],
    expenses: expenseByDay[date] || 0,
    net: revenueByDay[date] - (expenseByDay[date] || 0),
  }))

  const { data: monthPayments } = await supabase
    .from('payments')
    .select('type, amount_paid')
    .gte('date', monthStart)
    .lte('date', today)

  const byType: Record<string, number> = {}
  monthPayments?.forEach(p => { byType[p.type] = (byType[p.type] || 0) + p.amount_paid })

  const typeLabels: Record<string, string> = {
    subscription: tc('paymentType.subscription'), product: tc('paymentType.product'),
    event: tc('paymentType.event'), private: tc('paymentType.private'),
    exam: tc('paymentType.exam'), enrollment: tc('paymentType.enrollment'),
  }

  const totalMonthRevenue = monthPayments?.reduce((s, p) => s + p.amount_paid, 0) || 0
  const { data: activeStudents } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active')
  const { data: coachHours } = await supabase.from('coach_attendance').select('hours_worked').gte('created_at', monthStart).not('hours_worked', 'is', null)
  const totalCoachHours = coachHours?.reduce((s, h) => s + (h.hours_worked || 0), 0) || 0

  const kpis = [
    { label: t('monthRevenue'), value: formatCurrency(totalMonthRevenue), accent: '#4A8C6A', bg: 'rgba(110,200,139,0.1)', border: 'rgba(110,200,139,0.25)' },
    { label: t('activeStudents'), value: (activeStudents as any)?.toString() || '0', accent: '#C8788A', bg: 'rgba(200,120,138,0.1)', border: 'rgba(200,120,138,0.25)' },
    { label: t('coachHours'), value: `${totalCoachHours.toFixed(1)} ${t('hours')}`, accent: '#8B6EC8', bg: 'rgba(139,110,200,0.1)', border: 'rgba(139,110,200,0.25)' },
    { label: t('avgDailyRevenue'), value: formatCurrency(totalMonthRevenue / 30), accent: '#C8A66E', bg: 'rgba(200,166,110,0.1)', border: 'rgba(200,166,110,0.25)' },
  ]

  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
  }

  return (
    <div style={{ padding: 32, background: 'var(--bg-page)', minHeight: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{t('title')}</h1>
        <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 4 }}>{t('subtitle')}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: kpi.accent, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ fontWeight: 600, color: 'var(--txt1)', marginBottom: 24 }}>{t('chartTitle')}</h2>
        <RevenueChart data={chartData} labels={
          isRtl
            ? { revenue: 'إيرادات', expenses: 'مصروفات', net: 'الصافي' }
            : { revenue: 'Revenue', expenses: 'Expenses', net: 'Net' }
        } />
      </div>

      {/* By Type */}
      <div style={card}>
        <h2 style={{ fontWeight: 600, color: 'var(--txt1)', marginBottom: 20 }}>{t('byTypeTitle')}</h2>
        <div className="space-y-3">
          {Object.entries(byType).sort(([, a], [, b]) => b - a).map(([type, amount]) => {
            const pct = Math.round((amount / totalMonthRevenue) * 100)
            return (
              <div key={type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--txt2)' }}>{typeLabels[type] || type}</span>
                  <span style={{ fontWeight: 500, color: 'var(--txt1)' }}>{formatCurrency(amount)} ({pct}%)</span>
                </div>
                <div style={{ background: 'var(--bg2)', borderRadius: 99, height: 8 }}>
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {Object.keys(byType).length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--txt2)', textAlign: 'center', padding: '16px 0', opacity: 0.6 }}>{tc('noDataThisMonth')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
