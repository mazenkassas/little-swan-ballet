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
}): boolean {
  const { holiday, studentId, subStartDate, sessionDate } = opts
  if (isStudentOnHoliday(holiday, studentId)) return false
  if (subStartDate && sessionDate < subStartDate)  return false
  return true
}
