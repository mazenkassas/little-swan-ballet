import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import {
  Wallet, Receipt, Scale, ClipboardCheck, UserCog, Clock, UserPlus, RefreshCw, ShoppingBag, CalendarDays,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

// Everything here is "today" in the academy's time zone (the server runs in UTC).
const TZ = 'Africa/Cairo'

function cairoDay() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const offset = (new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+02:00').replace('GMT', '') || '+00:00'
  return { date, from: `${date}T00:00:00${offset}`, to: `${date}T23:59:59.999${offset}` }
}

const L = {
  en: {
    title: "Today's summary", superOnly: 'Super admin',
    revenue: 'Revenue', payments: (n: number) => `${n} payment${n === 1 ? '' : 's'}`, by: 'Recorded by',
    expenses: 'Expenses', items: (n: number) => `${n} item${n === 1 ? '' : 's'}`,
    net: 'Net today', cashInHand: 'Cash in hand',
    attendance: 'Class attendance', sessions: (n: number, done: number) => `${n} sessions · ${done} completed`,
    present: 'Present', absent: 'Absent', makeup: 'Make-up',
    coaches: 'Coaches', checkedIn: 'checked in', checkedOut: 'Checked out', privates: 'Private sessions',
    staff: 'Staff shifts', loggedIn: 'logged in', onShift: 'Still on shift',
    students: 'Students', newStudents: 'new', enrolments: 'Class enrolments', freezes: 'Freezes', transfers: 'Transfers',
    packages: 'Packages', newPackages: 'new / renewed', startToday: 'Starting today',
    leotards: 'Leotards & shop', leoOrders: 'leotard orders', collected: 'Collected', shopOrders: 'Shop orders',
    calendar: 'On the calendar', exam: 'Exam', event: 'Event', holiday: 'Holiday', nothing: 'Nothing scheduled',
    none: 'None yet',
  },
  ar: {
    title: 'ملخص اليوم', superOnly: 'سوبر أدمن',
    revenue: 'الإيرادات', payments: (n: number) => `${n} دفعة`, by: 'سجّلها',
    expenses: 'المصروفات', items: (n: number) => `${n} بند`,
    net: 'صافي اليوم', cashInHand: 'كاش في اليد',
    attendance: 'حضور الحصص', sessions: (n: number, done: number) => `${n} حصة · ${done} مكتملة`,
    present: 'حاضرة', absent: 'غائبة', makeup: 'تعويض',
    coaches: 'المدربات', checkedIn: 'سجّلن الحضور', checkedOut: 'سجّلن الانصراف', privates: 'حصص برايفت',
    staff: 'ورديات الموظفين', loggedIn: 'سجّلوا الدخول', onShift: 'ما زالوا في الوردية',
    students: 'الطالبات', newStudents: 'جديدة', enrolments: 'تسجيل في مجموعات', freezes: 'تجميد', transfers: 'نقل',
    packages: 'الباقات', newPackages: 'جديدة / تجديد', startToday: 'تبدأ اليوم',
    leotards: 'المايوهات والمتجر', leoOrders: 'طلبات مايوهات', collected: 'المحصّل', shopOrders: 'طلبات المتجر',
    calendar: 'على التقويم', exam: 'امتحان', event: 'فعالية', holiday: 'إجازة', nothing: 'لا يوجد شيء اليوم',
    none: 'لا يوجد بعد',
  },
}

/** Super-admin-only overview of everything recorded for today. Renders nothing for other roles. */
export default async function DashboardToday() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data: me } = await supabase
    .from('staff').select('role, is_active')
    .ilike('email', user.email.trim().replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  if (!me || me.role !== 'super_admin' || me.is_active === false) return null

  const isRtl = (await getLocale()) === 'ar'
  const T = L[isRtl ? 'ar' : 'en']
  const { date, from, to } = cairoDay()

  const [
    payments, expenses, sessions, coachAtt, privates, staffAtt, newStudents, enrolments,
    freezes, transfers, newSubs, startingSubs, leotards, shopOrders, exams, events, holidays,
  ] = await Promise.all([
    supabase.from('payments').select('amount_paid, payment_method, staff:staff(name)').eq('date', date),
    supabase.from('expenses').select('amount').eq('date', date),
    supabase.from('sessions').select('id, status').eq('date', date),
    supabase.from('coach_attendance').select('check_out_time').gte('check_in_time', from).lte('check_in_time', to),
    supabase.from('private_sessions').select('id', { count: 'exact', head: true }).eq('date', date),
    supabase.from('staff_attendance').select('logout_time').gte('login_time', from).lte('login_time', to),
    supabase.from('students').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('class_students').select('id', { count: 'exact', head: true }).eq('enrolled_date', date),
    supabase.from('freezes').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('student_transfers').select('id', { count: 'exact', head: true }).or(`request_date.eq.${date},decision_date.eq.${date}`),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('start_date', date),
    supabase.from('leotard_orders').select('paid_amount').gte('created_at', from).lte('created_at', to),
    supabase.from('product_orders').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
    supabase.from('exams').select('name').eq('date', date),
    supabase.from('events').select('name').eq('date', date),
    supabase.from('holidays').select('name, name_ar').lte('start_date', date).gte('end_date', date),
  ])

  // Student attendance in today's sessions
  const sessionIds = (sessions.data || []).map(s => s.id)
  const { data: att } = sessionIds.length
    ? await supabase.from('attendance').select('status').in('session_id', sessionIds)
    : { data: [] as { status: string }[] }
  const attCount = (s: string) => (att || []).filter(a => a.status === s).length

  // Money
  const pays = payments.data || []
  const revenue = pays.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0)
  const cash = pays.filter(p => p.payment_method === 'cash').reduce((s, p) => s + (Number(p.amount_paid) || 0), 0)
  const expTotal = (expenses.data || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const byMethod = new Map<string, number>()
  pays.forEach(p => byMethod.set(p.payment_method || '—', (byMethod.get(p.payment_method || '—') || 0) + (Number(p.amount_paid) || 0)))
  const byStaff = new Map<string, number>()
  pays.forEach(p => {
    const st = Array.isArray(p.staff) ? p.staff[0] : p.staff
    const n = (st as { name?: string } | null)?.name || '—'
    byStaff.set(n, (byStaff.get(n) || 0) + 1)
  })
  const methodLabel = (m: string) => m === 'cash' ? (isRtl ? 'كاش' : 'Cash') : m === 'instapay' ? (isRtl ? 'انستاباي' : 'Instapay') : m

  const sess = sessions.data || []
  const coaches = coachAtt.data || []
  const staffRows = staffAtt.data || []
  const leo = leotards.data || []
  const calendar = [
    ...(exams.data || []).map(e => `${T.exam}: ${e.name}`),
    ...(events.data || []).map(e => `${T.event}: ${e.name}`),
    ...(holidays.data || []).map(h => `${T.holiday}: ${(isRtl ? h.name_ar : null) || h.name}`),
  ]

  const cards: { href: string; icon: React.ReactNode; color: string; title: string; value: string; lines: string[] }[] = [
    {
      href: '/dashboard/payments', icon: <Wallet size={17} />, color: '#3dab7e', title: T.revenue,
      value: formatCurrency(revenue),
      lines: [
        T.payments(pays.length) + (byMethod.size ? ' · ' + [...byMethod].map(([m, v]) => `${methodLabel(m)} ${formatCurrency(v)}`).join(' · ') : ''),
        ...(byStaff.size ? [`${T.by}: ${[...byStaff].map(([n, c]) => `${n} (${c})`).join('، ')}`] : []),
      ],
    },
    {
      href: '/dashboard/expenses', icon: <Receipt size={17} />, color: '#e04040', title: T.expenses,
      value: formatCurrency(expTotal), lines: [T.items((expenses.data || []).length)],
    },
    {
      href: '/dashboard/daily', icon: <Scale size={17} />, color: revenue - expTotal >= 0 ? '#4A8C6A' : '#e04040', title: T.net,
      value: formatCurrency(revenue - expTotal), lines: [`${T.cashInHand}: ${formatCurrency(cash - expTotal)}`],
    },
    {
      href: '/dashboard/daily', icon: <ClipboardCheck size={17} />, color: '#4a90d9', title: T.attendance,
      value: `${attCount('present')} ${T.present}`,
      lines: [
        T.sessions(sess.length, sess.filter(s => s.status === 'completed').length),
        `${T.absent}: ${attCount('absent')} · ${T.makeup}: ${attCount('makeup')}`,
      ],
    },
    {
      href: '/dashboard/coaches', icon: <UserCog size={17} />, color: '#8B6EC8', title: T.coaches,
      value: `${coaches.length} ${T.checkedIn}`,
      lines: [`${T.checkedOut}: ${coaches.filter(c => c.check_out_time).length}`, `${T.privates}: ${privates.count || 0}`],
    },
    {
      href: '/dashboard/staff-log', icon: <Clock size={17} />, color: '#C8A66E', title: T.staff,
      value: `${staffRows.length} ${T.loggedIn}`,
      lines: [`${T.onShift}: ${staffRows.filter(s => !s.logout_time).length}`],
    },
    {
      href: '/dashboard/students', icon: <UserPlus size={17} />, color: '#C8788A', title: T.students,
      value: `${newStudents.count || 0} ${T.newStudents}`,
      lines: [`${T.enrolments}: ${enrolments.count || 0}`, `${T.freezes}: ${freezes.count || 0} · ${T.transfers}: ${transfers.count || 0}`],
    },
    {
      href: '/dashboard/subscriptions', icon: <RefreshCw size={17} />, color: '#d4667a', title: T.packages,
      value: `${newSubs.count || 0} ${T.newPackages}`,
      lines: [`${T.startToday}: ${startingSubs.count || 0}`],
    },
    {
      href: '/dashboard/inventory', icon: <ShoppingBag size={17} />, color: '#e8960a', title: T.leotards,
      value: `${leo.length} ${T.leoOrders}`,
      lines: [`${T.collected}: ${formatCurrency(leo.reduce((s, o) => s + (Number(o.paid_amount) || 0), 0))}`, `${T.shopOrders}: ${shopOrders.count || 0}`],
    },
    {
      href: '/dashboard/events', icon: <CalendarDays size={17} />, color: '#7a8a9a', title: T.calendar,
      value: calendar.length ? String(calendar.length) : '—',
      lines: calendar.length ? calendar.slice(0, 3) : [T.nothing],
    },
  ]

  const dateLabel = new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <section style={{ marginBottom: 20 }} aria-label={T.title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{T.title}</h2>
        <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{dateLabel}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#C8788A', background: '#C8788A18', border: '1px solid #C8788A40', borderRadius: 999, padding: '2px 8px' }}>
          {T.superOnly}
        </span>
      </div>
      <div className="today-grid">
        {cards.map(c => (
          <Link key={c.title} href={c.href} className="today-card" style={{
            display: 'block', textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 14, color: 'inherit',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', color: c.color, background: c.color + '18' }}>
                {c.icon}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt2)' }}>{c.title}</span>
            </div>
            <p style={{ fontSize: 19, fontWeight: 700, color: 'var(--txt1)', margin: '0 0 4px', letterSpacing: -0.3 }}>{c.value}</p>
            {c.lines.map((line, i) => (
              <p key={i} style={{ fontSize: 11.5, color: 'var(--txt2)', margin: '2px 0 0', lineHeight: 1.45, overflowWrap: 'anywhere' }}>{line}</p>
            ))}
          </Link>
        ))}
      </div>
    </section>
  )
}
