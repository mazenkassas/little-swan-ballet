/**
 * Pure subscription business logic — no Supabase or React dependencies.
 * All rules live here so they can be unit-tested in isolation.
 */

export const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

/** Format a Date as 'YYYY-MM-DD' using local calendar (timezone-safe). */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Rule 1 (cycle-renewal side): Returns the next class date STRICTLY after
 * fromDate. Used when storing next_cycle_start after the 4th session fires —
 * we always want the following week's occurrence, never today.
 */
export function getNextClassDate(classDays: string[], fromDate: Date): string {
  const fromDow = fromDate.getDay()
  let minAhead = 8
  for (const day of classDays) {
    const targetDow = DAY_MAP[day]
    if (targetDow === undefined) continue
    let ahead = targetDow - fromDow
    if (ahead <= 0) ahead += 7          // 0 → next week, not today
    minAhead = Math.min(minAhead, ahead)
  }
  const next = new Date(fromDate)
  next.setDate(next.getDate() + (minAhead === 8 ? 1 : minAhead))
  return formatDate(next)
}

/**
 * Rule 1 (payment side): Returns the next class date ON OR AFTER fromDate.
 * Used when a student pays for a new subscription — if today is the class day,
 * the subscription starts today, not a week later.
 */
export function getNextOrCurrentClassDate(classDays: string[], fromDate: Date): string {
  const fromDow = fromDate.getDay()
  let minAhead = 8
  for (const day of classDays) {
    const targetDow = DAY_MAP[day]
    if (targetDow === undefined) continue
    let ahead = targetDow - fromDow
    if (ahead < 0) ahead += 7           // negative only — 0 keeps today
    minAhead = Math.min(minAhead, ahead)
  }
  const next = new Date(fromDate)
  next.setDate(next.getDate() + (minAhead === 8 ? 0 : minAhead))
  return formatDate(next)
}

/**
 * Finds the active subscription for a specific class.
 *
 * Priority:
 *   1. Active subscription whose class_id matches the current session's class.
 *   2. Active subscription with no class_id (legacy records created before the
 *      class_id column existed) — treated as belonging to any class.
 *
 * Returns undefined if the student has no active subscription for this class.
 */
export function getActiveSubForClass(
  subscriptions: Array<{ status: string; class_id?: string | null }> | null | undefined,
  classId: string | null | undefined,
): any | undefined {
  if (!subscriptions?.length) return undefined
  if (classId) {
    const exact = subscriptions.find(s => s.status === 'active' && s.class_id === classId)
    if (exact) return exact
  }
  // Legacy fallback: active sub with no class association
  return subscriptions.find(s => s.status === 'active' && !s.class_id)
}

/**
 * Rule 3: Determines the start date for a new subscription at payment time.
 *  - If next_cycle_start is stored on the expiring subscription → backdate to it
 *    (covers the "paid on session 6 but cycle started on session 5" case).
 *  - Otherwise fall back to the next-or-current class date from today.
 */
export function computeSubscriptionStartDate(
  activeSub: { next_cycle_start?: string | null } | null | undefined,
  classDays: string[],
  today: Date,
): string {
  if (activeSub?.next_cycle_start) return activeSub.next_cycle_start
  return getNextOrCurrentClassDate(classDays, today)
}

export type AttendanceStatus = 'present' | 'absent' | 'make_up' | null | undefined

export interface DeductionResult {
  shouldDeduct: boolean
  /** New remaining value after deduction (only meaningful when shouldDeduct=true) */
  newRemaining: number
  /** Set on the subscription when remaining hits 0 */
  nextCycleStart: string | null
}

/**
 * Rule 2 + Rule 3: Decides whether a session counts against the subscription.
 *
 * Both `present` and `absent` consume a session.
 * `make_up` never consumes a session.
 * A session is only consumed once — if prevStatus was already present/absent,
 * we don't deduct again (idempotent re-save).
 * Holidays and pre-start sessions never count.
 */
export function computeDeduction(opts: {
  status: AttendanceStatus
  prevStatus: AttendanceStatus
  remainingSessions: number
  totalSessions: number
  sessionCounts: boolean          // false when holiday or sub not yet started
  classDays: string[]
  sessionDate: string             // 'YYYY-MM-DD'
}): DeductionResult {
  const { status, prevStatus, remainingSessions, totalSessions, sessionCounts, classDays, sessionDate } = opts

  const statusCounts   = status     === 'present' || status     === 'absent'
  const alreadyCounted = prevStatus === 'present' || prevStatus === 'absent'

  if (!statusCounts || alreadyCounted || !sessionCounts || remainingSessions <= 0) {
    return { shouldDeduct: false, newRemaining: remainingSessions, nextCycleStart: null }
  }

  const newRemaining = Math.max(0, remainingSessions - 1)
  const nextCycleStart = newRemaining === 0
    ? getNextClassDate(classDays, new Date(sessionDate + 'T00:00:00'))
    : null

  return { shouldDeduct: true, newRemaining, nextCycleStart }
}

/**
 * Reverse of computeDeduction: when a present/absent mark is cleared, the
 * session it consumed is given back (never above the subscription total).
 */
export function computeRefund(opts: {
  status: AttendanceStatus
  prevStatus: AttendanceStatus
  remainingSessions: number
  totalSessions: number
  sessionCounts: boolean
}): { shouldRefund: boolean; newRemaining: number } {
  const { status, prevStatus, remainingSessions, totalSessions, sessionCounts } = opts

  const statusCounts = status     === 'present' || status     === 'absent'
  const wasCounted   = prevStatus === 'present' || prevStatus === 'absent'

  if (statusCounts || !wasCounted || !sessionCounts || remainingSessions >= totalSessions) {
    return { shouldRefund: false, newRemaining: remainingSessions }
  }
  return { shouldRefund: true, newRemaining: remainingSessions + 1 }
}

/**
 * Rule 4: Is a student on holiday for a given session date?
 * Academy-wide if student_ids is null/empty; student-specific otherwise.
 */
export function isStudentOnHoliday(
  holiday: { student_ids: string[] | null } | null | undefined,
  studentId: string,
): boolean {
  if (!holiday) return false
  if (!holiday.student_ids?.length) return true  // academy-wide
  return holiday.student_ids.includes(studentId)
}

/**
 * Combines holiday check + subscription start check into the single
 * `sessionCounts` boolean used throughout.
 */
export function sessionCountsForStudent(opts: {
  holiday: { student_ids: string[] | null } | null | undefined
  studentId: string
  subStartDate: string | null | undefined
  sessionDate: string
  /** Optional last day of the package; classes after it never use a session. */
  subEndDate?: string | null
}): boolean {
  const { holiday, studentId, subStartDate, sessionDate, subEndDate } = opts
  if (isStudentOnHoliday(holiday, studentId)) return false
  if (subStartDate && sessionDate < subStartDate)  return false
  if (subEndDate && sessionDate > subEndDate)      return false
  return true
}

/* ─── Package dates (start / end) ───────────────────────────────── */

/** Add days to a 'YYYY-MM-DD' date (UTC-safe, no time-zone drift). */
function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function weekday(date: string): number {
  return new Date(date + 'T00:00:00Z').getUTCDay()
}

/**
 * Every class date between start and end (inclusive) for the given class days.
 * `isHoliday(date)` removes holiday dates. Capped at 2 years to stay safe.
 */
export function listClassDates(
  classDays: string[],
  start: string,
  end: string,
  isHoliday: (date: string) => boolean = () => false,
): string[] {
  const days = new Set(classDays.map(d => DAY_MAP[d]).filter(d => d !== undefined))
  const out: string[] = []
  if (!days.size || end < start) return out
  for (let d = start, i = 0; d <= end && i < 731; d = addDays(d, 1), i++) {
    if (days.has(weekday(d)) && !isHoliday(d)) out.push(d)
  }
  return out
}

/**
 * The date of the Nth class on or after start (n = package size).
 * Used to show the expected end date of a package that has no end date set.
 */
export function getNthClassDate(classDays: string[], start: string, n: number): string | null {
  const days = new Set(classDays.map(d => DAY_MAP[d]).filter(d => d !== undefined))
  if (!days.size || n <= 0) return null
  let count = 0
  for (let d = start, i = 0; i < 731; d = addDays(d, 1), i++) {
    if (days.has(weekday(d)) && ++count === n) return d
  }
  return null
}

/** First class date strictly after `date`, or null if the group has no class days. */
export function nextClassDateAfter(classDays: string[], date: string): string | null {
  const days = new Set(classDays.map(d => DAY_MAP[d]).filter(d => d !== undefined))
  if (!days.size) return null
  for (let d = addDays(date, 1), i = 0; i < 8; d = addDays(d, 1), i++) {
    if (days.has(weekday(d))) return d
  }
  return null
}

/* ─── Automatic package schedule (calendar based) ───────────────── */

export type PackageClassState =
  | 'used'      // class has happened (or is marked today) — uses a session
  | 'today'     // today's class, not marked yet — not used yet
  | 'upcoming'  // future class of this package
  | 'skipped'   // holiday or make-up — does not use a session; package extends

export type PackageClass = {
  date: string
  state: PackageClassState
  reason: 'holiday' | 'make_up' | null
  mark: AttendanceStatus
}

export type PackageSchedule = {
  /** false when the group has no class days, so nothing can be calculated */
  ok: boolean
  classes: PackageClass[]
  total: number
  used: number
  remaining: number
  /** last class of the package (the manual end date if one is set) */
  endDate: string | null
  /** first class after the package — where the next package starts */
  nextStart: string | null
}

/**
 * The core package rule. A package runs over the group's class days from `start`:
 *  - with a manual `end`, it covers every class from start to end;
 *  - otherwise it covers the next `size` classes (e.g. 4).
 * A class the student is on holiday for, or that is marked Make-up, does not use a
 * session — it is skipped and (without a manual end) the package extends by one class.
 * Every other class uses a session automatically once its day has passed, whether or
 * not attendance was marked; today's class uses one as soon as it is marked
 * Present or Absent.
 */
export function computePackageSchedule(opts: {
  classDays: string[]
  start: string
  end?: string | null
  size: number
  today: string
  isHoliday?: (date: string) => boolean
  markOn?: (date: string) => AttendanceStatus
}): PackageSchedule {
  const { classDays, start, end, today } = opts
  const size = Math.max(0, Math.floor(opts.size || 0))
  const days = new Set(classDays.map(d => DAY_MAP[d]).filter(d => d !== undefined))
  const empty: PackageSchedule = {
    ok: false, classes: [], total: size, used: 0, remaining: size, endDate: end ?? null, nextStart: null,
  }
  if (!days.size || (!end && size === 0) || (end && end < start)) return empty

  const classes: PackageClass[] = []
  let counted = 0
  let used = 0
  let lastCounted: string | null = null
  for (let d = start, i = 0; i < 731; d = addDays(d, 1), i++) {
    if (end ? d > end : counted >= size) break
    if (!days.has(weekday(d))) continue
    const mark = opts.markOn?.(d) ?? null
    if (opts.isHoliday?.(d)) { classes.push({ date: d, state: 'skipped', reason: 'holiday', mark }); continue }
    if (mark === 'make_up') { classes.push({ date: d, state: 'skipped', reason: 'make_up', mark }); continue }
    counted++
    lastCounted = d
    const marked = mark === 'present' || mark === 'absent'
    const state: PackageClassState = d < today || (d === today && marked) ? 'used' : d === today ? 'today' : 'upcoming'
    if (state === 'used') used++
    classes.push({ date: d, state, reason: null, mark })
  }

  const endDate = end ?? lastCounted
  return {
    ok: true,
    classes,
    total: counted,
    used,
    remaining: Math.max(0, counted - used),
    endDate,
    nextStart: endDate ? nextClassDateAfter(classDays, endDate) : null,
  }
}

/**
 * Recalculates a package from its start and end dates:
 * total = class dates in range (holidays excluded),
 * remaining = total − sessions already used (present/absent marks in range).
 * When nothing remains, the next cycle starts at the first class after the end date.
 */
export function computePackageFromDates(opts: {
  classDays: string[]
  start: string
  end: string
  usedSessions: number
  isHoliday?: (date: string) => boolean
}): { total: number; remaining: number; nextCycleStart: string | null } {
  const total = listClassDates(opts.classDays, opts.start, opts.end, opts.isHoliday).length
  const remaining = Math.max(0, total - opts.usedSessions)
  const nextCycleStart = total > 0 && remaining === 0
    ? getNextClassDate(opts.classDays, new Date(opts.end + 'T00:00:00'))
    : null
  return { total, remaining, nextCycleStart }
}
