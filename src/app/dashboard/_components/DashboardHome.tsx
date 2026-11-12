import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import {
  Wallet, ClipboardCheck, AlertCircle, Users, Receipt, UserCog, Clock, UserPlus, RefreshCw,
  ShoppingBag, CalendarDays, Dumbbell, ChevronLeft, ChevronRight, CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

// "Today" always means today in the academy's time zone (the server runs in UTC).
const TZ = 'Africa/Cairo'

function cairoDay() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const offset = (new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+02:00').replace('GMT', '') || '+00:00'
  return { date, from: `${date}T00:00:00${offset}`, to: `${date}T23:59:59.999${offset}` }
}

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

const LABELS = {
  en: {
    title: 'Dashboard',
    revenue: 'Revenue today', net: 'Net', present: 'Present today', classes: (n: number) => `${n} class${n === 1 ? '' : 'es'} today`,
    renewals: 'Renewals due', renewalsSub: 'Packages with 0 sessions left', students: 'Active students', newToday: (n: number) => `+${n} new today`,
    totalStudents: (n: number) => `${n} in total`,
    todayClasses: "Today's classes", openDaily: 'Open daily', noClasses: 'No classes today',
    status: { scheduled: 'Upcoming', completed: 'Done', cancelled: 'Cancelled' } as Record<string, string>,
    activity: "Today's activity", quiet: 'Nothing recorded yet today',
    payments: (n: number) => `${n} payment${n === 1 ? '' : 's'}`, expenses: (n: number) => `${n} expense${n === 1 ? '' : 's'}`,
    coaches: (n: number) => `${n} coach${n === 1 ? '' : 'es'} checked in`, checkedOut: (n: number) => `${n} checked out`,
    privates: (n: number) => `${n} private session${n === 1 ? '' : 's'}`,
    staff: (n: number) => `${n} staff on shift`, staffLogged: (n: number) => `${n} logged in today`,
    newStudents: (n: number) => `${n} new student${n === 1 ? '' : 's'}`, enrolments: (n: number) => `${n} class enrolment${n === 1 ? '' : 's'}`,
    packages: (n: number) => `${n} package${n === 1 ? '' : 's'} sold / renewed`,
    freezes: (n: number) => `${n} freeze${n === 1 ? '' : 's'}`, transfers: (n: number) => `${n} transfer${n === 1 ? '' : 's'}`,
    leotards: (n: number) => `${n} leotard order${n === 1 ? '' : 's'}`, shop: (n: number) => `${n} shop order${n === 1 ? '' : 's'}`,
    exam: 'Exam', event: 'Event', holiday: 'Holiday', cash: 'Cash', instapay: 'Instapay',
    attention: 'Needs attention', viewAll: (n: number) => `View all (${n})`, allGood: 'All packages are up to date',
    noSessionsLeft: '0 sessions left',
  },
  ar: {
    title: 'لوحة التحكم',
    revenue: 'إيرادات اليوم', net: 'الصافي', present: 'الحضور اليوم', classes: (n: number) => `${n} حصة اليوم`,
    renewals: 'مطلوب تجديد', renewalsSub: 'باقات متبقي فيها 0 حصة', students: 'الطالبات النشطات', newToday: (n: number) => `+${n} جديدة اليوم`,
    totalStudents: (n: number) => `${n} إجمالي`,
    todayClasses: 'حصص اليوم', openDaily: 'فتح اليومية', noClasses: 'لا توجد حصص اليوم',
    status: { scheduled: 'قادمة', completed: 'انتهت', cancelled: 'ملغاة' } as Record<string, string>,
    activity: 'نشاط اليوم', quiet: 'لم يُسجَّل شيء اليوم بعد',
    payments: (n: number) => `${n} دفعة`, expenses: (n: number) => `${n} مصروف`,
    coaches: (n: number) => `${n} مدربة سجّلت الحضور`, checkedOut: (n: number) => `${n} انصرفت`,
    privates: (n: number) => `${n} حصة برايفت`,
    staff: (n: number) => `${n} موظف في الوردية`, staffLogged: (n: number) => `${n} سجّلوا الدخول اليوم`,
    newStudents: (n: number) => `${n} طالبة جديدة`, enrolments: (n: number) => `${n} تسجيل في مجموعة`,
    packages: (n: number) => `${n} باقة جديدة / تجديد`,
    freezes: (n: number) => `${n} تجميد`, transfers: (n: number) => `${n} نقل`,
    leotards: (n: number) => `${n} طلب مايوه`, shop: (n: number) => `${n} طلب متجر`,
    exam: 'امتحان', event: 'فعالية', holiday: 'إجازة', cash: 'كاش', instapay: 'انستاباي',
    attention: 'يحتاج متابعة', viewAll: (n: number) => `عرض الكل (${n})`, allGood: 'كل الباقات سارية',
    noSessionsLeft: 'متبقي 0 حصة',
  },
}

type ActivityRow = { icon: React.ReactNode; color: string; text: string; sub?: string; value?: string; href: string }

export default async function DashboardHome() {
  const supabase = await createClient()
  const isRtl = (await getLocale()) === 'ar'
  const T = LABELS[isRtl ? 'ar' : 'en']
  const { date, from, to } = cairoDay()
  const name = (x: { name_ar?: string | null; name_en?: string | null } | null) =>
    (isRtl ? (x?.name_ar || x?.name_en) : (x?.name_en || x?.name_ar)) || '—'

  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = user?.email
    ? await supabase.from('staff').select('role, is_active')
        .ilike('email', user.email.trim().replace(/[\\%_]/g, '\\$&')).maybeSingle()
    : { data: null }
  const isSuperAdmin = me?.role === 'super_admin' && me?.is_active !== false

  const [
    activeStudents, totalStudents, dueSubs, sessions, payments, expenses, coachAtt, privates, staffAtt,
    newStudents, enrolments, freezes, transfers, newSubs, leotards, shopOrders, exams, events, holidays,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id, student:students(id, name_ar, name_en, status), class:classes(name)')
      .eq('status', 'active').eq('remaining_sessions', 0),
    supabase.from('sessions').select('id, status, class:classes(name, start_time, end_time), coach:coaches(name_ar, name_en)').eq('date', date),
    supabase.from('payments').select('amount_paid, payment_method').eq('date', date),
    supabase.from('expenses').select('amount').eq('date', date),
    supabase.from('coach_attendance').select('check_out_time').gte('check_in_time', from).lte('check_in_time', to),
    supabase.from('private_sessions').select('id', { count: 'exact', head: true }).eq('date', date),
    isSuperAdmin
      ? supabase.from('staff_attendance').select('logout_time').gte('login_time', from).lte('login_time', to)
      : Promise.resolve({ data: [] as { logout_time: string | null }[] }),
    supabase.from('students').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('class_students').select('id', { count: 'exact', head: true }).eq('enrolled_date', date),
    supabase.from('freezes').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('student_transfers').select('id', { count: 'exact', head: true }).or(`request_date.eq.${date},decision_date.eq.${date}`),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('leotard_orders').select('paid_amount').gte('created_at', from).lte('created_at', to),
    supabase.from('product_orders').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('exams').select('name').eq('date', date),
    supabase.from('events').select('name').eq('date', date),
    supabase.from('holidays').select('name, name_ar').lte('start_date', date).gte('end_date', date),
  ])

  // Attendance marked in today's sessions, per session
  const sess = (sessions.data || []).map(s => ({ ...s, cls: one(s.class), coachRow: one(s.coach) }))
    .sort((a, b) => String(a.cls?.start_time || '').localeCompare(String(b.cls?.start_time || '')))
  const ids = sess.map(s => s.id)
  const { data: att } = ids.length
    ? await supabase.from('attendance').select('session_id, status').in('session_id', ids)
    : { data: [] as { session_id: string; status: string }[] }
  const presentBy = new Map<string, number>(), markedBy = new Map<string, number>()
  for (const a of att || []) {
    markedBy.set(a.session_id, (markedBy.get(a.session_id) || 0) + 1)
    if (a.status === 'present') presentBy.set(a.session_id, (presentBy.get(a.session_id) || 0) + 1)
  }
  const presentToday = (att || []).filter(a => a.status === 'present').length

  // Money
  const pays = payments.data || []
  const revenue = pays.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0)
  const expTotal = (expenses.data || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const methodTotals = new Map<string, number>()
  pays.forEach(p => methodTotals.set(p.payment_method || '—', (methodTotals.get(p.payment_method || '—') || 0) + (Number(p.amount_paid) || 0)))
  const methodName = (m: string) => (m === 'cash' ? T.cash : m === 'instapay' ? T.instapay : m)

  // Renewals due (active students only)
  const due = (dueSubs.data || []).map(s => ({ id: s.id, st: one(s.student), cls: one(s.class) }))
    .filter(s => s.st && s.st.status === 'active')

  // Activity: only things that actually happened today
  const n = (x: { count: number | null }) => x.count || 0
  const coaches = coachAtt.data || []
  const staffRows = staffAtt.data || []
  const leo = leotards.data || []
  const activity: ActivityRow[] = []
  if (pays.length) activity.push({
    icon: <Wallet size={15} />, color: '#3dab7e', text: T.payments(pays.length), value: formatCurrency(revenue), href: '/dashboard/payments',
    sub: [...methodTotals].map(([m, v]) => `${methodName(m)} ${formatCurrency(v)}`).join(' · '),
  })
  if (expenses.data?.length) activity.push({ icon: <Receipt size={15} />, color: '#e04040', text: T.expenses(expenses.data.length), value: formatCurrency(expTotal), href: '/dashboard/expenses' })
  if (coaches.length) activity.push({ icon: <UserCog size={15} />, color: '#8B6EC8', text: T.coaches(coaches.length), sub: T.checkedOut(coaches.filter(c => c.check_out_time).length), href: '/dashboard/coaches' })
  if (n(privates)) activity.push({ icon: <Dumbbell size={15} />, color: '#4a90d9', text: T.privates(n(privates)), href: '/dashboard/private' })
  if (isSuperAdmin && staffRows.length) activity.push({ icon: <Clock size={15} />, color: '#C8A66E', text: T.staff(staffRows.filter(s => !s.logout_time).length), sub: T.staffLogged(staffRows.length), href: '/dashboard/staff-log' })
  if (n(newStudents)) activity.push({ icon: <UserPlus size={15} />, color: '#C8788A', text: T.newStudents(n(newStudents)), href: '/dashboard/students' })
  if (n(enrolments)) activity.push({ icon: <Users size={15} />, color: '#C8788A', text: T.enrolments(n(enrolments)), href: '/dashboard/classes' })
  if (n(newSubs)) activity.push({ icon: <RefreshCw size={15} />, color: '#d4667a', text: T.packages(n(newSubs)), href: '/dashboard/subscriptions' })
  if (n(freezes)) activity.push({ icon: <Clock size={15} />, color: '#7a8a9a', text: T.freezes(n(freezes)), href: '/dashboard/students' })
  if (n(transfers)) activity.push({ icon: <RefreshCw size={15} />, color: '#7a8a9a', text: T.transfers(n(transfers)), href: '/dashboard/transfers' })
  if (leo.length) activity.push({ icon: <ShoppingBag size={15} />, color: '#e8960a', text: T.leotards(leo.length), value: formatCurrency(leo.reduce((s, o) => s + (Number(o.paid_amount) || 0), 0)), href: '/dashboard/inventory' })
  if (n(shopOrders)) activity.push({ icon: <ShoppingBag size={15} />, color: '#e8960a', text: T.shop(n(shopOrders)), href: '/dashboard/inventory' })
  for (const e of exams.data || []) activity.push({ icon: <CalendarDays size={15} />, color: '#7a8a9a', text: `${T.exam}: ${e.name}`, href: '/dashboard/exams' })
  for (const e of events.data || []) activity.push({ icon: <CalendarDays size={15} />, color: '#7a8a9a', text: `${T.event}: ${e.name}`, href: '/dashboard/events' })
  for (const h of holidays.data || []) activity.push({ icon: <CalendarDays size={15} />, color: '#7a8a9a', text: `${T.holiday}: ${(isRtl ? h.name_ar : null) || h.name}`, href: '/dashboard/holidays' })

  const Chevron = isRtl ? ChevronLeft : ChevronRight
  const dateLabel = new Intl.DateTimeFormat(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const newCount = n(newStudents)

  const stats = [
    { label: T.revenue, value: formatCurrency(revenue), sub: `${T.net}: ${formatCurrency(revenue - expTotal)}`, icon: <Wallet size={16} />, color: '#3dab7e', href: '/dashboard/payments' },
    { label: T.present, value: String(presentToday), sub: T.classes(sess.length), icon: <ClipboardCheck size={16} />, color: '#4a90d9', href: '/dashboard/daily' },
    { label: T.renewals, value: String(due.length), sub: T.renewalsSub, icon: <AlertCircle size={16} />, color: due.length ? '#e04040' : '#7a8a9a', href: '/dashboard/subscriptions' },
    { label: T.students, value: String(n(activeStudents)), sub: newCount ? T.newToday(newCount) : T.totalStudents(n(totalStudents)), icon: <Users size={16} />, color: '#C8788A', href: '/dashboard/students' },
  ]

  return (
    <div className="dh">
      <header className="dh-head">
        <h1>{T.title}</h1>
        <p>{dateLabel}</p>
      </header>

      <div className="dh-stats">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="dh-stat">
            <span className="dh-stat-top">
              <span>{s.label}</span>
              <i style={{ color: s.color, background: s.color + '18' }}>{s.icon}</i>
            </span>
            <b>{s.value}</b>
            <small>{s.sub}</small>
          </Link>
        ))}
      </div>

      <div className="dh-main">
        {/* Today's classes */}
        <section className="dh-card dh-classes">
          <div className="dh-card-head">
            <h2>{T.todayClasses}</h2>
            <Link href="/dashboard/daily">{T.openDaily}<Chevron size={14} /></Link>
          </div>
          {sess.length === 0 ? <p className="dh-empty">{T.noClasses}</p> : (
            <ul className="dh-list">
              {sess.map(s => {
                const marked = markedBy.get(s.id) || 0
                return (
                  <li key={s.id}>
                    <span className="dh-grow">
                      <span className="dh-name" dir="auto">{s.cls?.name || '—'}</span>
                      <span className="dh-sub" dir="auto">{name(s.coachRow)}</span>
                    </span>
                    {marked > 0
                      ? <span className="dh-pill ok">{presentBy.get(s.id) || 0}/{marked}</span>
                      : <span className={`dh-pill ${s.status === 'cancelled' ? 'bad' : ''}`}>{T.status[s.status] || s.status}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="dh-side">
          {/* Today's activity */}
          <section className="dh-card">
            <div className="dh-card-head"><h2>{T.activity}</h2></div>
            {activity.length === 0 ? <p className="dh-empty">{T.quiet}</p> : (
              <ul className="dh-list">
                {activity.map((a, i) => (
                  <li key={i}>
                    <Link href={a.href} className="dh-row-link">
                      <i className="dh-ic" style={{ color: a.color, background: a.color + '18' }}>{a.icon}</i>
                      <span className="dh-grow">
                        <span className="dh-name" dir="auto">{a.text}</span>
                        {a.sub && <span className="dh-sub" dir="auto">{a.sub}</span>}
                      </span>
                      {a.value && <span className="dh-val">{a.value}</span>}
                      <Chevron size={14} className="dh-chev" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Needs attention */}
          <section className="dh-card">
            <div className="dh-card-head">
              <h2>{T.attention}</h2>
              {due.length > 5 && <Link href="/dashboard/subscriptions">{T.viewAll(due.length)}<Chevron size={14} /></Link>}
            </div>
            {due.length === 0 ? (
              <p className="dh-empty"><CheckCircle2 size={15} style={{ color: '#3dab7e', verticalAlign: '-3px', marginInlineEnd: 6 }} />{T.allGood}</p>
            ) : (
              <ul className="dh-list">
                {due.slice(0, 5).map(d => (
                  <li key={d.id}>
                    <Link href={`/dashboard/students/${d.st!.id}`} className="dh-row-link">
                      <span className="dh-avatar">{name(d.st).charAt(0)}</span>
                      <span className="dh-grow">
                        <span className="dh-name" dir="auto">{name(d.st)}</span>
                        {d.cls?.name && <span className="dh-sub" dir="auto">{d.cls.name}</span>}
                      </span>
                      <span className="dh-pill bad">{T.noSessionsLeft}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
