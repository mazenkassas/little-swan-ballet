import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { getTranslations, getLocale } from 'next-intl/server'

const RevenueChart = dynamic(() => import('./RevenueChart'), {
  loading: () => (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sk" style={{ width: '100%', height: 280, borderRadius: 8 }} />
    </div>
  ),
})

// Calendar day in the academy's timezone (YYYY-MM-DD). The server clock is UTC, which is
// still "yesterday" during the first hours after midnight in Cairo.
function cairoDay(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export default async function ReportsPage() {
  const t      = await getTranslations('reports')
  const tc     = await getTranslations('common')
  const locale = await getLocale()
  const isRtl  = locale === 'ar'
  const supabase = await createClient()
  const today      = cairoDay(new Date())
  const from       = addDays(today, -29)
  const monthStart = `${today.slice(0, 7)}-01`
  const dayOfMonth = Number(today.slice(8))

  const [paymentsRes, expensesRes, monthRes, studentsRes, hoursRes] = await Promise.all([
    supabase.from('payments').select('date, amount_paid').gte('date', from).lte('date', today),
    supabase.from('expenses').select('date, amount').gte('date', from).lte('date', today),
    supabase.from('payments').select('type, amount_paid').gte('date', monthStart).lte('date', today),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('coach_attendance').select('hours_worked').gte('created_at', monthStart).not('hours_worked', 'is', null),
  ])
  const loadFailed = !!(paymentsRes.error || expensesRes.error || monthRes.error)

  // One entry per day, oldest first, so days without any payment still show as zero
  const days = Array.from({ length: 30 }, (_, i) => addDays(from, i))
  const revenueByDay: Record<string, number> = {}
  const expenseByDay: Record<string, number> = {}
  days.forEach(d => { revenueByDay[d] = 0; expenseByDay[d] = 0 })

  paymentsRes.data?.forEach(p => {
    const d = String(p.date).slice(0, 10)
    if (d in revenueByDay) revenueByDay[d] += Number(p.amount_paid) || 0
  })
  expensesRes.data?.forEach(e => {
    const d = String(e.date).slice(0, 10)
    if (d in expenseByDay) expenseByDay[d] += Number(e.amount) || 0
  })

  const chartData = days.map(d => ({
    date: `${d.slice(8)}/${d.slice(5, 7)}`,
    revenue: revenueByDay[d],
    expenses: expenseByDay[d],
    net: revenueByDay[d] - expenseByDay[d],
  }))
  const revenue30  = chartData.reduce((s, d) => s + d.revenue, 0)
  const expenses30 = chartData.reduce((s, d) => s + d.expenses, 0)

  const monthPayments = monthRes.data
  const byType: Record<string, number> = {}
  monthPayments?.forEach(p => { byType[p.type] = (byType[p.type] || 0) + (Number(p.amount_paid) || 0) })

  const typeLabels: Record<string, string> = {
    subscription: tc('paymentType.subscription'), product: tc('paymentType.product'),
    event: tc('paymentType.event'), private: tc('paymentType.private'),
    exam: tc('paymentType.exam'), enrollment: tc('paymentType.enrollment'),
    level_test: tc('paymentType.level_test'),
    leotard: tc('paymentType.leotard'), bolero: tc('paymentType.bolero'),
    special_committee: tc('paymentType.special_committee'),
  }

  const totalMonthRevenue = monthPayments?.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0) || 0
  const activeStudents    = studentsRes.count ?? 0
  const totalCoachHours   = hoursRes.data?.reduce((s, h) => s + (Number(h.hours_worked) || 0), 0) || 0

  const kpis = [
    { label: t('monthRevenue'), value: formatCurrency(totalMonthRevenue), accent: '#4A8C6A', bg: 'rgba(110,200,139,0.1)', border: 'rgba(110,200,139,0.25)' },
    { label: t('activeStudents'), value: String(activeStudents), accent: '#C8788A', bg: 'rgba(200,120,138,0.1)', border: 'rgba(200,120,138,0.25)' },
    { label: t('coachHours'), value: `${totalCoachHours.toFixed(1)} ${t('hours')}`, accent: '#8B6EC8', bg: 'rgba(139,110,200,0.1)', border: 'rgba(139,110,200,0.25)' },
    { label: t('avgDailyRevenue'), value: formatCurrency(Math.round(totalMonthRevenue / dayOfMonth)), accent: '#C8A66E', bg: 'rgba(200,166,110,0.1)', border: 'rgba(200,166,110,0.25)' },
  ]

  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
  }

  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>
      {loadFailed && (
        <p style={{
          margin: '0 0 16px', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: '#e0404014', border: '1px solid #e0404040', color: '#e04040',
        }}>
          {isRtl ? 'تعذر تحميل بعض البيانات. حدّث الصفحة وحاول مرة أخرى.' : 'Some data could not be loaded. Refresh the page and try again.'}
        </p>
      )}
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
        <h2 style={{ fontWeight: 600, color: 'var(--txt1)', marginBottom: 12 }}>{t('chartTitle')}</h2>
        {/* Totals for the same 30 days the chart covers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px', marginBottom: 20 }}>
          {[
            { label: isRtl ? 'إيرادات' : 'Revenue',  value: revenue30,              color: '#d4667a' },
            { label: isRtl ? 'مصروفات' : 'Expenses', value: expenses30,             color: '#e8960a' },
            { label: isRtl ? 'الصافي' : 'Net',       value: revenue30 - expenses30, color: '#10b981' },
          ].map(s => (
            <div key={s.label}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)' }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: s.color }}>
                <bdi>{formatCurrency(s.value)}</bdi>
              </p>
            </div>
          ))}
        </div>
        <RevenueChart data={chartData} labels={
          isRtl
            ? { revenue: 'إيرادات', expenses: 'مصروفات', net: 'الصافي', empty: 'لا توجد إيرادات أو مصروفات في آخر 30 يوم' }
            : { revenue: 'Revenue', expenses: 'Expenses', net: 'Net', empty: 'No revenue or expenses in the last 30 days' }
        } />
      </div>

      {/* By Type */}
      <div style={card}>
        <h2 style={{ fontWeight: 600, color: 'var(--txt1)', marginBottom: 20 }}>{t('byTypeTitle')}</h2>
        <div className="space-y-3">
          {Object.entries(byType).sort(([, a], [, b]) => b - a).map(([type, amount]) => {
            const pct = totalMonthRevenue > 0 ? Math.round((amount / totalMonthRevenue) * 100) : 0
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
