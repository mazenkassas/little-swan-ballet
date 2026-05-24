import { createClient } from '@/lib/supabase/server'
import { format, addDays, subDays, addWeeks, subWeeks, isToday, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import DailySessionCard from './DailySessionCard'
import DailyPrivateSection from './DailyPrivateSection'
import DailyRevenueSection from './DailyRevenueSection'
import DailyExpensesSection from './DailyExpensesSection'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { AlertTriangle } from 'lucide-react'

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

  const nav = (d: string) =>
    d !== todayStr ? `/dashboard/daily?date=${d}` : '/dashboard/daily'
  const prevDay  = format(subDays(selectedDate, 1),  'yyyy-MM-dd')
  const nextDay  = format(addDays(selectedDate, 1),  'yyyy-MM-dd')
  const prevWeek = format(subWeeks(selectedDate, 1), 'yyyy-MM-dd')
  const nextWeek = format(addWeeks(selectedDate, 1), 'yyyy-MM-dd')

  // Week strip — 7 days starting from Sunday of the selected week
  const startOfCurrentWeek = subDays(selectedDate, selectedDate.getDay())
  const dayShortEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const dayShortAr = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت']
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(startOfCurrentWeek, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    return {
      dateStr,
      short: isRtl ? dayShortAr[i] : dayShortEn[i],
      num: format(d, 'd'),
      isSelected: dateStr === selectedDay,
      isToday: dateStr === todayStr,
    }
  })

  // ── Auto-create sessions for selected day ─────────────────────────────────
  let autoCreated = 0
  const [{ data: dayClasses }, { data: existingSessions }] = await Promise.all([
    supabase.from('classes').select('id, default_coach_id, hall_id')
      .eq('is_active', true)
      .filter('days_of_week', 'cs', JSON.stringify([selectedDayName])),
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
      const [{ data: enrolled }, { data: attendance }] = await Promise.all([
        supabase
          .from('class_students')
          .select('*, student:students(*, subscriptions:subscriptions(id, remaining_sessions, total_sessions, status, start_date, end_date, plan_id, class_id, next_cycle_start, plan:subscription_plans(id, name, price, sessions_count), payment:payments(date)))')
          .eq('class_id', session.class_id),
        supabase.from('attendance').select('*').eq('session_id', session.id),
      ])

      const students = (enrolled || [])
        .map((e: any) => e.student)
        .filter((s: any) => s && s.status === 'active')

      const makeupAtt = (attendance || []).filter((a: any) => a.status === 'make_up')
      let makeupStudents: any[] = []
      if (makeupAtt.length > 0) {
        const { data: mkData } = await supabase
          .from('students')
          .select('id, name_ar, name_en, class_students(class:classes(id, name))')
          .in('id', makeupAtt.map((a: any) => a.student_id))
        makeupStudents = (mkData || []).map((s: any) => ({
          ...s,
          attendanceId: makeupAtt.find((a: any) => a.student_id === s.id)?.id,
          originalClass: s.class_students?.[0]?.class || null,
        }))
      }

      return { session, students, attendance: attendance || [], makeupStudents }
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
  sessionDetails.forEach(({ session, students }) => {
    students.forEach((s: any) => {
      // Only flag payment required for the subscription tied to this specific class
      const sub = s.subscriptions?.find(
        (x: any) => x.status === 'active' && (x.class_id === session.class_id || !x.class_id)
      )
      const subStarted = !sub?.start_date || selectedDay >= sub.start_date
      if (sub && subStarted && sub.remaining_sessions === 0) payRequiredMap.set(s.id, s)
    })
  })
  const payRequired = [...payRequiredMap.values()]

  // ── Active holiday for selected day ──────────────────────────────────────
  const { data: activeHoliday } = await supabase
    .from('holidays')
    .select('id, name, student_ids')
    .lte('start_date', selectedDay)
    .gte('end_date', selectedDay)
    .limit(1)
    .maybeSingle()

  // ── Private sessions ──────────────────────────────────────────────────────
  const { data: privateSessions } = await supabase
    .from('private_sessions')
    .select('*, coach:coaches(name_ar, name_en), student:students(name_ar, name_en), hall:halls(name)')
    .eq('date', selectedDay).order('start_time')

  const { data: coaches }     = await supabase.from('coaches').select('id, name_ar, name_en').eq('is_active', true).order('name_ar')
  const { data: allStudents } = await supabase.from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar')

  // ── Formatted date ────────────────────────────────────────────────────────
  const formattedDate = selectedDate.toLocaleDateString(
    isRtl ? 'ar-EG' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  // ── NowNext helpers ───────────────────────────────────────────────────────
  function fmt12Page(time: string) {
    const [h, m] = time.split(':').map(Number)
    const h12 = h % 12 || 12
    const suf = h < 12 ? 'AM' : 'PM'
    return m === 0 ? `${h12} ${suf}` : `${h12}:${String(m).padStart(2, '0')} ${suf}`
  }
  function cleanName(name: string) {
    const DAYS = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    const TIME_RE = /^\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s*[–\-]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)$/i
    return (name || '').split(/\s*·\s*/).filter(p => !DAYS.has(p.trim()) && !TIME_RE.test(p.trim())).join(' · ')
  }
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const nowDetail = isSelectedToday
    ? sessionDetails.find(d => {
        const s = d.session.class?.start_time; const e = d.session.class?.end_time
        if (!s || !e) return false
        const [sh, sm] = s.split(':').map(Number); const [eh, em] = e.split(':').map(Number)
        return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em
      }) ?? null
    : null
  const nextDetail = isSelectedToday
    ? sessionDetails.find(d => {
        const s = d.session.class?.start_time
        if (!s) return false
        const [sh, sm] = s.split(':').map(Number)
        return sh * 60 + sm > nowMins
      }) ?? null
    : null
  const totalStudents = sessionDetails.reduce((s, d) => s + d.students.length, 0)

  const navBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
    border: '1px solid var(--border)', color: 'var(--txt2)',
    background: 'var(--bg-card)',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-page)', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Sticky nav bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Top row — day name left, nav right */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12,
        }}>
          {/* Left: day name + date + today badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt1)', lineHeight: 1 }}>
              {selectedDayLabel}
            </h1>
            <span style={{ fontSize: 13, color: 'var(--txt2)' }}>{formattedDate}</span>
            {isSelectedToday && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#d4667a', color: '#fff', borderRadius: 20, padding: '2px 9px' }}>
                {isRtl ? 'اليوم' : '+ Today'}
              </span>
            )}
            {autoCreated > 0 && (
              <span style={{ background: '#d4667a12', border: '1px solid #d4667a25', borderRadius: 8, padding: '3px 8px', color: '#d4667a', fontSize: 10, fontWeight: 600 }}>
                ✨ {autoCreated} {isRtl ? 'حصص جديدة' : 'new'}
              </span>
            )}
          </div>

          {/* Right: nav buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Link href={nav(prevDay)} style={{ ...navBtn, color: 'var(--txt1)', fontWeight: 700 }}>
              {isRtl ? 'السابق →' : '← Prev'}
            </Link>
            {!isSelectedToday && (
              <Link href="/dashboard/daily" style={{ ...navBtn, background: 'transparent', color: '#d4667a', border: '1px solid #d4667a', fontWeight: 700 }}>
                {isRtl ? 'هذا الأسبوع' : 'This week'}
              </Link>
            )}
            <Link href={nav(nextDay)} style={{ ...navBtn, color: 'var(--txt1)', fontWeight: 700 }}>
              {isRtl ? '← التالي' : 'Next →'}
            </Link>
          </div>
        </div>

        {/* Week strip */}
        <div style={{
          display: 'flex', gap: 4, padding: '6px 20px 10px',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {weekStrip.map(day => (
            <Link
              key={day.dateStr}
              href={nav(day.dateStr)}
              style={{
                flex: 1, minWidth: 56, textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 4px', borderRadius: 10,
                background: day.isSelected ? '#d4667a' : day.isToday ? '#d4667a12' : 'transparent',
                border: `1px solid ${day.isSelected ? '#d4667a' : day.isToday ? '#d4667a35' : 'transparent'}`,
                transition: 'background 0.12s',
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 600, color: day.isSelected ? '#ffcccc' : 'var(--txt2)', whiteSpace: 'nowrap' }}>
                {day.short}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: day.isSelected ? '#fff' : day.isToday ? '#d4667a' : 'var(--txt1)' }}>
                {day.num}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '18px 20px' }}>

        {/* ── NowNext hero ────────────────────────────────────────────────────── */}
        {isSelectedToday && (nowDetail || nextDetail) && (
          <div style={{ display: 'grid', gridTemplateColumns: nowDetail && nextDetail ? '2fr 1fr' : '1fr', gap: 12, marginBottom: 18 }}>

            {/* NOW card */}
            {nowDetail && (() => {
              const total  = nowDetail.students.length
              const marked = nowDetail.attendance.filter((a: any) => a.status !== 'make_up').length
              const pct    = total > 0 ? Math.round(marked / total * 100) : 0
              const coachName = nowDetail.session.coach
                ? (isRtl ? nowDetail.session.coach.name_ar : (nowDetail.session.coach.name_en || nowDetail.session.coach.name_ar))
                : null
              return (
                <div style={{
                  background: 'linear-gradient(135deg, #d4667a18 0%, #d4667a06 100%)',
                  border: '2px solid #d4667a30', borderRadius: 14, padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div className="pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#d4667a', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#d4667a', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {isRtl ? 'يحدث الآن' : 'Happening Now'}
                      {nowDetail.session.class?.start_time && nowDetail.session.class?.end_time
                        ? ` · ${fmt12Page(nowDetail.session.class.start_time)} – ${fmt12Page(nowDetail.session.class.end_time)}`
                        : ''}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--txt1)' }}>
                    {cleanName(nowDetail.session.class?.name || '')}
                  </p>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--txt2)', display: 'flex', gap: 12, flexWrap: 'wrap' } as React.CSSProperties}>
                    {coachName && <span>🎓 {coachName}</span>}
                    {nowDetail.session.hall?.name && <span>📍 {nowDetail.session.hall.name}</span>}
                    <span>👥 {total} {isRtl ? 'طالبة' : 'students'}</span>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: 'var(--txt2)', fontWeight: 600 }}>{isRtl ? 'الحضور' : 'Attendance'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt1)' }}>{marked} / {total} {isRtl ? 'مسجّل' : 'marked'}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#d4667a', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    <a
                      href={`#session-${nowDetail.session.id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        fontSize: 12, fontWeight: 700, color: '#fff', background: '#d4667a',
                        borderRadius: 8, padding: '8px 14px', textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(212,102,122,0.35)',
                      }}
                    >
                      {isRtl ? 'سجّل الحضور ←' : 'Mark attendance →'}
                    </a>
                  </div>
                </div>
              )
            })()}

            {/* NEXT card */}
            {nextDetail && (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--txt2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {isRtl ? 'التالية' : 'Up Next'}
                  </span>
                </div>
                <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>
                  {cleanName(nextDetail.session.class?.name || '')}
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--txt2)' }}>
                  {nextDetail.session.class?.start_time && nextDetail.session.class?.end_time
                    ? `${fmt12Page(nextDetail.session.class.start_time)} – ${fmt12Page(nextDetail.session.class.end_time)}`
                    : nextDetail.session.class?.start_time ? fmt12Page(nextDetail.session.class.start_time) : ''}
                  {nextDetail.session.hall?.name ? ` · ${nextDetail.session.hall.name}` : ''}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: nextDetail.makeupStudents?.length ? 8 : 0 }}>
                  <div style={{ display: 'flex' }}>
                    {nextDetail.students.slice(0, 5).map((s: any, i: number) => (
                      <div key={s.id} style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: '#d4667a15', border: '2px solid var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: '#d4667a',
                        marginInlineStart: i > 0 ? -8 : 0,
                      }}>
                        {(s.name_ar || s.name_en || '').charAt(0)}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--txt2)', fontWeight: 600 }}>
                    {nextDetail.students.length} {isRtl ? 'طالبة' : 'students'}
                  </span>
                </div>
                {nextDetail.makeupStudents && nextDetail.makeupStudents.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4a90d9', background: '#4a90d912', border: '1px solid #4a90d928', borderRadius: 20, padding: '2px 10px', display: 'inline-block' }}>
                    🔄 {nextDetail.makeupStudents.length} {isRtl ? 'تعويض' : 'make-up'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Stats strip ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', marginBottom: 18,
        }}>
          {([
            { label: isRtl ? 'الحصص اليوم' : 'Sessions Today', value: sessionDetails.length,        color: '#d4667a' },
            { label: isRtl ? 'الطالبات'    : 'Students',       value: totalStudents,                 color: '#4a90d9' },
            { label: ta('present'),                              value: presentN,                      color: '#3dab7e' },
            { label: ta('absent'),                               value: absentN,                       color: '#e04040' },
            { label: isRtl ? 'مطلوب دفع'   : 'Payment Due',    value: payRequired.length,            color: '#e8960a' },
            { label: isRtl ? 'الإيرادات'   : 'Revenue',        value: formatCurrency(totalRevenue),  color: '#3dab7e' },
            { label: isRtl ? 'صافي كاش'    : 'Net Cash',       value: formatCurrency(netCash),       color: netCash >= 0 ? '#3dab7e' : '#e04040' },
          ] as const).map((k, i) => (
            <div key={i} style={{
              padding: '12px 10px', textAlign: 'center',
              borderRight: i < 6 ? '1px solid var(--border)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Holiday banner — academy-wide only ─────────────────────────────── */}
        {activeHoliday && !activeHoliday.student_ids?.length && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#3dab7e10', border: '1px solid #3dab7e35',
            borderRadius: 12, padding: '14px 18px', marginBottom: 18,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>🎌</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#3dab7e' }}>
                {isRtl ? 'إجازة رسمية' : 'Academy Holiday'}: {activeHoliday.name}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt2)' }}>
                {isRtl
                  ? 'هذا اليوم إجازة رسمية — لن يتم خصم أي حصص من رصيد الطالبات عند تسجيل الحضور'
                  : 'This day is an official holiday — attendance can be recorded but no sessions will be deducted from student balances'}
              </p>
            </div>
          </div>
        )}
        {/* Student-specific holiday — subtle note, badges shown per-student in the card */}
        {activeHoliday && !!activeHoliday.student_ids?.length && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#3dab7e08', border: '1px solid #3dab7e25',
            borderRadius: 12, padding: '10px 16px', marginBottom: 18,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🎌</span>
            <p style={{ margin: 0, fontSize: 12, color: '#3dab7e', fontWeight: 600 }}>
              {isRtl
                ? `إجازة "${activeHoliday.name}" مفعّلة لـ ${activeHoliday.student_ids.length} طالبة — لن يتم خصم حصصهن`
                : `"${activeHoliday.name}" holiday active for ${activeHoliday.student_ids.length} student(s) — their sessions won't be deducted`}
            </p>
          </div>
        )}

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

        {/* ── Today's Schedule ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--txt1)' }}>
              {isRtl ? 'جدول اليوم' : "Today's schedule"}
            </h2>
            {sessionDetails.length > 0 && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--txt2)' }}>
                {sessionDetails.length} {isRtl ? 'حصص' : 'sessions'} · {totalStudents} {isRtl ? 'طالبة' : 'students'}
              </p>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#d4667a', background: '#d4667a18', border: '1px solid #d4667a28', borderRadius: 20, padding: '2px 10px' }}>
            {sessionDetails.length}
          </span>
        </div>

        {sessionDetails.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, textAlign: 'center', padding: '48px 0',
            color: 'var(--txt2)', marginBottom: 18,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
              {isRtl ? `لا توجد حصص يوم ${selectedDayLabel}` : `No sessions on ${selectedDayLabel}`}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11 }}>
              {isRtl ? 'لا يوجد جدول لهذا اليوم' : 'No classes are scheduled for this day'}
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: 18 }}>
            {sessionDetails.map(({ session, students, attendance, makeupStudents }) => (
              <DailySessionCard
                key={session.id}
                session={session}
                students={students}
                existingAttendance={attendance}
                makeupStudents={makeupStudents}
                allStudents={allStudents || []}
                allCoaches={coaches || []}
                isRtl={isRtl}
                locale={locale}
                activeHoliday={activeHoliday || null}
                today={todayStr}
              />
            ))}
          </div>
        )}

        {/* ── Day Finances ────────────────────────────────────────────────────── */}
        <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--txt1)' }}>
          {isRtl ? 'مالية اليوم' : 'Day Finances'}
        </h2>

        {/* Finance summary banner */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', marginBottom: 16,
        }}>
          {([
            { label: isRtl ? 'الإيرادات'    : 'Revenue',      value: formatCurrency(totalRevenue),  color: '#3dab7e' },
            { label: isRtl ? 'المصروفات'   : 'Expenses',     value: formatCurrency(totalExpenses), color: '#e04040' },
            { label: isRtl ? 'كاش في اليد' : 'Cash in Hand', value: formatCurrency(totalCash),     color: '#4a90d9' },
            { label: isRtl ? 'صافي كاش'    : 'Net Cash',     value: formatCurrency(netCash),       color: netCash >= 0 ? '#3dab7e' : '#e04040' },
          ] as const).map((k, i) => (
            <div key={i} style={{
              padding: '14px 16px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue + Expenses side by side */}
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

        {/* Private sessions */}
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
