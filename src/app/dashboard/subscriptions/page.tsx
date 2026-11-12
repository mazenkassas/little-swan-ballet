import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveSubForClass } from '@/lib/subscriptionLogic'
import { cairoToday, checkSubscriptionsAccess } from './access'
import SubscriptionsBoard, { type SubRow } from './SubscriptionsBoard'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'view'))) redirect('/dashboard')

  const locale = await getLocale()
  const isRtl = locale === 'ar'
  const today = cairoToday()

  const [{ data: students }, { data: subs }] = await Promise.all([
    supabase
      .from('students')
      .select('id, name_ar, name_en, class_students(class:classes(id, name, is_active))')
      .eq('status', 'active')
      .order('name_ar'),
    supabase
      .from('subscriptions')
      .select('id, student_id, class_id, status, total_sessions, remaining_sessions, start_date, class:classes(id, name, is_active)')
      .eq('status', 'active'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const one = (x: any) => (Array.isArray(x) ? x[0] : x)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subsByStudent = new Map<string, any[]>()
  for (const s of subs || []) subsByStudent.set(s.student_id, [...(subsByStudent.get(s.student_id) || []), s])

  const rows: SubRow[] = []
  for (const st of students || []) {
    const mine = subsByStudent.get(st.id) || []
    const used = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classes = (st.class_students || []).map((cs: any) => one(cs.class)).filter((c: any) => c && c.is_active !== false)

    // One row per class the student is enrolled in
    for (const c of classes) {
      const sub = getActiveSubForClass(mine, c.id)
      if (sub) used.add(sub.id)
      rows.push(makeRow(st, c, sub, today))
    }
    // Active packages that don't match an enrolled class still need to be visible
    for (const sub of mine) {
      if (used.has(sub.id)) continue
      rows.push(makeRow(st, one(sub.class), sub, today))
    }
    if (!classes.length && !mine.length) rows.push(makeRow(st, null, null, today))
  }

  return <SubscriptionsBoard rows={rows} isRtl={isRtl} />
}

function makeRow(
  st: { id: string; name_ar: string; name_en: string | null },
  c: { id: string; name: string } | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sub: any,
  today: string,
): SubRow {
  let state: SubRow['state'] = 'none'
  if (sub) {
    if (sub.start_date > today) state = 'upcoming'
    else if (sub.remaining_sessions <= 0) state = 'due'
    else if (sub.remaining_sessions === 1) state = 'low'
    else state = 'ok'
  }
  return {
    key: `${st.id}:${c?.id ?? sub?.id ?? 'none'}`,
    studentId: st.id,
    nameAr: st.name_ar,
    nameEn: st.name_en,
    classId: c?.id ?? sub?.class_id ?? null,
    className: c?.name ?? null,
    remaining: sub?.remaining_sessions ?? null,
    total: sub?.total_sessions ?? null,
    startDate: sub?.start_date ?? null,
    state,
  }
}
