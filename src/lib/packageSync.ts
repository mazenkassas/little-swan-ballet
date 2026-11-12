// Server-side: works out every active package from the calendar (see computePackageSchedule)
// and, when automatic counting is on, writes the numbers back so every page agrees.
import {
  computePackageSchedule, isStudentOnHoliday,
  type AttendanceStatus, type PackageSchedule,
} from '@/lib/subscriptionLogic'

type Db = { from: (table: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export const AUTO_COUNT_KEY = 'auto_session_count'
const SYNCED_KEY = 'packages_synced_on'

export type ComputedPackage = {
  id: string
  studentId: string
  classId: string | null
  start: string
  end: string | null
  stored: { total: number; remaining: number; nextCycleStart: string | null }
  schedule: PackageSchedule
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

/** Today's date in Cairo as 'YYYY-MM-DD'. */
export function cairoDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

type MarkRow = { student_id: string; status: string; session: unknown }

/** Attendance marks for these students on or after `from`, paged past the 1000-row API limit. */
async function fetchAllMarks(db: Db, studentIds: string[], from: string): Promise<MarkRow[]> {
  const out: MarkRow[] = []
  const PAGE = 1000
  for (let i = 0; i < studentIds.length; i += 150) {
    const chunk = studentIds.slice(i, i + 150)
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await db.from('attendance')
        .select('student_id, status, session:sessions!session_id!inner(date, class_id)')
        .in('student_id', chunk)
        .gte('session.date', from)
        .order('id')
        .range(offset, offset + PAGE - 1)
      if (error) throw new Error(error.message)
      out.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }
  }
  return out
}

export async function isAutoCountOn(db: Db): Promise<boolean> {
  const { data } = await db.from('system_settings').select('value').eq('key', AUTO_COUNT_KEY).maybeSingle()
  return data?.value === 'on'
}

/**
 * Calculates active packages from the calendar.
 * `subIds` limits it to some packages; otherwise every active package.
 */
export async function computePackages(db: Db, opts: { subIds?: string[]; today?: string } = {}): Promise<ComputedPackage[]> {
  const today = opts.today ?? cairoDate()
  let q = db.from('subscriptions')
    .select('id, student_id, class_id, start_date, end_date, total_sessions, remaining_sessions, next_cycle_start, plan:subscription_plans(sessions_count), class:classes(days_of_week)')
    .eq('status', 'active')
  if (opts.subIds) q = q.in('id', opts.subIds)
  const { data: subs } = await q
  if (!subs?.length) return []

  const studentIds = [...new Set<string>(subs.map((s: { student_id: string }) => s.student_id))]
  const minStart = subs.reduce((m: string, s: { start_date: string }) => (s.start_date < m ? s.start_date : m), today)

  const [{ data: holidays }, marks] = await Promise.all([
    db.from('holidays').select('start_date, end_date, student_ids').gte('end_date', minStart),
    fetchAllMarks(db, studentIds, minStart),
  ])

  // student|class|date → mark
  const markMap = new Map<string, AttendanceStatus>()
  for (const m of marks ?? []) {
    const s = one(m.session as { date: string; class_id: string } | null)
    if (s) markMap.set(`${m.student_id}|${s.class_id}|${s.date}`, m.status as AttendanceStatus)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return subs.map((sub: any) => {
    const plan = one(sub.plan as { sessions_count: number | null } | null)
    const cls = one(sub.class as { days_of_week: string[] | null } | null)
    const size = plan?.sessions_count ?? sub.total_sessions ?? 4
    const schedule = computePackageSchedule({
      classDays: cls?.days_of_week ?? [],
      start: sub.start_date,
      end: sub.end_date,
      size,
      today,
      isHoliday: d => (holidays ?? []).some((h: { start_date: string; end_date: string; student_ids: string[] | null }) =>
        h.start_date <= d && h.end_date >= d && isStudentOnHoliday(h, sub.student_id)),
      markOn: d => markMap.get(`${sub.student_id}|${sub.class_id}|${d}`) ?? null,
    })
    return {
      id: sub.id,
      studentId: sub.student_id,
      classId: sub.class_id,
      start: sub.start_date,
      end: sub.end_date,
      stored: { total: sub.total_sessions, remaining: sub.remaining_sessions, nextCycleStart: sub.next_cycle_start },
      schedule,
    }
  })
}

/** The values a package should store, given its schedule. */
export function packageColumns(p: ComputedPackage) {
  const s = p.schedule
  return {
    total_sessions: s.total,
    remaining_sessions: s.remaining,
    next_cycle_start: s.remaining === 0 ? s.nextStart : null,
  }
}

export function packageChanged(p: ComputedPackage): boolean {
  if (!p.schedule.ok) return false
  const c = packageColumns(p)
  return c.total_sessions !== p.stored.total || c.remaining_sessions !== p.stored.remaining
    || (c.next_cycle_start ?? null) !== (p.stored.nextCycleStart ?? null)
}

/** Writes calculated numbers for the given packages (only those that changed). */
export async function applyPackages(db: Db, packages: ComputedPackage[]): Promise<number> {
  const changed = packages.filter(packageChanged)
  await Promise.all(changed.map(p => db.from('subscriptions').update(packageColumns(p)).eq('id', p.id)))
  return changed.length
}

/** Recalculate and save some packages (or all) — used after any change to marks, dates or packages. */
export async function syncPackages(db: Db, subIds?: string[]): Promise<ComputedPackage[]> {
  const packages = await computePackages(db, { subIds })
  await applyPackages(db, packages)
  return packages
}

/**
 * Once per Cairo day, when automatic counting is on, recalculates every package so that
 * classes which passed overnight are counted even if nobody marked them.
 */
export async function dailyPackageSync(db: Db): Promise<void> {
  const today = cairoDate()
  const { data } = await db.from('system_settings').select('key, value').in('key', [AUTO_COUNT_KEY, SYNCED_KEY])
  const map: Record<string, string> = {}
  ;(data ?? []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value })
  if (map[AUTO_COUNT_KEY] !== 'on' || map[SYNCED_KEY] === today) return
  await syncPackages(db)
  await db.from('system_settings').upsert({ key: SYNCED_KEY, value: today, updated_at: new Date().toISOString() })
}
