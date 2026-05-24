import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Calendar, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CoachOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const isRtl = locale === 'ar'

  const { data: coach } = await supabase
    .from('coaches')
    .select('id, name_ar, name_en, hourly_rate')
    .eq('email', user.email!)
    .eq('can_login', true)
    .maybeSingle()
  if (!coach) redirect('/login')

  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const [
    { data: myClasses },
    { data: todayLogs },
    { data: monthLogs },
  ] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, days_of_week, start_time, end_time, max_capacity, hall:halls(name), level:levels(name), grade:grades(name), term:terms(name)')
      .eq('default_coach_id', coach.id)
      .eq('is_active', true)
      .order('start_time'),
    supabase
      .from('coach_attendance')
      .select('id, check_in_time, check_out_time, hours_worked, session_id, session:sessions(date, class:classes(name))')
      .eq('coach_id', coach.id)
      .gte('check_in_time', today + 'T00:00:00')
      .lte('check_in_time', today + 'T23:59:59')
      .order('check_in_time', { ascending: false }),
    supabase
      .from('coach_attendance')
      .select('hours_worked')
      .eq('coach_id', coach.id)
      .gte('check_in_time', monthStart + 'T00:00:00')
      .lte('check_in_time', monthEnd + 'T23:59:59'),
  ])

  const monthHours    = (monthLogs || []).reduce((s: number, a: any) => s + (a.hours_worked || 0), 0)
  const checkedInNow  = (todayLogs || []).some((l: any) => l.check_in_time && !l.check_out_time)
  const displayName   = isRtl ? (coach.name_ar || coach.name_en) : (coach.name_en || coach.name_ar)

  function fmtTime(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  function fmtDays(days: unknown) {
    if (!days) return ''
    const arr = Array.isArray(days) ? days : []
    if (!isRtl) return arr.join(', ')
    const map: Record<string, string> = {
      Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
      Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
    }
    return arr.map((d: string) => map[d] || d).join(', ')
  }

  const kpis = [
    {
      label: isRtl ? 'مجموعاتي' : 'My Classes',
      value: String((myClasses || []).length),
      sub: isRtl ? 'هذا الأسبوع' : 'This week',
      color: '#4a90d9',
      icon: Calendar,
    },
    {
      label: isRtl ? 'ساعات الشهر' : 'Hours This Month',
      value: `${monthHours.toFixed(1)}${isRtl ? 'س' : 'h'}`,
      sub: coach.hourly_rate
        ? `${(monthHours * coach.hourly_rate).toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}`
        : (isRtl ? 'لا يوجد سعر ساعة' : 'No hourly rate set'),
      color: '#3dab7e',
      icon: Clock,
    },
    {
      label: isRtl ? 'الحالة' : 'Status',
      value: checkedInNow
        ? (isRtl ? 'في الحصة' : 'Checked In')
        : (isRtl ? 'متاحة' : 'Available'),
      sub: checkedInNow
        ? (isRtl ? 'حصة نشطة' : 'Session active')
        : (isRtl ? 'جاهزة للتسجيل' : 'Ready to check in'),
      color: checkedInNow ? '#3dab7e' : 'var(--txt2)',
      icon: MapPin,
    },
  ]

  return (
    <div className="page-body" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--txt2)' }}>
          {isRtl ? 'لوحة تحكم المدربة — فرع الأكاديمية' : 'Coaching Dashboard — Academy Branch'}
        </p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--txt1)', letterSpacing: -0.4 }}>
          {isRtl ? `أهلاً، ${displayName}` : `Welcome, ${displayName}`}
        </h1>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid-3" style={{ marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${k.color}22`,
            borderTop: `3px solid ${k.color}`,
            borderRadius: 14,
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 500 }}>{k.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: k.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={14} color={k.color} />
              </div>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>
              {k.value}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="kpi-grid-2">

        {/* Today's sessions */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
              {isRtl ? 'حصص اليوم' : "Today's Sessions"}
            </p>
            <Link href="/coach/checkin" style={{
              fontSize: 11, color: '#4a90d9', textDecoration: 'none', fontWeight: 600,
              background: '#4a90d910', border: '1px solid #4a90d928', borderRadius: 6, padding: '3px 10px',
            }}>
              {isRtl ? 'تسجيل الدخول' : 'Check In →'}
            </Link>
          </div>

          {(todayLogs || []).length === 0 ? (
            <p style={{ color: 'var(--txt2)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              {isRtl ? 'لا توجد حصص اليوم' : 'No sessions today'}
            </p>
          ) : (todayLogs || []).map((l: any) => {
            const className = l.session?.class?.name || (isRtl ? 'حصة' : 'Session')
            return (
              <div key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
                      {className}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>
                      {isRtl ? 'دخول:' : 'In:'} {fmtTime(l.check_in_time)}
                    </p>
                  </div>
                  {l.check_out_time ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e28',
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                    }}>
                      {l.hours_worked}{isRtl ? 'س' : 'h'} {isRtl ? 'منتهية' : 'done'}
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e28',
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3dab7e', flexShrink: 0 }} />
                      {isRtl ? 'نشطة' : 'Active'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* My classes this week */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
              {isRtl ? 'مجموعاتي هذا الأسبوع' : 'My Classes This Week'}
            </p>
            <Link href="/coach/schedule" style={{
              fontSize: 11, color: '#4a90d9', textDecoration: 'none', fontWeight: 600,
              background: '#4a90d910', border: '1px solid #4a90d928', borderRadius: 6, padding: '3px 10px',
            }}>
              {isRtl ? 'الجدول' : 'Schedule →'}
            </Link>
          </div>

          {(myClasses || []).length === 0 ? (
            <p style={{ color: 'var(--txt2)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              {isRtl ? 'لا توجد مجموعات مخصصة لك' : 'No classes assigned'}
            </p>
          ) : (myClasses || []).map((c: any) => {
            const hall  = c.hall?.name || ''
            const level = c.level?.name || ''
            return (
              <div key={c.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--txt1)' }}>
                      {c.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>
                      {fmtDays(c.days_of_week)}
                      {c.start_time ? ` · ${c.start_time.slice(0, 5)}` : ''}
                      {c.end_time ? `–${c.end_time.slice(0, 5)}` : ''}
                      {hall ? ` · ${hall}` : ''}
                    </p>
                  </div>
                  {level && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      background: '#4a90d918', color: '#4a90d9', border: '1px solid #4a90d928',
                      borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                      {level}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
