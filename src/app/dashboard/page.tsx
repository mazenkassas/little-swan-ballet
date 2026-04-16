import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Users, GraduationCap, TrendingUp, AlertCircle, Clock, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  // Fetch stats in parallel
  const [
    { count: totalStudents },
    { count: activeStudents },
    { count: frozenStudents },
    { data: todaySessions },
    { data: todayPayments },
    { data: todayExpenses },
    { count: pendingTransfers },
    { data: paymentRequired },
    { data: recentStudents },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'frozen'),
    supabase.from('sessions').select('*, class:classes(name), hall:halls(name)').eq('date', today),
    supabase.from('payments').select('amount_paid').eq('date', today),
    supabase.from('expenses').select('amount').eq('date', today),
    supabase.from('student_transfers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('subscriptions').select('student_id, remaining_sessions, student:students(name_ar, name_en)').eq('status', 'active').eq('remaining_sessions', 0),
    supabase.from('students').select('id, name_ar, name_en, status, enrollment_date, level:levels(name)').eq('status', 'active').order('enrollment_date', { ascending: false }).limit(5),
  ])

  const totalRevenue = todayPayments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
  const totalExpenses = todayExpenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
  const netRevenue = totalRevenue - totalExpenses

  const stats = [
    { icon: Users, label: 'إجمالي الطالبات', value: totalStudents || 0, sub: `${activeStudents || 0} نشطة`, color: 'rose', href: '/dashboard/students' },
    { icon: GraduationCap, label: 'حصص اليوم', value: todaySessions?.length || 0, sub: `قاعة 1 & 2`, color: 'violet', href: '/dashboard/sessions' },
    { icon: TrendingUp, label: 'إيرادات اليوم', value: formatCurrency(totalRevenue), sub: `صافي: ${formatCurrency(netRevenue)}`, color: 'emerald', href: '/dashboard/payments' },
    { icon: AlertCircle, label: 'تحتاج دفع', value: paymentRequired?.length || 0, sub: 'اشتراك منتهي', color: 'amber', href: '/dashboard/students' },
  ]

  const colorMap: Record<string, string> = {
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/20',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/20',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/20',
  }

  const bgMap: Record<string, string> = {
    rose: 'bg-rose-500/10 border-rose-500/20',
    violet: 'bg-violet-500/10 border-violet-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
  }

  return (
    <div className="p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
        <p className="text-white/40 text-sm mt-1">
          {format(new Date(), 'EEEE, dd MMMM yyyy')} — Miami Branch
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              href={stat.href}
              key={stat.label}
              className={`relative overflow-hidden rounded-2xl border ${bgMap[stat.color]} p-6 hover:scale-[1.02] transition-transform cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/50 text-sm mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-white/30 text-xs mt-1">{stat.sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorMap[stat.color]} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today's Sessions */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <CalendarCheck size={18} className="text-violet-400" />
              حصص اليوم
            </h2>
            <Link href="/dashboard/sessions" className="text-white/30 text-xs hover:text-white/60 transition-colors">
              عرض الكل
            </Link>
          </div>
          {todaySessions && todaySessions.length > 0 ? (
            <div className="space-y-3">
              {todaySessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between bg-white/3 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{session.class?.name || 'حصة'}</p>
                    <p className="text-white/30 text-xs mt-0.5">{session.hall?.name}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    session.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    session.status === 'cancelled' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    'text-violet-400 bg-violet-500/10 border-violet-500/20'
                  }`}>
                    {session.status === 'completed' ? 'منتهية' : session.status === 'cancelled' ? 'ملغية' : 'مجدولة'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/20">
              <CalendarCheck size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد حصص اليوم</p>
            </div>
          )}
        </div>

        {/* Payment Required */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400" />
              تحتاج تجديد اشتراك
            </h2>
            <Link href="/dashboard/students" className="text-white/30 text-xs hover:text-white/60 transition-colors">
              عرض الكل
            </Link>
          </div>
          {paymentRequired && paymentRequired.length > 0 ? (
            <div className="space-y-3">
              {paymentRequired.slice(0, 6).map((sub: any) => (
                <div key={sub.student_id} className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{sub.student?.name_ar}</p>
                    <p className="text-white/30 text-xs mt-0.5">{sub.student?.name_en}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                    منتهي
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/20">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد اشتراكات منتهية 🎉</p>
            </div>
          )}
        </div>

        {/* Recent Enrollments */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Clock size={18} className="text-rose-400" />
              آخر الطالبات المسجلة
            </h2>
            <Link href="/dashboard/students" className="text-white/30 text-xs hover:text-white/60 transition-colors">
              عرض الكل
            </Link>
          </div>
          <div className="space-y-3">
            {recentStudents?.map((student: any) => (
              <Link
                href={`/dashboard/students/${student.id}`}
                key={student.id}
                className="flex items-center gap-3 bg-white/3 hover:bg-white/6 rounded-xl px-4 py-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {student.name_ar[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{student.name_ar}</p>
                  <p className="text-white/30 text-xs">{student.level?.name || 'بدون مستوى'}</p>
                </div>
                <span className="text-white/20 text-xs">{format(new Date(student.enrollment_date), 'dd/MM')}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              ملخص مالي اليوم
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-4">
              <span className="text-white/60 text-sm">إجمالي الإيرادات</span>
              <span className="text-emerald-400 font-bold text-lg">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-4">
              <span className="text-white/60 text-sm">إجمالي المصروفات</span>
              <span className="text-red-400 font-bold text-lg">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-4">
              <span className="text-white/80 text-sm font-semibold">الصافي</span>
              <span className={`font-bold text-xl ${netRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(netRevenue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
