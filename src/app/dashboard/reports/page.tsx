import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { format, subDays, startOfMonth } from 'date-fns'
import RevenueChart from './RevenueChart'

export default async function ReportsPage() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Last 30 days revenue
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

  // Build daily chart data
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

  // Payment by type this month
  const { data: monthPayments } = await supabase
    .from('payments')
    .select('type, amount_paid')
    .gte('date', monthStart)
    .lte('date', today)

  const byType: Record<string, number> = {}
  monthPayments?.forEach(p => { byType[p.type] = (byType[p.type] || 0) + p.amount_paid })

  const typeLabels: Record<string, string> = {
    subscription: 'اشتراك', product: 'منتجات', event: 'فعاليات',
    private: 'برايفيت', exam: 'امتحانات', enrollment: 'تسجيل',
  }

  // Stats
  const totalMonthRevenue = monthPayments?.reduce((s, p) => s + p.amount_paid, 0) || 0
  const { data: activeStudents } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active')
  const { data: coachHours } = await supabase.from('coach_attendance').select('hours_worked').gte('created_at', monthStart).not('hours_worked', 'is', null)
  const totalCoachHours = coachHours?.reduce((s, h) => s + (h.hours_worked || 0), 0) || 0

  return (
    <div className="p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">التقارير</h1>
        <p className="text-white/40 text-sm mt-1">تحليل مالي وإداري شامل</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'إيرادات الشهر', value: formatCurrency(totalMonthRevenue), color: 'emerald' },
          { label: 'الطالبات النشطات', value: (activeStudents as any)?.toString() || '0', color: 'rose' },
          { label: 'ساعات المدربات', value: `${totalCoachHours.toFixed(1)} ساعة`, color: 'violet' },
          { label: 'متوسط الإيراد اليومي', value: formatCurrency(totalMonthRevenue / 30), color: 'amber' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-${kpi.color}-500/10 border border-${kpi.color}-500/20 rounded-2xl p-5`}>
            <p className="text-white/50 text-sm mb-2">{kpi.label}</p>
            <p className={`text-2xl font-bold text-${kpi.color}-400`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-6">الإيرادات والمصروفات — آخر 30 يوم</h2>
        <RevenueChart data={chartData} />
      </div>

      {/* By Type */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-5">الإيرادات حسب النوع — هذا الشهر</h2>
        <div className="space-y-3">
          {Object.entries(byType).sort(([, a], [, b]) => b - a).map(([type, amount]) => {
            const pct = Math.round((amount / totalMonthRevenue) * 100)
            return (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/70">{typeLabels[type] || type}</span>
                  <span className="text-white font-medium">{formatCurrency(amount)} ({pct}%)</span>
                </div>
                <div className="bg-white/10 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {Object.keys(byType).length === 0 && (
            <p className="text-white/20 text-sm text-center py-4">لا توجد بيانات لهذا الشهر</p>
          )}
        </div>
      </div>
    </div>
  )
}
