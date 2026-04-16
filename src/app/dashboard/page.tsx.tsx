import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [
    { count: totalStudents },
    { count: activeStudents },
    { data: todaySessions },
    { data: todayPayments },
    { data: todayExpenses },
    { data: paymentRequired },
    { data: recentStudents },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('sessions').select('*, class:classes(name), hall:halls(name), coach:coaches(name_ar)').eq('date', today),
    supabase.from('payments').select('amount_paid').eq('date', today),
    supabase.from('expenses').select('amount').eq('date', today),
    supabase.from('subscriptions').select('student_id, student:students(name_ar)').eq('status', 'active').eq('remaining_sessions', 0),
    supabase.from('students').select('id,name_ar,name_en,level:levels(name)').eq('status', 'active').order('enrollment_date', { ascending: false }).limit(6),
  ])

  const totalRevenue = todayPayments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
  const totalExp = todayExpenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
  const netRevenue = totalRevenue - totalExp

  return (
    <div style={{ padding: 28, background: '#FDFAF8', minHeight: '100vh' }} dir="rtl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#2C1F24', margin: 0 }}>لوحة التحكم</h1>
        <p style={{ fontSize: 12, color: '#B89CA0', marginTop: 4 }}>
          {format(new Date(), 'dd/MM/yyyy')} — Miami Branch
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'إجمالي الطالبات', value: String(totalStudents || 0), sub: `${activeStudents || 0} نشطة`, iconBg: '#F5E6EA', href: '/dashboard/students' },
          { label: 'حصص اليوم', value: String(todaySessions?.length || 0), sub: 'Hall 1 & 2', iconBg: '#E8F0FA', href: '/dashboard/sessions' },
          { label: 'إيرادات اليوم', value: `${totalRevenue.toLocaleString()} ج`, sub: `صافي ${netRevenue.toLocaleString()} ج`, iconBg: '#E8F5EE', href: '/dashboard/payments' },
          { label: 'تحتاج تجديد', value: String(paymentRequired?.length || 0), sub: 'اشتراك منتهي', iconBg: '#FBF0E0', href: '/dashboard/students' },
        ].map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #EDD8DC', borderRadius: 12, padding: 16, cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.iconBg, marginBottom: 12 }} />
              <div style={{ fontSize: 22, fontWeight: 500, color: '#2C1F24' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#B89CA0', marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: '#B89CA0', marginTop: 2 }}>{s.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #EDD8DC', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #EDD8DC' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#2C1F24' }}>آخر الطالبات</span>
            <Link href="/dashboard/students" style={{ fontSize: 11, color: '#C8788A', textDecoration: 'none' }}>عرض الكل</Link>
          </div>
          {recentStudents?.map((s: any) => (
            <Link key={s.id} href={`/dashboard/students/${s.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #EDD8DC' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F5E6EA', color: '#8B4A58', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
                  {s.name_ar[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#2C1F24', margin: 0 }}>{s.name_ar}</p>
                  <p style={{ fontSize: 11, color: '#B89CA0', margin: 0 }}>{s.level?.name || '—'}</p>
                </div>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#E8F5EE', color: '#4A8C6A' }}>نشطة</span>
              </div>
            </Link>
          ))}
          {(!recentStudents || recentStudents.length === 0) && (
            <p style={{ textAlign: 'center', padding: 24, color: '#B89CA0', fontSize: 12, margin: 0 }}>لا توجد طالبات</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #EDD8DC', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #EDD8DC' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#2C1F24' }}>حصص اليوم</span>
              <Link href="/dashboard/sessions" style={{ fontSize: 11, color: '#C8788A', textDecoration: 'none' }}>الجدول</Link>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todaySessions?.map((s: any) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#F7F0F0', borderRadius: 8, padding: '9px 11px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C8788A', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#2C1F24', margin: 0 }}>{s.class?.name}</p>
                    <p style={{ fontSize: 10, color: '#B89CA0', margin: 0 }}>{s.hall?.name}</p>
                  </div>
                </div>
              ))}
              {(!todaySessions || todaySessions.length === 0) && (
                <p style={{ textAlign: 'center', padding: 12, color: '#B89CA0', fontSize: 12, margin: 0 }}>لا حصص اليوم</p>
              )}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #EDD8DC', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #EDD8DC' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#2C1F24' }}>ملخص مالي</span>
            </div>
            <div style={{ padding: '0 18px' }}>
              {[
                { label: 'الإيرادات', value: `${totalRevenue.toLocaleString()} ج`, color: '#4A8C6A' },
                { label: 'المصروفات', value: `${totalExp.toLocaleString()} ج`, color: '#C8788A' },
                { label: 'الصافي', value: `${netRevenue.toLocaleString()} ج`, color: netRevenue >= 0 ? '#4A8C6A' : '#C8788A' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EDD8DC' }}>
                  <span style={{ fontSize: 12, color: '#7A5C63' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}