'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  computeDeduction,
  computeRefund,
  computeSubscriptionStartDate,
  getActiveSubForClass,
  isStudentOnHoliday,
  sessionCountsForStudent,
  type AttendanceStatus,
} from '@/lib/subscriptionLogic'
import { cairoToday, checkSubscriptionsAccess } from './access'

const SUB_FIELDS = 'id, class_id, plan_id, total_sessions, remaining_sessions, start_date, status, next_cycle_start, created_at, plan:subscription_plans(id, name, sessions_count, price)'

type Holiday = { start_date: string; end_date: string; student_ids: string[] | null; name: string }

export type DetailSession = {
  id: string
  date: string
  status: AttendanceStatus
  attendanceId: string | null
  holiday: string | null      // holiday name if the student is on holiday that day
  counts: boolean             // true when a present/absent mark uses a session of the current package
}

export type StudentDetail = {
  student: { id: string; name_ar: string; name_en: string | null; fee: number | null }
  klass: { id: string; name: string; days_of_week: string[] } | null
  sub: {
    id: string; total_sessions: number; remaining_sessions: number; start_date: string
    next_cycle_start: string | null; plan_id: string | null; planName: string | null
  } | null
  sessions: DetailSession[]
  makeups: { date: string; className: string }[]
  plans: { id: string; name: string; sessions_count: number; price: number }[]
  suggestedStart: string
  today: string
  canEdit: boolean
}

function studentFee(s: { monthly_fees?: number | null; discounted_monthly_fees?: number | null; discount_end_date?: string | null }, today: string) {
  const mf = Number(s.monthly_fees) || 0
  const df = Number(s.discounted_monthly_fees) || 0
  const discountValid = df > 0 && df < mf && (!s.discount_end_date || s.discount_end_date >= today)
  return discountValid ? df : mf || null
}

function holidayFor(holidays: Holiday[], date: string, studentId: string): Holiday | null {
  const h = holidays.find(x => x.start_date <= date && x.end_date >= date)
  return h && isStudentOnHoliday(h, studentId) ? h : null
}

/** Everything the student panel needs: package, sessions with marks, plans, defaults. */
export async function getStudentDetail(studentId: string, classId: string | null): Promise<{ error?: string; data?: StudentDetail }> {
  const supabase = await createClient()
  const viewer = await checkSubscriptionsAccess(supabase, 'view')
  if (!viewer) return { error: 'Not allowed' }
  const canEdit = !!(await checkSubscriptionsAccess(supabase, 'edit'))
  const today = cairoToday()

  const [{ data: student }, { data: klass }, { data: subs }, { data: plans }] = await Promise.all([
    supabase.from('students').select('id, name_ar, name_en, monthly_fees, discounted_monthly_fees, discount_end_date').eq('id', studentId).single(),
    classId
      ? supabase.from('classes').select('id, name, days_of_week').eq('id', classId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('subscriptions').select(SUB_FIELDS).eq('student_id', studentId).eq('status', 'active'),
    supabase.from('subscription_plans').select('id, name, sessions_count, price').eq('is_active', true).order('sessions_count'),
  ])
  if (!student) return { error: 'Student not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub: any = getActiveSubForClass(subs as any, classId)
  const plan = sub ? (Array.isArray(sub.plan) ? sub.plan[0] : sub.plan) : null

  // Sessions of this class: from 8 weeks before the package start (or today) up to today
  const anchor = sub?.start_date && sub.start_date < today ? sub.start_date : today
  const from = new Date(anchor + 'T00:00:00Z')
  from.setUTCDate(from.getUTCDate() - 56)
  const fromStr = from.toISOString().slice(0, 10)

  const [{ data: sessions }, { data: holidays }, { data: myAttendance }] = await Promise.all([
    classId
      ? supabase.from('sessions').select('id, date').eq('class_id', classId).gte('date', fromStr).lte('date', today).order('date', { ascending: false })
      : Promise.resolve({ data: [] as { id: string; date: string }[] }),
    supabase.from('holidays').select('name, start_date, end_date, student_ids').gte('end_date', fromStr),
    supabase.from('attendance').select('id, session_id, status, session:sessions!session_id(date, class_id, class:classes(name))').eq('student_id', studentId),
  ])

  const bySession = new Map<string, { id: string; status: AttendanceStatus }>()
  const makeups: StudentDetail['makeups'] = []
  for (const a of myAttendance || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = Array.isArray(a.session) ? a.session[0] : a.session
    if (s?.class_id === classId) bySession.set(a.session_id, { id: a.id, status: a.status as AttendanceStatus })
    else if (a.status === 'make_up' && s?.date >= fromStr) {
      const c = Array.isArray(s.class) ? s.class[0] : s.class
      makeups.push({ date: s.date, className: c?.name ?? '' })
    }
  }
  makeups.sort((a, b) => b.date.localeCompare(a.date))

  const detailSessions: DetailSession[] = (sessions || []).map(s => {
    const att = bySession.get(s.id)
    const h = holidayFor((holidays || []) as Holiday[], s.date, studentId)
    const counts = !!sub && sessionCountsForStudent({ holiday: h, studentId, subStartDate: sub.start_date, sessionDate: s.date })
    return { id: s.id, date: s.date, status: att?.status ?? null, attendanceId: att?.id ?? null, holiday: h?.name ?? null, counts }
  })

  const classDays: string[] = klass?.days_of_week || []
  const suggestedStart = computeSubscriptionStartDate(sub, classDays, new Date(today + 'T00:00:00'))

  return {
    data: {
      student: { id: student.id, name_ar: student.name_ar, name_en: student.name_en, fee: studentFee(student, today) },
      klass: klass ? { id: klass.id, name: klass.name, days_of_week: classDays } : null,
      sub: sub ? {
        id: sub.id, total_sessions: sub.total_sessions, remaining_sessions: sub.remaining_sessions,
        start_date: sub.start_date, next_cycle_start: sub.next_cycle_start ?? null,
        plan_id: sub.plan_id ?? null, planName: plan?.name ?? null,
      } : null,
      sessions: detailSessions,
      makeups,
      plans: (plans || []).map(p => ({ id: p.id, name: p.name, sessions_count: p.sessions_count, price: Number(p.price) })),
      suggestedStart,
      today,
      canEdit,
    },
  }
}

/** Manual renewal: optional payment, expire the current package, start a new full one. */
export async function renewSubscription(input: {
  studentId: string
  classId: string | null
  planId: string
  startDate: string
  recordPayment: boolean
  amount: number
  method: 'cash' | 'instapay'
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const editor = await checkSubscriptionsAccess(supabase, 'edit')
  if (!editor) return { error: 'Not allowed' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return { error: 'Invalid start date' }
  if (input.recordPayment && !(input.amount > 0)) return { error: 'Enter the amount paid' }

  const { data: plan } = await supabase
    .from('subscription_plans').select('id, sessions_count').eq('id', input.planId).maybeSingle()
  if (!plan) return { error: 'Plan not found' }

  const { data: subs } = await supabase
    .from('subscriptions').select('id, status, class_id').eq('student_id', input.studentId).eq('status', 'active')
  const current = getActiveSubForClass(subs, input.classId)

  let paymentId: string | null = null
  if (input.recordPayment) {
    const { data: pay, error } = await supabase.from('payments').insert({
      student_id: input.studentId,
      type: 'subscription',
      amount_due: input.amount,
      amount_paid: input.amount,
      payment_method: input.method,
      date: cairoToday(),
      staff_id: editor.staffId,
      notes: 'Manual renewal (Subscriptions page)',
    }).select('id').single()
    if (error) return { error: error.message }
    paymentId = pay.id
  }

  if (current) {
    const { error } = await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', current.id)
    if (error) return { error: error.message }
  }

  const { error: insErr } = await supabase.from('subscriptions').insert({
    student_id: input.studentId,
    class_id: input.classId,
    plan_id: plan.id,
    total_sessions: plan.sessions_count,
    remaining_sessions: plan.sessions_count,
    start_date: input.startDate,
    status: 'active',
    payment_id: paymentId,
  })
  if (insErr) {
    // put things back so the student is never left without a package
    if (current) await supabase.from('subscriptions').update({ status: 'active' }).eq('id', current.id)
    if (paymentId) await supabase.from('payments').delete().eq('id', paymentId)
    return { error: insErr.message }
  }

  revalidatePath('/dashboard/subscriptions')
  revalidatePath('/dashboard/daily')
  return {}
}

/**
 * Sets one student's mark for one session, with the same session-count rules
 * as the Daily page (present/absent use a session, make-up and holidays don't,
 * clearing a mark gives the session back).
 */
export async function setAttendanceMark(input: {
  studentId: string
  sessionId: string
  status: AttendanceStatus
}): Promise<{ error?: string; remaining?: number | null }> {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'edit'))) return { error: 'Not allowed' }
  const status = input.status ?? null
  if (status !== null && !['present', 'absent', 'make_up'].includes(status)) return { error: 'Invalid status' }

  const { data: session } = await supabase
    .from('sessions').select('id, date, class_id, status, class:classes(days_of_week)').eq('id', input.sessionId).single()
  if (!session) return { error: 'Session not found' }

  const { data: prevRows } = await supabase
    .from('attendance').select('id, status').eq('session_id', input.sessionId).eq('student_id', input.studentId).limit(1)
  const prev = prevRows?.[0] ?? null
  const prevStatus = (prev?.status ?? null) as AttendanceStatus
  if (prevStatus === status) return {}

  if (status === null) {
    if (prev) {
      const { error } = await supabase.from('attendance').delete().eq('id', prev.id)
      if (error) return { error: error.message }
    }
  } else if (prev) {
    const { error } = await supabase.from('attendance').update({ status }).eq('id', prev.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('attendance').insert({ session_id: input.sessionId, student_id: input.studentId, status })
    if (error) return { error: error.message }
  }

  // Keep the package's remaining sessions in sync
  const { data: subs } = await supabase
    .from('subscriptions').select('id, status, class_id, total_sessions, remaining_sessions, start_date')
    .eq('student_id', input.studentId).eq('status', 'active')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub: any = getActiveSubForClass(subs, session.class_id)
  let remaining: number | null = sub?.remaining_sessions ?? null

  if (sub) {
    const { data: hol } = await supabase
      .from('holidays').select('student_ids').lte('start_date', session.date).gte('end_date', session.date).limit(1).maybeSingle()
    const counts = sessionCountsForStudent({ holiday: hol, studentId: input.studentId, subStartDate: sub.start_date, sessionDate: session.date })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls: any = Array.isArray(session.class) ? session.class[0] : session.class
    const total = sub.total_sessions ?? 4
    const deduction = computeDeduction({
      status, prevStatus, remainingSessions: sub.remaining_sessions, totalSessions: total,
      sessionCounts: counts, classDays: cls?.days_of_week || [], sessionDate: session.date,
    })
    const refund = computeRefund({ status, prevStatus, remainingSessions: sub.remaining_sessions, totalSessions: total, sessionCounts: counts })

    let updates: Record<string, unknown> | null = null
    if (deduction.shouldDeduct) {
      updates = { remaining_sessions: deduction.newRemaining }
      if (deduction.nextCycleStart) updates.next_cycle_start = deduction.nextCycleStart
    } else if (refund.shouldRefund) {
      updates = { remaining_sessions: refund.newRemaining }
      if (sub.remaining_sessions === 0) updates.next_cycle_start = null
    }
    if (updates) {
      const { error } = await supabase.from('subscriptions').update(updates).eq('id', sub.id)
      if (error) return { error: error.message }
      remaining = updates.remaining_sessions as number
    }
  }

  // Session is "completed" as soon as any attendance is recorded (same as Daily)
  const { count } = await supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('session_id', input.sessionId)
  const nextStatus = (count ?? 0) > 0 ? 'completed' : 'scheduled'
  if (session.status !== nextStatus && (session.status === 'completed' || session.status === 'scheduled')) {
    await supabase.from('sessions').update({ status: nextStatus }).eq('id', input.sessionId)
  }

  revalidatePath('/dashboard/subscriptions')
  revalidatePath('/dashboard/daily')
  return { remaining }
}
