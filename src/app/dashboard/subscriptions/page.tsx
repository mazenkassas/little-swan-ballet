import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNthClassDate } from '@/lib/subscriptionLogic'
import { cairoToday, checkSubscriptionsAccess } from './access'
import SubscriptionsBoard, { type SubRow } from './SubscriptionsBoard'

export const dynamic = 'force-dynamic'

type Cls = { id: string; name: string; is_active?: boolean | null; days_of_week?: string[] | null }

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'view'))) redirect('/dashboard')
  const canEdit = !!(await checkSubscriptionsAccess(supabase, 'edit'))

  const locale = await getLocale()
  const isRtl = locale === 'ar'
  const today = cairoToday()

  const [{ data: students }, { data: subs }] = await Promise.all([
    supabase
      .from('students')
      .select('id, name_ar, name_en, class_students(class:classes(id, name, is_active, days_of_week))')
      .eq('status', 'active')
      .order('name_ar'),
    supabase
      .from('subscriptions')
      .select('id, student_id, class_id, total_sessions, remaining_sessions, start_date, end_date, class:classes(id, name, is_active, days_of_week)')
      .eq('status', 'active'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const one = (x: any) => (Array.isArray(x) ? x[0] : x)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subsByStudent = new Map<string, any[]>()
  for (const s of subs || []) subsByStudent.set(s.student_id, [...(subsByStudent.get(s.student_id) || []), s])

  const rows: SubRow[] = []
  for (const st of students || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups: Cls[] = (st.class_students || []).map((cs: any) => one(cs.class)).filter((c: Cls | null) => c && c.is_active !== false)
    const packages = subsByStudent.get(st.id) || []

    if (packages.length) {
      // One row per package — like the Students page, a student with a package never shows "No package"
      for (const sub of packages) {
        const c: Cls | null = one(sub.class) ?? null
        const otherGroups = groups.filter(g => g.id !== sub.class_id).map(g => g.name)
        rows.push(makeRow(st, c, sub, otherGroups, today))
      }
    } else if (groups.length) {
      for (const g of groups) rows.push(makeRow(st, g, null, [], today))
    } else {
      rows.push(makeRow(st, null, null, [], today))
    }
  }

  return <SubscriptionsBoard rows={rows} isRtl={isRtl} canEdit={canEdit} />
}

function makeRow(
  st: { id: string; name_ar: string; name_en: string | null },
  c: Cls | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sub: any,
  otherGroups: string[],
  today: string,
): SubRow {
  let state: SubRow['state'] = 'none'
  if (sub) {
    if (sub.start_date > today) state = 'upcoming'
    else if (sub.remaining_sessions <= 0 || (sub.end_date && sub.end_date < today)) state = 'due'
    else if (sub.remaining_sessions === 1) state = 'low'
    else state = 'ok'
  }
  return {
    key: `${st.id}:${sub?.id ?? c?.id ?? 'none'}`,
    studentId: st.id,
    nameAr: st.name_ar,
    nameEn: st.name_en,
    subscriptionId: sub?.id ?? null,
    classId: c?.id ?? sub?.class_id ?? null,
    className: c?.name ?? null,
    otherGroups,
    remaining: sub?.remaining_sessions ?? null,
    total: sub?.total_sessions ?? null,
    startDate: sub?.start_date ?? null,
    endDate: sub?.end_date ?? null,
    expectedEnd: sub ? (sub.end_date ?? getNthClassDate(c?.days_of_week || [], sub.start_date, sub.total_sessions)) : null,
    state,
  }
}
