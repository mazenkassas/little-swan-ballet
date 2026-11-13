'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  computeDeduction,
  computeRefund,
  computeSubscriptionStartDate,
  getActiveSubForClass,
  getNthClassDate,
  isStudentOnHoliday,
  sessionCountsForStudent,
  type AttendanceStatus,
  type PackageClassState,
} from '@/lib/subscriptionLogic'
import { AUTO_COUNT_KEY, applyPackages, computePackages, isAutoCountOn, syncPackages } from '@/lib/packageSync'
import { cairoToday, checkSubscriptionsAccess } from './access'

const SUB_FIELDS = 'id, class_id, plan_id, total_sessions, remaining_sessions, start_date, end_date, status, next_cycle_start, created_at, plan:subscription_plans(id, name, sessions_count, price)'

type Holiday = { start_date: string; end_date: string; student_ids: string[] | null; name: string }

export type DetailSession = {
  date: string
  status: AttendanceStatus
  holiday: string | null      // holiday name if the student is on holiday that day
  /** used / today / upcoming / skipped (holiday or make-up) — see computePackageSchedule */
  state: PackageClassState
}

export type StudentDetail = {
  student: { id: string; name_ar: string; name_en: string | null; fee: number | null }
  klass: { id: string; name: string; days_of_week: string[] } | null
  sub: {
    id: string; total_sessions: number; remaining_sessions: number; start_date: string
    end_date: string | null; expected_end: string | null
    next_cycle_start: string | null; plan_id: string | null; planName: string | null
    /** what the automatic (calendar) count gives — equals the stored numbers once it is switched on */
    auto: { total: number; remaining: number } | null
  } | null
  /** every class of the current package, in date order */
  sessions: DetailSession[]
  autoCount: boolean
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
  const autoCount = await isAutoCountOn(supabase)

  // The package's classes come from the calendar, not from session rows
  const [computed] = sub ? await computePackages(supabase, { subIds: [sub.id], today }) : []
  const schedule = computed?.schedule ?? null
  const fromStr = sub?.start_date ?? today

  const [{ data: holidays }, { data: myAttendance }] = await Promise.all([
    supabase.from('holidays').select('name, start_date, end_date, student_ids').gte('end_date', fromStr),
    supabase.from('attendance').select('id, status, session:sessions!session_id(date, class_id, class:classes(name))').eq('student_id', studentId).eq('status', 'make_up'),
  ])

  const makeups: StudentDetail['makeups'] = []
  for (const a of myAttendance || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = Array.isArray(a.session) ? a.session[0] : a.session
    if (s && s.class_id !== classId && s.date >= fromStr) {
      const c = Array.isArray(s.class) ? s.class[0] : s.class
      makeups.push({ date: s.date, className: c?.name ?? '' })
    }
  }
  makeups.sort((a, b) => b.date.localeCompare(a.date))

  const detailSessions: DetailSession[] = (schedule?.classes ?? []).map(c => ({
    date: c.date,
    status: c.mark ?? null,
    holiday: c.reason === 'holiday' ? holidayFor((holidays || []) as Holiday[], c.date, studentId)?.name ?? '' : null,
    state: c.state,
  }))

  const classDays: string[] = klass?.days_of_week || []
  // Next package starts at the first class after this one ends (e.g. 19 Nov → 26 Nov)
  const suggestedStart = schedule?.nextStart && (!sub || sub.start_date <= today)
    ? schedule.nextStart
    : computeSubscriptionStartDate(sub, classDays, new Date(today + 'T00:00:00'))

  return {
    data: {
      student: { id: student.id, name_ar: student.name_ar, name_en: student.name_en, fee: studentFee(student, today) },
      klass: klass ? { id: klass.id, name: klass.name, days_of_week: classDays } : null,
      sub: sub ? {
        id: sub.id, total_sessions: sub.total_sessions, remaining_sessions: sub.remaining_sessions,
        start_date: sub.start_date, next_cycle_start: sub.next_cycle_start ?? null,
        end_date: sub.end_date ?? null,
        expected_end: sub.end_date ?? schedule?.endDate ?? getNthClassDate(classDays, sub.start_date, sub.total_sessions),
        plan_id: sub.plan_id ?? null, planName: plan?.name ?? null,
        auto: schedule?.ok ? { total: schedule.total, remaining: schedule.remaining } : null,
      } : null,
      sessions: detailSessions,
      autoCount,
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

  const { data: created, error: insErr } = await supabase.from('subscriptions').insert({
    student_id: input.studentId,
    class_id: input.classId,
    plan_id: plan.id,
    total_sessions: plan.sessions_count,
    remaining_sessions: plan.sessions_count,
    start_date: input.startDate,
    status: 'active',
    payment_id: paymentId,
  }).select('id').single()
  if (insErr) {
    // put things back so the student is never left without a package
    if (current) await supabase.from('subscriptions').update({ status: 'active' }).eq('id', current.id)
    if (paymentId) await supabase.from('payments').delete().eq('id', paymentId)
    return { error: insErr.message }
  }
  // A package that starts in the past has already used the classes since then
  if (created && await isAutoCountOn(supabase)) await syncPackages(supabase, [created.id])

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
  classId: string
  date: string
  status: AttendanceStatus
}): Promise<{ error?: string; remaining?: number | null }> {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'edit'))) return { error: 'Not allowed' }
  const status = input.status ?? null
  if (status !== null && !['present', 'absent', 'make_up'].includes(status)) return { error: 'Invalid status' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: 'Invalid date' }
  if (input.date > cairoToday()) return { error: 'This class has not happened yet' }

  // The class row may not exist yet (rows are only created when the Daily page opens that day)
  const { data: existing } = await supabase
    .from('sessions').select('id').eq('class_id', input.classId).eq('date', input.date).order('created_at').limit(1)
  let sessionId: string | undefined = existing?.[0]?.id
  if (!sessionId) {
    if (status === null) return {}
    const { data: cls } = await supabase.from('classes').select('hall_id, default_coach_id').eq('id', input.classId).single()
    if (!cls) return { error: 'Group not found' }
    const { data: made, error } = await supabase.from('sessions').insert({
      class_id: input.classId, date: input.date, hall_id: cls.hall_id,
      coach_id: cls.default_coach_id ?? null, status: 'scheduled',
    }).select('id').single()
    if (error || !made) return { error: error?.message ?? 'Could not create the class' }
    sessionId = made.id
  }

  const { data: session } = await supabase
    .from('sessions').select('id, date, class_id, status, class:classes(days_of_week)').eq('id', sessionId).single()
  if (!session) return { error: 'Session not found' }

  const { data: prevRows } = await supabase
    .from('attendance').select('id, status').eq('session_id', session.id).eq('student_id', input.studentId).limit(1)
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
    const { error } = await supabase.from('attendance').insert({ session_id: session.id, student_id: input.studentId, status })
    if (error) return { error: error.message }
  }

  // Keep the package's remaining sessions in sync
  const { data: subs } = await supabase
    .from('subscriptions').select('id, status, class_id, total_sessions, remaining_sessions, start_date, end_date')
    .eq('student_id', input.studentId).eq('status', 'active')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub: any = getActiveSubForClass(subs, session.class_id)
  let remaining: number | null = sub?.remaining_sessions ?? null

  if (sub && await isAutoCountOn(supabase)) {
    // Automatic counting: recalculate the whole package from the calendar
    const [p] = await syncPackages(supabase, [sub.id])
    if (p?.schedule.ok) remaining = p.schedule.remaining
  } else if (sub) {
    const { data: hol } = await supabase
      .from('holidays').select('student_ids').lte('start_date', session.date).gte('end_date', session.date).limit(1).maybeSingle()
    const counts = sessionCountsForStudent({ holiday: hol, studentId: input.studentId, subStartDate: sub.start_date, subEndDate: sub.end_date, sessionDate: session.date })
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
  const { count } = await supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('session_id', session.id)
  const nextStatus = (count ?? 0) > 0 ? 'completed' : 'scheduled'
  if (session.status !== nextStatus && (session.status === 'completed' || session.status === 'scheduled')) {
    await supabase.from('sessions').update({ status: nextStatus }).eq('id', session.id)
  }

  revalidatePath('/dashboard/subscriptions')
  revalidatePath('/dashboard/daily')
  return { remaining }
}

/**
 * Sets a package's start and end date. Every class of the group in that range
 * (holidays and make-ups excluded) is a package class; classes whose day has
 * passed are used automatically. Saved on the package, so the Daily, Students
 * and Attendance pages all show the new numbers.
 */
export async function updatePackageDates(input: {
  subscriptionId: string
  startDate: string
  endDate: string
}): Promise<{ error?: string; total?: number; remaining?: number }> {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'edit'))) return { error: 'Not allowed' }
  const iso = /^\d{4}-\d{2}-\d{2}$/
  if (!iso.test(input.startDate) || !iso.test(input.endDate)) return { error: 'Invalid date' }
  if (input.endDate < input.startDate) return { error: 'End date must be on or after the start date' }

  const { data: sub } = await supabase
    .from('subscriptions').select('id, class_id, start_date, end_date').eq('id', input.subscriptionId).single()
  if (!sub) return { error: 'Package not found' }
  if (!sub.class_id) return { error: 'This package is not linked to a group' }

  const { error } = await supabase.from('subscriptions')
    .update({ start_date: input.startDate, end_date: input.endDate }).eq('id', sub.id)
  if (error) return { error: error.message }

  const [p] = await computePackages(supabase, { subIds: [sub.id] })
  if (!p?.schedule.ok || p.schedule.total === 0) {
    await supabase.from('subscriptions').update({ start_date: sub.start_date, end_date: sub.end_date }).eq('id', sub.id)
    return { error: 'There are no classes for this group between these dates' }
  }
  await applyPackages(supabase, [p])

  for (const path of ['/dashboard/subscriptions', '/dashboard/daily', '/dashboard/students', '/dashboard']) revalidatePath(path)
  return { total: p.schedule.total, remaining: p.schedule.remaining }
}

/* ─── Automatic counting: review + switch on ───────────────────────── */

export type ReviewRow = {
  id: string
  name: string
  group: string
  start: string
  end: string | null
  current: { remaining: number; total: number }
  next: { remaining: number; total: number } | null
  changed: boolean
}

/** Every active package with its current numbers next to the automatic ones. */
export async function getPackageReview(): Promise<{ error?: string; rows?: ReviewRow[]; autoCount?: boolean }> {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'view'))) return { error: 'Not allowed' }
  const [packages, autoCount] = await Promise.all([computePackages(supabase), isAutoCountOn(supabase)])
  if (!packages.length) return { rows: [], autoCount }

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase.from('students').select('id, name_ar, name_en').in('id', [...new Set(packages.map(p => p.studentId))]),
    supabase.from('classes').select('id, name').in('id', [...new Set(packages.map(p => p.classId).filter(Boolean) as string[])]),
  ])
  const sName = new Map((students ?? []).map(s => [s.id, s.name_en || s.name_ar]))
  const cName = new Map((classes ?? []).map(c => [c.id, c.name]))

  const rows: ReviewRow[] = packages.map(p => ({
    id: p.id,
    name: sName.get(p.studentId) ?? '—',
    group: (p.classId && cName.get(p.classId)) || '—',
    start: p.start,
    end: p.schedule.endDate,
    current: { remaining: p.stored.remaining, total: p.stored.total },
    next: p.schedule.ok ? { remaining: p.schedule.remaining, total: p.schedule.total } : null,
    changed: !!p.schedule.ok && (p.schedule.remaining !== p.stored.remaining || p.schedule.total !== p.stored.total),
  }))
  rows.sort((a, b) => Number(b.changed) - Number(a.changed) || a.name.localeCompare(b.name))
  return { rows, autoCount }
}

/** Switches automatic counting on and recalculates every package now. */
export async function enableAutoCount(): Promise<{ error?: string; updated?: number }> {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'edit'))) return { error: 'Not allowed' }
  const packages = await computePackages(supabase)
  const updated = await applyPackages(supabase, packages)
  const now = new Date().toISOString()
  const { error } = await supabase.from('system_settings').upsert([
    { key: AUTO_COUNT_KEY, value: 'on', updated_at: now },
    { key: 'packages_synced_on', value: cairoToday(), updated_at: now },
  ])
  if (error) return { error: error.message }
  for (const path of ['/dashboard/subscriptions', '/dashboard/daily', '/dashboard/students', '/dashboard']) revalidatePath(path)
  return { updated }
}

/** For the Daily page: recalculate one student's package for a group after a mark. */
export async function syncStudentPackage(studentId: string, classId: string): Promise<{ remaining?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAutoCountOn(supabase))) return {}
  const { data: subs } = await supabase
    .from('subscriptions').select('id, status, class_id').eq('student_id', studentId).eq('status', 'active')
  const sub = getActiveSubForClass(subs, classId)
  if (!sub) return {}
  const [p] = await syncPackages(supabase, [sub.id])
  return p?.schedule.ok ? { remaining: p.schedule.remaining } : {}
}
