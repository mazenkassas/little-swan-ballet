import { createClient } from '@/lib/supabase/server'
import { format, addDays, subDays, addWeeks, subWeeks, isToday, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import DailySessionCard from './DailySessionCard'
import DailyPrivateSection from './DailyPrivateSection'
import DailyRevenueSection from './DailyRevenueSection'
import DailyExpensesSection from './DailyExpensesSection'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { CalendarDays, UserCheck, UserX, CreditCard, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { date: dateParam } = await searchParams
  const t      = await getTranslations('daily')
  const ta     = await getTranslations('attendance')
  const locale = await getLocale()
  const isRtl  = locale === 'ar'
  const supabase = await createClient()

  const now          = new Date()
  const selectedDate = dateParam && typeof dateParam === 'string' ? parseISO(dateParam) : now
  const selectedDay  = format(selectedDate, 'yyyy-MM-dd')
  const todayStr     = format(now, 'yyyy-MM-dd')
  const isSelectedToday = isToday(selectedDate)

  const dayNamesLocale = isRtl
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const selectedDayName  = WEEKDAYS[selectedDate.getDay()]
  const selectedDayLabel = dayNamesLocale[selectedDate.getDay()]

  const nav      = (d: string) => d === todayStr ? '/dashboard/daily' : `/dashboard/daily?date=${d}`
  const prevDay  = format(subDays(selectedDate, 1),  'yyyy-MM-dd')
  const nextDay  = format(addDays(selectedDate, 1),  'yyyy-MM-dd')
  const prevWeek = format(subWeeks(selectedDate, 1), 'yyyy-MM-dd')
  const nextWeek = format(addWeeks(selectedDate, 1), 'yyyy-MM-dd')

  // ── Auto-create sessions for selected day ─────────────────────────────────
  let autoCreated = 0
  const [{ data: dayClasses }, { data: existingSessions }] = await Promise.all([
    supabase.from('classes').select('id, default_coach_id, hall_id')
      .eq('is_active', true).contains('days_of_week', [selectedDayName]),
    supabase.from('sessions').select('class_id').eq('date', selectedDay),
  ])
  if (dayClasses && dayClasses.length > 0) {
    const existingClassIds = new Set((existingSessions || []).map((s: any) => s.class_id))
    const missing = dayClasses.filter((cls: any) => !existingClassIds.has(cls.id))
    if (missing.length > 0) {
      const { error: insertErr } = await supabase.from('sessions').insert(
        missing.map((cls: any) => ({
          class_id: cls.id, date: selectedDay,
          coach_id: cls.default_coach_id || null,
          hall_id:  cls.hall_id, status: 'scheduled',
        }))
      )
      if (!insertErr) autoCreated = missing.length
    }
  }

  // ── Fetch sessions ────────────────────────────────────────────────────────
  const { data: rawSessions } = await supabase
    .from('sessions')
    .select('*, class:classes(*, level:levels(name)), hall:halls(name), coach:coaches(name_ar, name_en)')
    .eq('date', selectedDay)
    .order('created_at')

  const seenClasses = new Set<string>()
  const sessions = (rawSessions || []).filter((s: any) => {
    if (seenClasses.has(s.class_id)) return false
    seenClasses.add(s.class_id)
    return true
  })

  const sessionDetails = await Promise.all(
    sessions.map(async (session: any) => {
      const { data: enrolled } = await supabase
        .from('class_students')
        .select('*, student:students(*, subscriptions:subscriptions(id, remaining_sessions, total_sessions, status, start_date, plan_id, plan:subscription_plans(id, name, price, sessions_count)))')
        .eq('class_id', session.class_id)

      const students = (enrolled || [])
        .map((e: any) => e.student)
        .filter((s: any) => s && s.status === 'active')

      const { data: attendance } = await supabase
        .from('attendance').select('*').eq('session_id', session.id)

      return { session, students, attendance: attendance || [] }
    })
  )

  sessionDetails.sort((a, b) =>
    (a.session.class?.start_time || '').localeCompare(b.session.class?.start_time || '')
  )

  // ── Financials ────────────────────────────────────────────────────────────
  const { data: payments } = await supabase
    .from('payments')
    .select('*, student:students(name_ar, name_en)')
    .eq('date', selectedDay)
    .order('created_at', { ascending: false })

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, staff:staff(name)')
    .eq('date', selectedDay)
    .order('created_at', { ascending: false })

  const totalRevenue  = (payments || []).reduce((s: number, p: any) => s + p.amount_paid, 0)
  const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + e.amount, 0)
  const totalCash     = (payments || []).filter((p: any) => p.payment_method === 'cash').reduce((s: number, p: any) => s + p.amount_paid, 0)
  const netCash       = totalCash - totalExpenses

  // ── Attendance stats ──────────────────────────────────────────────────────
  const allAttendance = sessionDetails.flatMap(d => d.attendance)
  const presentN = allAttendance.filter((a: any) => a.status === 'present').length
  const absentN  = allAttendance.filter((a: any) => a.status === 'absent').length

  const payRequiredMap = new Map<string, any>()
  sessionDetails.forEach(({ students }) => {
    students.forEach((s: any) => {
      const sub = s.subscriptions?.find((sub: any) => sub.status === 'active')
      const subStarted = !sub?.start_date || selectedDay >= sub.start_date
      if (sub && subStarted && sub.remaining_sessions === 0) payRequiredMap.set(s.id, s)
    })
  })
  const payRequired = [...payRequiredMap.values()]

  // ── Private sessions ──────────────────────────────────────────────────────
  const { data: privateSessions } = await supabase
    .from('private_sessions')
    .select('*, coach:coaches(name_ar, name_en), student:students(name_ar, name_en)')
    .eq('date', selectedDay).order('created_at')

  const { data: coaches }     = await supabase.from('coaches').select('id, name_ar, name_en').eq('is_active', true).order('name_ar')
  const { data: allStudents } = await supabase.from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar')

  // ── Formatted date ────────────────────────────────────────────────────────
  const formattedDate = selectedDate.toLocaleDateString(
    isRtl ? 'ar-EG' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  const navBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
    border: '1px solid var(--border)', color: 'var(--txt2)',
    background: 'var(--bg-card)',
  }

  const kpis = [
    { icon: BookOpen,    label: isRtl ? 'الحصص'        : 'Sessions',         value: sessionDetails.length,      color: '#d4667a' },
    { icon: UserCheck,   label: ta('present'),                                value: presentN,                    color: '#3dab7e' },
    { icon: UserX,       label: ta('absent'),                                 value: absentN,                     color: '#e04040' },
    { icon: AlertTriangle, label: isRtl ? 'مطلوب دفع'  : 'Payment Required', value: payRequired.length,          color: '#e8960a' },
    { icon: CreditCard,  label: isRtl ? 'الإيرادات'    : 'Revenue',          value: formatCurrency(totalRevenue), color: '#3dab7e' },
    { icon: TrendingUp,  label: isRtl ? 'صافي كاش'     : 'Net Cash',         value: formatCurrency(netCash),      color: netCash >= 0 ? '#3dab7e' : '#e04040' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-page)', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Sticky nav bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '10px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Link href={nav(prevWeek)} style={navBtn}>{isRtl ? 'الأسبوع السابق →' : '← Prev Week'}</Link>
          <Link href={nav(prevDay)}  style={{ ...navBtn, color: 'var(--txt1)', fontWeight: 700 }}>{isRtl ? 'اليوم السابق →' : '← Prev Day'}</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/dashboard/daily" style={{
            ...navBtn,
            background: isSelectedToday ? '#d4667a' : 'transparent',
            color: isSelectedToday ? '#fff' : '#d4667a',
            border: '1px solid #d4667a', fontWeight: 700,
          }}>
            {isRtl ? 'اليوم' : 'Today'}
          </Link>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: 'var(--txt1)' }}>{selectedDayLabel}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>{formattedDate}</p>
          </div>
          {autoCreated > 0 && (
            <span style={{
              background: '#d4667a12', border: '1px solid #d4667a25',
              borderRadius: 8, padding: '4px 10px', color: '#d4667a', fontSize: 11, fontWeight: 600,
            }}>
              ✨ {autoCreated} {isRtl ? 'حصص جديدة' : 'sessions created'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <Link href={nav(nextDay)}  style={{ ...navBtn, color: 'var(--txt1)', fontWeight: 700 }}>{isRtl ? '← اليوم التالي' : 'Next Day →'}</Link>
          <Link href={nav(nextWeek)} style={navBtn}>{isRtl ? '← الأسبوع التالي' : 'Next Week →'}</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '18px 20px' }}>

        {/* ── KPI cards ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: `1px solid ${k.color}22`,
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>{k.label}</span>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: k.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <k.icon size={13} color={k.color} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Payment required alert ─────────────────────────────────────────── */}
        {payRequired.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#e8960a10', border: '1px solid #e8960a30',
            borderRadius: 12, padding: '12px 16px', marginBottom: 18,
          }}>
            <AlertTriangle size={15} color="#e8960a" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#e8960a' }}>
                {isRtl ? 'طالبات مطلوب منهم الدفع قبل الحصة' : 'Students with payment due before session'}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {payRequired.map((s: any) => (
                  <span key={s.id} style={{
                    background: 'var(--bg-card)', border: '1px solid #e8960a40',
                    borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--txt1)',
                  }}>
                    💳 {locale === 'en' && s.name_en ? s.name_en : s.name_ar}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Sessions ───────────────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden', marginBottom: 18,
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-page)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#d4667a18', border: '1px solid #d4667a28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                📋
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
                {t('todaySessions')}
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#d4667a', background: '#d4667a18', border: '1px solid #d4667a28', borderRadius: 20, padding: '2px 10px' }}>
              {sessionDetails.length}
            </span>
          </div>

          {sessionDetails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
                {isRtl ? `لا توجد حصص يوم ${selectedDayLabel}` : `No sessions on ${selectedDayLabel}`}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>
                {isRtl ? 'لا يوجد جدول لهذا اليوم' : 'No classes are scheduled for this day'}
              </p>
            </div>
          ) : (
            sessionDetails.map(({ session, students, attendance }) => (
              <DailySessionCard
                key={session.id}
                session={session}
                students={students}
                existingAttendance={attendance}
                allCoaches={coaches || []}
                isRtl={isRtl}
                locale={locale}
              />
            ))
          )}
        </div>

        {/* ── Revenue + Expenses side by side ────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <DailyRevenueSection
            payments={payments || []}
            students={allStudents || []}
            date={selectedDay}
            locale={locale}
          />
          <DailyExpensesSection
            expenses={expenses || []}
            date={selectedDay}
            locale={locale}
          />
        </div>

        {/* ── Private sessions ───────────────────────────────────────────────── */}
        <DailyPrivateSection
          coaches={coaches || []}
          students={allStudents || []}
          sessions={privateSessions || []}
          date={selectedDay}
          locale={locale}
        />

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
