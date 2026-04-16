import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Phone, Calendar, BookOpen, CreditCard, History, SnowflakeIcon } from 'lucide-react'
import { calculateAge, formatDate, formatCurrency, getStudentStatusColor } from '@/lib/utils'
import StudentActions from './StudentActions'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('*, level:levels(*)')
    .eq('id', id)
    .single()

  if (!student) notFound()

  // Fetch related data
  const [
    { data: subscriptions },
    { data: payments },
    { data: attendance },
    { data: classes },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*, plan:subscription_plans(name)').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
    supabase.from('payments').select('*').eq('student_id', id).order('date', { ascending: false }).limit(10),
    supabase.from('attendance').select('*, session:sessions(date, class:classes(name))').eq('student_id', id).order('timestamp', { ascending: false }).limit(10),
    supabase.from('class_students').select('*, class:classes(name, days_of_week, start_time, end_time, hall:halls(name))').eq('student_id', id),
  ])

  const activeSubscription = subscriptions?.find(s => s.status === 'active')

  return (
    <div className="p-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/students" className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowRight size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-lg font-bold">
              {student.name_ar[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{student.name_ar}</h1>
              <p className="text-white/40 text-sm">{student.name_en}</p>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${getStudentStatusColor(student.status)}`}>
              {student.status === 'active' ? 'نشطة' : student.status === 'frozen' ? 'مجمدة' : 'غير نشطة'}
            </span>
          </div>
        </div>
        <StudentActions student={student} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">البيانات الأساسية</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-white/30" />
              <div>
                <p className="text-white/40 text-xs">تاريخ الميلاد</p>
                <p className="text-white text-sm">{formatDate(student.date_of_birth)} ({calculateAge(student.date_of_birth)} سنة)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-white/30" />
              <div>
                <p className="text-white/40 text-xs">هاتف ولي الأمر</p>
                <p className="text-white text-sm" dir="ltr">{student.parent_phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BookOpen size={16} className="text-white/30" />
              <div>
                <p className="text-white/40 text-xs">المستوى</p>
                <p className="text-white text-sm">{student.level?.name || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-white/30" />
              <div>
                <p className="text-white/40 text-xs">تاريخ التسجيل</p>
                <p className="text-white text-sm">{formatDate(student.enrollment_date)}</p>
              </div>
            </div>
            {student.notes && (
              <div className="bg-white/3 rounded-xl p-3 mt-4">
                <p className="text-white/40 text-xs mb-1">ملاحظات</p>
                <p className="text-white/70 text-sm">{student.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">الاشتراك الحالي</h2>
            <Link href={`/dashboard/payments/new?student=${student.id}`} className="text-rose-400 text-xs hover:text-rose-300">
              + تجديد
            </Link>
          </div>
          {activeSubscription ? (
            <div>
              <div className={`rounded-xl p-4 mb-4 ${activeSubscription.remaining_sessions === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/60 text-sm">{activeSubscription.plan?.name || 'اشتراك'}</span>
                  {activeSubscription.remaining_sessions === 0 && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      مطلوب دفع
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-bold ${activeSubscription.remaining_sessions === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {activeSubscription.remaining_sessions}
                  </span>
                  <span className="text-white/40 text-sm mb-1">/ {activeSubscription.total_sessions} حصة</span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 bg-white/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${activeSubscription.remaining_sessions === 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${(activeSubscription.remaining_sessions / activeSubscription.total_sessions) * 100}%` }}
                  />
                </div>
                <p className="text-white/30 text-xs mt-2">من {formatDate(activeSubscription.start_date)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white/20">
              <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا يوجد اشتراك نشط</p>
            </div>
          )}

          {/* Classes enrolled */}
          <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3 mt-2">الفصول المسجلة</h3>
          {classes && classes.length > 0 ? (
            <div className="space-y-2">
              {classes.map((cs: any) => (
                <div key={cs.id} className="bg-white/3 rounded-xl px-3 py-2.5">
                  <p className="text-white text-sm font-medium">{cs.class?.name}</p>
                  <p className="text-white/30 text-xs">{cs.class?.hall?.name} • {cs.class?.days_of_week?.join(', ')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">غير مسجلة في أي فصل</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">آخر الحضور</h2>
          {attendance && attendance.length > 0 ? (
            <div className="space-y-2">
              {attendance.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between bg-white/3 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-white text-sm">{a.session?.class?.name}</p>
                    <p className="text-white/30 text-xs">{a.session?.date ? formatDate(a.session.date, 'dd/MM/yyyy') : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                    a.status === 'present' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    a.status === 'absent' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  }`}>
                    {a.status === 'present' ? 'حاضرة' : a.status === 'absent' ? 'غائبة' : 'تعويض'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/20">
              <History size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا يوجد سجل حضور</p>
            </div>
          )}
        </div>
      </div>

      {/* Payments History */}
      <div className="mt-6 bg-white/5 border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">سجل المدفوعات</h2>
          <Link href={`/dashboard/payments/new?student=${student.id}`} className="text-rose-400 text-xs hover:text-rose-300">
            + إضافة دفعة
          </Link>
        </div>
        {payments && payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-white/30 text-xs uppercase tracking-wider">
                  <th className="text-right pb-3">التاريخ</th>
                  <th className="text-right pb-3">النوع</th>
                  <th className="text-right pb-3">المطلوب</th>
                  <th className="text-right pb-3">المدفوع</th>
                  <th className="text-right pb-3">الرصيد</th>
                  <th className="text-right pb-3">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-3 text-white/50 text-sm">{formatDate(p.date)}</td>
                    <td className="py-3 text-white/60 text-sm">
                      {p.type === 'subscription' ? 'اشتراك' : p.type === 'product' ? 'منتج' : p.type === 'event' ? 'فعالية' : p.type === 'private' ? 'برايفيت' : p.type === 'exam' ? 'امتحان' : 'تسجيل'}
                    </td>
                    <td className="py-3 text-white/60 text-sm">{formatCurrency(p.amount_due)}</td>
                    <td className="py-3 text-emerald-400 text-sm font-medium">{formatCurrency(p.amount_paid)}</td>
                    <td className="py-3 text-sm font-medium">
                      <span className={p.remaining_balance > 0 ? 'text-amber-400' : 'text-white/30'}>
                        {formatCurrency(p.remaining_balance)}
                      </span>
                    </td>
                    <td className="py-3 text-white/40 text-sm">
                      {p.payment_method === 'cash' ? 'كاش' : p.payment_method === 'instapay' ? 'إنستاباي' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-white/20">
            <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد مدفوعات</p>
          </div>
        )}
      </div>
    </div>
  )
}
