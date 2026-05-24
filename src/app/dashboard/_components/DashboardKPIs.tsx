import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { Users, AlertCircle, TrendingUp, BookOpen } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function DashboardKPIs() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()
  const today  = format(new Date(), 'yyyy-MM-dd')

  const [
    { count: totalStudents },
    { count: activeStudents },
    { count: activeClasses },
    { data: todayPayments },
    { data: todayExpenses },
    { data: paymentRequired },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('payments').select('amount_paid').eq('date', today),
    supabase.from('expenses').select('amount').eq('date', today),
    supabase.from('subscriptions').select('student:students(id)').eq('status', 'active').eq('remaining_sessions', 0),
  ])

  const totalRevenue = todayPayments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
  const totalExp     = todayExpenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
  const netRevenue   = totalRevenue - totalExp

  const kpis = [
    {
      icon: <Users size={17} />,
      label: t('totalStudents'),
      value: String(activeStudents || 0),
      sub: `${totalStudents || 0} ${t('totalLabel')}`,
      accent: '#C8788A',
      alert: false,
    },
    {
      icon: <AlertCircle size={17} />,
      label: t('paymentRequiredTitle'),
      value: String(paymentRequired?.length || 0),
      sub: t('sessionsZeroLabel'),
      accent: '#e04040',
      alert: (paymentRequired?.length || 0) > 0,
    },
    {
      icon: <TrendingUp size={17} />,
      label: t('netRevenueToday'),
      value: formatCurrency(netRevenue),
      sub: `${formatCurrency(totalRevenue)} − ${formatCurrency(totalExp)}`,
      accent: netRevenue >= 0 ? '#4A8C6A' : '#e04040',
      alert: false,
    },
    {
      icon: <BookOpen size={17} />,
      label: t('activeClasses'),
      value: String(activeClasses || 0),
      sub: t('activeClasses'),
      accent: '#8B6EC8',
      alert: false,
    },
  ]

  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
  }

  return (
    <div className="kpi-grid-4" style={{ marginBottom: 16, alignItems: 'stretch' }}>
      {kpis.map(kpi => (
        <div key={kpi.label} style={{ ...card, padding: 20, position: 'relative', overflow: 'hidden' }}>
          {kpi.alert && (
            <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, background: '#e04040' }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt2)' }}>{kpi.label}</span>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: kpi.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.accent, flexShrink: 0 }}>
              {kpi.icon}
            </div>
          </div>
          <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--txt1)', margin: '0 0 4px', letterSpacing: -0.5 }}>{kpi.value}</p>
          <p style={{ fontSize: 11, color: 'var(--txt2)', margin: 0 }}>{kpi.sub}</p>
        </div>
      ))}
    </div>
  )
}
