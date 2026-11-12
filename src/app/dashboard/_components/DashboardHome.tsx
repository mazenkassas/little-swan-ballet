import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import {
  Wallet, ClipboardCheck, AlertCircle, Users, Receipt, UserCog, Clock, UserPlus, RefreshCw,
  ShoppingBag, CalendarDays, Dumbbell, ChevronLeft, ChevronRight, CheckCircle2, Cake, Check, Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { canViewPage, parseRolePerms } from '@/lib/rolePermissions'

// "Today" always means today in the academy's time zone (the server runs in UTC).
const TZ = 'Africa/Cairo'

function cairoNow() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const offset = (new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+02:00').replace('GMT', '') || '+00:00'
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  return { date, from: `${date}T00:00:00${offset}`, to: `${date}T23:59:59.999${offset}`, hm, hour: Number(hm.slice(0, 2)) }
}

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

const LABELS = {
  en: {
    hello: (h: number) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'),
    takeAttendance: 'Take attendance', addStudent: 'Add student', renewals: 'Renewals',
    revenue: 'Revenue today', net: 'Net', month: 'This month', present: 'Present today', classes: (n: number) => `${n} class${n === 1 ? '' : 'es'} today`,
    renewalsDue: 'Renewals due', renewalsSub: (low: number) => low ? `+${low} with 1 session left` : 'Packages with 0 sessions left',
    students: 'Active students', newToday: (n: number) => `+${n} new today`, totalStudents: (n: number) => `${n} in total`,
    todayClasses: "Today's classes", openDaily: 'Open daily', noClasses: 'No classes today',
    now: 'Now', next: 'Next', coachIn: 'Coach checked in',
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
    zeroLeft: '0 sessions left', oneLeft: '1 session left',
    birthdays: 'Birthdays today', turns: (n: number) => `Turns ${n}`,
  },
  ar: {
    hello: (h: number) => (h < 12 ? 'صباح الخير' : 'مساء الخير'),
    takeAttendance: 'تسجيل الحضور', addStudent: 'إضافة طالبة', renewals: 'التجديدات',
    revenue: 'إيرادات اليوم', net: 'الصافي', month: 'هذا الشهر', present: 'الحضور اليوم', classes: (n: number) => `${n} حصة اليوم`,
    renewalsDue: 'مطلوب تجديد', renewalsSub: (low: number) => low ? `+${low} متبقي لها حصة واحدة` : 'باقات متبقي فيها 0 حصة',
    students: 'الطالبات النشطات', newToday: (n: number) => `+${n} جديدة اليوم`, totalStudents: (n: number) => `${n} إجمالي`,
    todayClasses: 'حصص اليوم', openDaily: 'فتح اليومية', noClasses: 'لا توجد حصص اليوم',
    now: 'الآن', next: 'التالية', coachIn: 'المدربة سجّلت الحضور',
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
    zeroLeft: 'متبقي 0 حصة', oneLeft: 'متبقي حصة واحدة',
    birthdays: 'أعياد ميلاد اليوم', turns: (n: number) => `تكمل ${n} سنة`,
  },
}

type ActivityRow = { page: string; icon: React.ReactNode; color: string; text: string; sub?: string; value?: string; href: string }

/** A link when the user may open the page, otherwise plain (non-clickable) content. */
function MaybeLink({ ok, href, className, children }: { ok: boolean; href: string; className: string; children: React.ReactNode }) {
  return ok ? <Link href={href} className={className}>{children}</Link> : <div className={`${className} static`}>{children}</div>
}

export default async function DashboardHome() {
  const supabase = await createClient()
  const isRtl = (await getLocale()) === 'ar'
  const T = LABELS[isRtl ? 'ar' : 'en']
  const { date, from, to, hm, hour } = cairoNow()
  const monthStart = `${date.slice(0, 8)}01`
  const name = (x: { name_ar?: string | null; name_en?: string | null } | null) =>
    (isRtl ? (x?.name_ar || x?.name_en) : (x?.name_en || x?.name_ar)) || '—'

  // Who is looking, and which pages they may open (same rules as the sidebar and proxy)
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: me }, { data: permSetting }] = await Promise.all([
    user?.email
      ? supabase.from('staff').select('name, role, is_active').ilike('email', user.email.trim().replace(/[\\%_]/g, '\\$&')).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('system_settings').select('value').eq('key', 'role_permissions').maybeSingle(),
  ])
  const role = me?.is_active === false ? '' : (me?.role ?? '')
  const isSuperAdmin = role === 'super_admin'
  const perms = parseRolePerms(permSetting?.value, role)
  const can = (page: string) => canViewPage(role, perms, page)
  const canCreateStudent = isSuperAdmin || !!perms?.students?.create
  const seesMoney = can('payments')

  const [
    activeStudents, totalStudents, lowSubs, sessions, payments, monthPays, expenses, coachAtt, privates, staffAtt,
    newStudents, enrolments, freezes, transfers, newSubs, leotards, shopOrders, exams, events, holidays, birthdayPool,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id, remaining_sessions, student:students(id, name_ar, name_en, status), class:classes(name)')
      .eq('status', 'active').lte('remaining_sessions', 1).order('remaining_sessions'),
    supabase.from('sessions').select('id, status, coach_id, class:classes(name, start_time, end_time), coach:coaches(name_ar, name_en)').eq('date', date),
    seesMoney ? supabase.from('payments').select('amount_paid, payment_method').eq('date', date) : Promise.resolve({ data: [] as { amount_paid: number; payment_method: string | null }[] }),
    seesMoney ? supabase.from('payments').select('amount_paid').gte('date', monthStart).lte('date', date).limit(10000) : Promise.resolve({ data: [] as { amount_paid: number }[] }),
    can('expenses') || seesMoney ? supabase.from('expenses').select('amount').eq('date', date) : Promise.resolve({ data: [] as { amount: number }[] }),
    supabase.from('coach_attendance').select('session_id, coach_id, check_out_time').gte('check_in_time', from).lte('check_in_time', to),
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
    can('students')
      ? supabase.from('students').select('id, name_ar, name_en, date_of_birth').eq('status', 'active').not('date_of_birth', 'is', null).limit(5000)
      : Promise.resolve({ data: [] as { id: string; name_ar: string; name_en: string | null; date_of_birth: string }[] }),
  ])

  // Today's classes, in time order, with live state
  const sess = (sessions.data || []).map(s => ({ ...s, cls: one(s.class), coachRow: one(s.coach) }))
    .sort((a, b) => String(a.cls?.start_time || '').localeCompare(String(b.cls?.start_time || '')))
  const hhmm = (t?: string | null) => String(t || '').slice(0, 5)
  const nowId = sess.find(s => s.status !== 'cancelled' && hhmm(s.cls?.start_time) <= hm && hm < hhmm(s.cls?.end_time))?.id
  const nextId = sess.find(s => s.status !== 'cancelled' && hhmm(s.cls?.start_time) > hm)?.id
  const coachRows = coachAtt.data || []
  const coachIn = (s: { id: string; coach_id: string | null }) =>
    coachRows.some(c => c.session_id === s.id || (!!s.coach_id && c.coach_id === s.coach_id))

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
  const monthRevenue = (monthPays.data || []).reduce((s, p) => s + (Number(p.amount_paid) || 0), 0)
  const expTotal = (expenses.data || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const methodTotals = new Map<string, number>()
  pays.forEach(p => methodTotals.set(p.payment_method || '—', (methodTotals.get(p.payment_method || '—') || 0) + (Number(p.amount_paid) || 0)))
  const methodName = (m: string) => (m === 'cash' ? T.cash : m === 'instapay' ? T.instapay : m)

  // Packages that have run out (0) or are about to (1), active students only
  const follow = (lowSubs.data || []).map(s => ({ id: s.id, left: Number(s.remaining_sessions) || 0, st: one(s.student), cls: one(s.class) }))
    .filter(s => s.st && s.st.status === 'active')
  const due = follow.filter(f => f.left <= 0)
  const low = follow.filter(f => f.left === 1)

  // Birthdays today (month and day match)
  const md = date.slice(5)
  const year = Number(date.slice(0, 4))
  const birthdays = (birthdayPool.data || []).filter(s => String(s.date_of_birth).slice(5, 10) === md)
    .map(s => ({ ...s, age: year - Number(String(s.date_of_birth).slice(0, 4)) }))

  // Activity: only things that actually happened today, and only on pages this user may open
  const n = (x: { count: number | null }) => x.count || 0
  const staffRows = staffAtt.data || []
  const leo = leotards.data || []
  const all: ActivityRow[] = []
  if (pays.length) all.push({
    page: 'payments', icon: <Wallet size={15} />, color: '#3dab7e', text: T.payments(pays.length), value: formatCurrency(revenue), href: '/dashboard/payments',
    sub: [...methodTotals].map(([m, v]) => `${methodName(m)} ${formatCurrency(v)}`).join(' · '),
  })
  if (expenses.data?.length) all.push({ page: 'expenses', icon: <Receipt size={15} />, color: '#e04040', text: T.expenses(expenses.data.length), value: formatCurrency(expTotal), href: '/dashboard/expenses' })
  if (coachRows.length) all.push({ page: 'coaches', icon: <UserCog size={15} />, color: '#8B6EC8', text: T.coaches(coachRows.length), sub: T.checkedOut(coachRows.filter(c => c.check_out_time).length), href: '/dashboard/coaches' })
  if (n(privates)) all.push({ page: 'private', icon: <Dumbbell size={15} />, color: '#4a90d9', text: T.privates(n(privates)), href: '/dashboard/private' })
  if (isSuperAdmin && staffRows.length) all.push({ page: 'staff-log', icon: <Clock size={15} />, color: '#C8A66E', text: T.staff(staffRows.filter(s => !s.logout_time).length), sub: T.staffLogged(staffRows.length), href: '/dashboard/staff-log' })
  if (n(newStudents)) all.push({ page: 'students', icon: <UserPlus size={15} />, color: '#C8788A', text: T.newStudents(n(newStudents)), href: '/dashboard/students' })
  if (n(enrolments)) all.push({ page: 'classes', icon: <Users size={15} />, color: '#C8788A', text: T.enrolments(n(enrolments)), href: '/dashboard/classes' })
  if (n(newSubs)) all.push({ page: 'subscriptions', icon: <RefreshCw size={15} />, color: '#d4667a', text: T.packages(n(newSubs)), href: '/dashboard/subscriptions' })
  if (n(freezes)) all.push({ page: 'students', icon: <Clock size={15} />, color: '#7a8a9a', text: T.freezes(n(freezes)), href: '/dashboard/students' })
  if (n(transfers)) all.push({ page: 'transfers', icon: <RefreshCw size={15} />, color: '#7a8a9a', text: T.transfers(n(transfers)), href: '/dashboard/transfers' })
  if (leo.length) all.push({ page: 'inventory', icon: <ShoppingBag size={15} />, color: '#e8960a', text: T.leotards(leo.length), value: formatCurrency(leo.reduce((s, o) => s + (Number(o.paid_amount) || 0), 0)), href: '/dashboard/inventory' })
  if (n(shopOrders)) all.push({ page: 'inventory', icon: <ShoppingBag size={15} />, color: '#e8960a', text: T.shop(n(shopOrders)), href: '/dashboard/inventory' })
  for (const e of exams.data || []) all.push({ page: 'exams', icon: <CalendarDays size={15} />, color: '#7a8a9a', text: `${T.exam}: ${e.name}`, href: '/dashboard/exams' })
  for (const e of events.data || []) all.push({ page: 'events', icon: <CalendarDays size={15} />, color: '#7a8a9a', text: `${T.event}: ${e.name}`, href: '/dashboard/events' })
  for (const h of holidays.data || []) all.push({ page: 'holidays', icon: <CalendarDays size={15} />, color: '#7a8a9a', text: `${T.holiday}: ${(isRtl ? h.name_ar : null) || h.name}`, href: '/dashboard/holidays' })
  const activity = all.filter(a => can(a.page))

  const Chevron = isRtl ? ChevronLeft : ChevronRight
  const dateLabel = new Intl.DateTimeFormat(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const firstName = String(me?.name || user?.user_metadata?.full_name || '').trim().split(/\s+/)[0]
  const newCount = n(newStudents)

  const stats = [
    seesMoney && { page: 'payments', label: T.revenue, value: formatCurrency(revenue), sub: `${T.net} ${formatCurrency(revenue - expTotal)} · ${T.month} ${formatCurrency(monthRevenue)}`, icon: <Wallet size={16} />, color: '#3dab7e', href: '/dashboard/payments' },
    { page: 'daily', label: T.present, value: String(presentToday), sub: T.classes(sess.length), icon: <ClipboardCheck size={16} />, color: '#4a90d9', href: '/dashboard/daily' },
    { page: 'subscriptions', label: T.renewalsDue, value: String(due.length), sub: T.renewalsSub(low.length), icon: <AlertCircle size={16} />, color: due.length ? '#e04040' : '#7a8a9a', href: '/dashboard/subscriptions' },
    { page: 'students', label: T.students, value: String(n(activeStudents)), sub: newCount ? T.newToday(newCount) : T.totalStudents(n(totalStudents)), icon: <Users size={16} />, color: '#C8788A', href: '/dashboard/students' },
  ].filter(Boolean) as { page: string; label: string; value: string; sub: string; icon: React.ReactNode; color: string; href: string }[]

  const actions = [
    can('daily') && { href: '/dashboard/daily', label: T.takeAttendance, icon: <ClipboardCheck size={14} />, primary: true },
    can('students') && canCreateStudent && { href: '/dashboard/students/new', label: T.addStudent, icon: <Plus size={14} />, primary: false },
    can('subscriptions') && due.length + low.length > 0 && { href: '/dashboard/subscriptions', label: T.renewals, icon: <RefreshCw size={14} />, primary: false },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode; primary: boolean }[]

  return (
    <div className="dh">
      <header className="dh-head">
        <div>
          <h1>{T.hello(hour)}{firstName ? `${isRtl ? '،' : ','} ${firstName}` : ''}</h1>
          <p>{dateLabel}</p>
        </div>
        {actions.length > 0 && (
          <nav className="dh-actions">
            {actions.map(a => (
              <Link key={a.href} href={a.href} className={`dh-btn${a.primary ? ' primary' : ''}`}>{a.icon}{a.label}</Link>
            ))}
          </nav>
        )}
      </header>

      <div className="dh-stats">
        {stats.map(s => (
          <MaybeLink key={s.label} ok={can(s.page)} href={s.href} className="dh-stat">
            <span className="dh-stat-top">
              <span>{s.label}</span>
              <i style={{ color: s.color, background: s.color + '18' }}>{s.icon}</i>
            </span>
            <b>{s.value}</b>
            <small>{s.sub}</small>
          </MaybeLink>
        ))}
      </div>

      <div className="dh-main">
        {/* Today's classes */}
        <section className="dh-card dh-classes">
          <div className="dh-card-head">
            <h2>{T.todayClasses}</h2>
            {can('daily') && <Link href="/dashboard/daily">{T.openDaily}<Chevron size={14} /></Link>}
          </div>
          {sess.length === 0 ? <p className="dh-empty">{T.noClasses}</p> : (
            <ul className="dh-list">
              {sess.map(s => {
                const marked = markedBy.get(s.id) || 0
                const live = s.id === nowId ? 'now' : s.id === nextId ? 'next' : ''
                return (
                  <li key={s.id} className={live === 'now' ? 'is-now' : undefined}>
                    <span className="dh-grow">
                      <span className="dh-name" dir="auto">{s.cls?.name || '—'}</span>
                      <span className="dh-sub dh-coach" dir="auto">
                        {name(s.coachRow)}
                        {coachIn(s) && <Check size={12} className="dh-coach-in" aria-label={T.coachIn} />}
                      </span>
                    </span>
                    {live && <span className={`dh-live ${live}`}>{live === 'now' ? T.now : T.next}</span>}
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
          {/* Birthdays (only when there are any) */}
          {birthdays.length > 0 && (
            <section className="dh-card dh-bday">
              <div className="dh-card-head"><h2><Cake size={15} style={{ color: '#C8788A', verticalAlign: '-2px', marginInlineEnd: 6 }} />{T.birthdays}</h2></div>
              <ul className="dh-list">
                {birthdays.slice(0, 5).map(b => (
                  <li key={b.id}>
                    <MaybeLink ok={can('students')} href={`/dashboard/students/${b.id}`} className="dh-row-link">
                      <span className="dh-avatar">{name(b).charAt(0)}</span>
                      <span className="dh-grow"><span className="dh-name" dir="auto">{name(b)}</span></span>
                      {b.age > 0 && b.age < 100 && <span className="dh-pill">{T.turns(b.age)}</span>}
                    </MaybeLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

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

          {/* Needs attention: 0 sessions left first, then 1 left */}
          {can('subscriptions') || can('students') ? (
            <section className="dh-card">
              <div className="dh-card-head">
                <h2>{T.attention}</h2>
                {follow.length > 5 && can('subscriptions') && <Link href="/dashboard/subscriptions">{T.viewAll(follow.length)}<Chevron size={14} /></Link>}
              </div>
              {follow.length === 0 ? (
                <p className="dh-empty"><CheckCircle2 size={15} style={{ color: '#3dab7e', verticalAlign: '-3px', marginInlineEnd: 6 }} />{T.allGood}</p>
              ) : (
                <ul className="dh-list">
                  {follow.slice(0, 5).map(d => (
                    <li key={d.id}>
                      <MaybeLink ok={can('students')} href={`/dashboard/students/${d.st!.id}`} className="dh-row-link">
                        <span className="dh-avatar">{name(d.st).charAt(0)}</span>
                        <span className="dh-grow">
                          <span className="dh-name" dir="auto">{name(d.st)}</span>
                          {d.cls?.name && <span className="dh-sub" dir="auto">{d.cls.name}</span>}
                        </span>
                        <span className={`dh-pill ${d.left <= 0 ? 'bad' : 'warn'}`}>{d.left <= 0 ? T.zeroLeft : T.oneLeft}</span>
                      </MaybeLink>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
