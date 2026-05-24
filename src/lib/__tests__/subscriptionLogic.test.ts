import { describe, it, expect } from 'vitest'
import {
  getNextClassDate,
  getNextOrCurrentClassDate,
  computeSubscriptionStartDate,
  computeDeduction,
  isStudentOnHoliday,
  sessionCountsForStudent,
  getActiveSubForClass,
} from '../subscriptionLogic'

// ═════════════════════════════════════════════════════════════════
// getActiveSubForClass — subscription linked to a specific class
// ═════════════════════════════════════════════════════════════════

describe('getActiveSubForClass — class-linked subscription lookup', () => {
  const CLASS_A = 'class-sun-8pm'
  const CLASS_B = 'class-tue-6pm'

  const subA = { id: 'sub-a', status: 'active',  class_id: CLASS_A, remaining_sessions: 2 }
  const subB = { id: 'sub-b', status: 'active',  class_id: CLASS_B, remaining_sessions: 4 }
  const subExpired = { id: 'sub-old', status: 'expired', class_id: CLASS_A, remaining_sessions: 0 }
  const subLegacy  = { id: 'sub-leg', status: 'active',  class_id: null,    remaining_sessions: 3 }

  // ── Positive cases ──────────────────────────────────────────────
  describe('POSITIVE', () => {
    it('finds the subscription for the correct class', () => {
      const result = getActiveSubForClass([subA, subB], CLASS_A)
      expect(result?.id).toBe('sub-a')
    })

    it('finds a different class subscription when querying that class', () => {
      const result = getActiveSubForClass([subA, subB], CLASS_B)
      expect(result?.id).toBe('sub-b')
    })

    it('legacy subscription (no class_id) is returned as fallback when no exact match', () => {
      const result = getActiveSubForClass([subLegacy], CLASS_A)
      expect(result?.id).toBe('sub-leg')
    })

    it('exact match takes priority over legacy sub', () => {
      const result = getActiveSubForClass([subLegacy, subA], CLASS_A)
      expect(result?.id).toBe('sub-a')
    })
  })

  // ── Negative cases ──────────────────────────────────────────────
  describe('NEGATIVE', () => {
    it('no subscriptions → returns undefined', () => {
      expect(getActiveSubForClass([], CLASS_A)).toBeUndefined()
      expect(getActiveSubForClass(null, CLASS_A)).toBeUndefined()
      expect(getActiveSubForClass(undefined, CLASS_A)).toBeUndefined()
    })

    it('only expired subscription for that class → returns undefined (no legacy fallback)', () => {
      const result = getActiveSubForClass([subExpired], CLASS_A)
      expect(result).toBeUndefined()
    })

    it('active sub exists but for a DIFFERENT class → returns undefined (no cross-class bleed)', () => {
      const result = getActiveSubForClass([subB], CLASS_A)
      // subB is for CLASS_B; no legacy sub → nothing
      expect(result).toBeUndefined()
    })

    it('student in two active classes: querying wrong class returns undefined', () => {
      const CLASS_C = 'class-sat-10am'
      const result = getActiveSubForClass([subA, subB], CLASS_C)
      expect(result).toBeUndefined()
    })
  })

  // ── Edge cases ───────────────────────────────────────────────────
  describe('EDGE', () => {
    it('classId is null → legacy fallback used', () => {
      const result = getActiveSubForClass([subLegacy], null)
      expect(result?.id).toBe('sub-leg')
    })

    it('classId is undefined → legacy fallback used', () => {
      const result = getActiveSubForClass([subLegacy], undefined)
      expect(result?.id).toBe('sub-leg')
    })

    it('multiple legacy subs (no class_id) → returns first active one', () => {
      const leg1 = { id: 'leg-1', status: 'active',  class_id: null }
      const leg2 = { id: 'leg-2', status: 'expired', class_id: null }
      const result = getActiveSubForClass([leg2, leg1], CLASS_A)
      expect(result?.id).toBe('leg-1')
    })
  })
})

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function d(iso: string) {
  return new Date(iso + 'T00:00:00')
}

// ═════════════════════════════════════════════════════════════════
// RULE 1 — getNextOrCurrentClassDate  (subscription start for new payment)
// ═════════════════════════════════════════════════════════════════

describe('Rule 1 — getNextOrCurrentClassDate (payment start date)', () => {

  // ── Positive cases ──────────────────────────────────────────────
  describe('POSITIVE', () => {
    it('pays Wednesday May 7 → Sunday group → starts May 11', () => {
      // May 7 2025 is a Wednesday (dow=3)
      const result = getNextOrCurrentClassDate(['Sunday'], d('2025-05-07'))
      expect(result).toBe('2025-05-11')
    })

    it('pays Thursday → Monday group → starts next Monday', () => {
      // 2025-05-08 is Thursday (dow=4); next Monday = May 12
      const result = getNextOrCurrentClassDate(['Monday'], d('2025-05-08'))
      expect(result).toBe('2025-05-12')
    })

    it('pays Friday → Saturday+Tuesday group → picks Saturday (nearest)', () => {
      // 2025-05-09 Friday; Saturday = +1, Tuesday = +4 → Saturday wins
      const result = getNextOrCurrentClassDate(['Saturday', 'Tuesday'], d('2025-05-09'))
      expect(result).toBe('2025-05-10')
    })

    it('pays Sunday (class day) → subscription starts TODAY — not next Sunday', () => {
      // 2025-05-11 is a Sunday; class is Sunday → ahead=0 → today
      const result = getNextOrCurrentClassDate(['Sunday'], d('2025-05-11'))
      expect(result).toBe('2025-05-11')
    })

    it('pays on class day with multi-day group → picks today over a later day', () => {
      // Today is Tuesday; group is Mon+Tue → ahead(Mon)=-6→1, ahead(Tue)=0 → Tue wins (today)
      const result = getNextOrCurrentClassDate(['Monday', 'Tuesday'], d('2025-05-06'))
      expect(result).toBe('2025-05-06')
    })
  })

  // ── Negative cases ──────────────────────────────────────────────
  describe('NEGATIVE', () => {
    it('empty classDays → falls back to today (no infinite loop)', () => {
      const today = d('2025-05-07')
      const result = getNextOrCurrentClassDate([], today)
      // minAhead stays 8 → next.setDate + 0 = today
      expect(result).toBe('2025-05-07')
    })

    it('unknown day string is silently ignored, valid day still resolves', () => {
      const result = getNextOrCurrentClassDate(['Blursday', 'Friday'], d('2025-05-07'))
      // Blursday is undefined → ignored; next Friday from Wed May 7 = May 9
      expect(result).toBe('2025-05-09')
    })
  })

  // ── Edge cases ───────────────────────────────────────────────────
  describe('EDGE', () => {
    it('pays on Saturday → Sunday group → starts tomorrow (Sunday)', () => {
      // 2025-05-10 is Saturday; ahead(Sun)=1 → May 11
      const result = getNextOrCurrentClassDate(['Sunday'], d('2025-05-10'))
      expect(result).toBe('2025-05-11')
    })

    it('year boundary: pays Dec 31 → Wednesday group → crosses into Jan 1', () => {
      // Dec 31 2025 is a Wednesday; next Wednesday = Jan 7 2026; but today IS Wed so starts today
      const result = getNextOrCurrentClassDate(['Wednesday'], d('2025-12-31'))
      expect(result).toBe('2025-12-31')
    })

    it('pays on last day of month → result correctly rolls to next month', () => {
      // Jan 31 2025 is Friday; next Monday = Feb 3 2025
      const result = getNextOrCurrentClassDate(['Monday'], d('2025-01-31'))
      expect(result).toBe('2025-02-03')
    })
  })
})

// ═════════════════════════════════════════════════════════════════
// RULE 1 — getNextClassDate  (next_cycle_start — strictly next week)
// ═════════════════════════════════════════════════════════════════

describe('Rule 1 — getNextClassDate (next cycle start, strictly after today)', () => {

  describe('POSITIVE', () => {
    it('session falls on Sunday → next cycle starts the FOLLOWING Sunday', () => {
      // May 11 is Sunday; next Sunday = May 18
      const result = getNextClassDate(['Sunday'], d('2025-05-11'))
      expect(result).toBe('2025-05-18')
    })

    it('session falls on Tuesday → next cycle starts next Tuesday', () => {
      // May 13 is Tuesday → next Tuesday = May 20
      const result = getNextClassDate(['Tuesday'], d('2025-05-13'))
      expect(result).toBe('2025-05-20')
    })
  })

  describe('NEGATIVE', () => {
    it('empty classDays → adds 1 day as safe fallback', () => {
      const result = getNextClassDate([], d('2025-05-07'))
      expect(result).toBe('2025-05-08')
    })
  })

  describe('EDGE', () => {
    it('does NOT return today even when today is the class day', () => {
      // Strict "next" means Sunday → returns next Sunday, never today
      const sunday = d('2025-05-11')
      const result = getNextClassDate(['Sunday'], sunday)
      expect(result).not.toBe('2025-05-11')
      expect(result).toBe('2025-05-18')
    })

    it('multi-day group picks the closest upcoming day', () => {
      // Session is on Wednesday May 7; Mon=+5, Thu=+1 → Thu May 8
      const result = getNextClassDate(['Monday', 'Thursday'], d('2025-05-07'))
      expect(result).toBe('2025-05-08')
    })
  })
})

// ═════════════════════════════════════════════════════════════════
// RULE 3 — computeSubscriptionStartDate  (late-payment backdating)
// ═════════════════════════════════════════════════════════════════

describe('Rule 3 — computeSubscriptionStartDate', () => {

  describe('POSITIVE', () => {
    it('active sub has next_cycle_start → uses it (backdated)', () => {
      const sub = { next_cycle_start: '2025-06-01' }
      const result = computeSubscriptionStartDate(sub, ['Sunday'], d('2025-06-08'))
      expect(result).toBe('2025-06-01')
    })

    it('no next_cycle_start (fresh new student) → uses next-or-current class date', () => {
      const sub = { next_cycle_start: null }
      // Today is Wednesday May 7; Sunday group → starts May 11
      const result = computeSubscriptionStartDate(sub, ['Sunday'], d('2025-05-07'))
      expect(result).toBe('2025-05-11')
    })

    it('late payment scenario from requirements: pays on Jun 8, cycle started Jun 1', () => {
      // 4 Sundays: May 4,11,18,25 → 5th Sunday (cycle start) = Jun 1
      // Payment is on Jun 8 (6th Sunday) → start date must be Jun 1
      const sub = { next_cycle_start: '2025-06-01' }
      const result = computeSubscriptionStartDate(sub, ['Sunday'], d('2025-06-08'))
      expect(result).toBe('2025-06-01')
    })
  })

  describe('NEGATIVE', () => {
    it('null sub (no active subscription) → falls back to next class date from today', () => {
      const result = computeSubscriptionStartDate(null, ['Sunday'], d('2025-05-07'))
      expect(result).toBe('2025-05-11')
    })

    it('undefined sub → falls back gracefully', () => {
      const result = computeSubscriptionStartDate(undefined, ['Sunday'], d('2025-05-07'))
      expect(result).toBe('2025-05-11')
    })
  })

  describe('EDGE', () => {
    it('next_cycle_start is in the past → still uses it (intentional backdating)', () => {
      const sub = { next_cycle_start: '2025-04-01' }
      const result = computeSubscriptionStartDate(sub, ['Sunday'], d('2025-06-08'))
      expect(result).toBe('2025-04-01')
    })

    it('next_cycle_start is empty string (falsy) → falls back to next class date', () => {
      const sub = { next_cycle_start: '' }
      const result = computeSubscriptionStartDate(sub, ['Sunday'], d('2025-05-07'))
      expect(result).toBe('2025-05-11')
    })
  })
})

// ═════════════════════════════════════════════════════════════════
// RULE 2 — computeDeduction  (absent & present both count)
// ═════════════════════════════════════════════════════════════════

describe('Rule 2 — computeDeduction (both present & absent consume sessions)', () => {

  const base = {
    remainingSessions: 3,
    totalSessions: 4,
    sessionCounts: true,
    classDays: ['Sunday'],
    sessionDate: '2025-05-11',
  }

  // ── Positive cases ──────────────────────────────────────────────
  describe('POSITIVE', () => {
    it('first-time present mark → deducts 1', () => {
      const r = computeDeduction({ ...base, status: 'present', prevStatus: null })
      expect(r.shouldDeduct).toBe(true)
      expect(r.newRemaining).toBe(2)
    })

    it('first-time absent mark → ALSO deducts 1 (rule 2)', () => {
      const r = computeDeduction({ ...base, status: 'absent', prevStatus: null })
      expect(r.shouldDeduct).toBe(true)
      expect(r.newRemaining).toBe(2)
    })

    it('last session (remaining=1) marked absent → hits 0, nextCycleStart set', () => {
      const r = computeDeduction({
        ...base,
        remainingSessions: 1,
        status: 'absent',
        prevStatus: null,
      })
      expect(r.shouldDeduct).toBe(true)
      expect(r.newRemaining).toBe(0)
      expect(r.nextCycleStart).toBe('2025-05-18') // next Sunday after May 11
    })

    it('last session marked present → nextCycleStart computed correctly', () => {
      const r = computeDeduction({
        ...base,
        remainingSessions: 1,
        status: 'present',
        prevStatus: null,
      })
      expect(r.newRemaining).toBe(0)
      expect(r.nextCycleStart).toBe('2025-05-18')
    })

    it('changing present → absent → no extra deduction (already counted)', () => {
      const r = computeDeduction({ ...base, status: 'absent', prevStatus: 'present' })
      expect(r.shouldDeduct).toBe(false)
    })

    it('changing absent → present → no extra deduction (already counted)', () => {
      const r = computeDeduction({ ...base, status: 'present', prevStatus: 'absent' })
      expect(r.shouldDeduct).toBe(false)
    })
  })

  // ── Negative cases ──────────────────────────────────────────────
  describe('NEGATIVE', () => {
    it('make_up status → never deducts', () => {
      const r = computeDeduction({ ...base, status: 'make_up', prevStatus: null })
      expect(r.shouldDeduct).toBe(false)
    })

    it('null status → never deducts', () => {
      const r = computeDeduction({ ...base, status: null, prevStatus: null })
      expect(r.shouldDeduct).toBe(false)
    })

    it('sessionCounts=false (holiday day) → no deduction even for present', () => {
      const r = computeDeduction({ ...base, status: 'present', prevStatus: null, sessionCounts: false })
      expect(r.shouldDeduct).toBe(false)
    })

    it('sessionCounts=false (holiday day) → no deduction for absent either', () => {
      const r = computeDeduction({ ...base, status: 'absent', prevStatus: null, sessionCounts: false })
      expect(r.shouldDeduct).toBe(false)
    })

    it('remaining=0 already → no deduction (subscription already expired)', () => {
      const r = computeDeduction({ ...base, remainingSessions: 0, status: 'present', prevStatus: null })
      expect(r.shouldDeduct).toBe(false)
    })

    it('session before subscription start → sessionCounts=false → no deduction', () => {
      const counts = sessionCountsForStudent({
        holiday: null,
        studentId: 'x',
        subStartDate: '2025-05-18',   // sub starts May 18
        sessionDate: '2025-05-11',    // this session is May 11 — before start
      })
      expect(counts).toBe(false)
      const r = computeDeduction({ ...base, status: 'present', prevStatus: null, sessionCounts: counts })
      expect(r.shouldDeduct).toBe(false)
    })
  })

  // ── Edge cases ───────────────────────────────────────────────────
  describe('EDGE', () => {
    it('session on exact subscription start date → counts (>= not >)', () => {
      const counts = sessionCountsForStudent({
        holiday: null,
        studentId: 'x',
        subStartDate: '2025-05-11',
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(true)
    })

    it('nextCycleStart only set when newRemaining===0, not earlier', () => {
      const r2 = computeDeduction({ ...base, remainingSessions: 2, status: 'present', prevStatus: null })
      expect(r2.newRemaining).toBe(1)
      expect(r2.nextCycleStart).toBeNull()
    })

    it('nextCycleStart for Tuesday class after last session on May 13', () => {
      const r = computeDeduction({
        remainingSessions: 1,
        totalSessions: 4,
        sessionCounts: true,
        classDays: ['Tuesday'],
        sessionDate: '2025-05-13',  // Tuesday
        status: 'present',
        prevStatus: null,
      })
      expect(r.nextCycleStart).toBe('2025-05-20') // next Tuesday
    })

    it('multi-day group (Mon+Thu): last session on Monday → nextCycleStart is Thursday', () => {
      const r = computeDeduction({
        remainingSessions: 1,
        totalSessions: 4,
        sessionCounts: true,
        classDays: ['Monday', 'Thursday'],
        sessionDate: '2025-05-12',  // Monday
        status: 'absent',
        prevStatus: null,
      })
      // Next occurrence after Monday: Thu May 15
      expect(r.nextCycleStart).toBe('2025-05-15')
    })
  })
})

// ═════════════════════════════════════════════════════════════════
// RULE 4 — isStudentOnHoliday
// ═════════════════════════════════════════════════════════════════

describe('Rule 4 — isStudentOnHoliday', () => {

  describe('POSITIVE', () => {
    it('academy-wide holiday (student_ids=null) → all students on holiday', () => {
      expect(isStudentOnHoliday({ student_ids: null }, 'any-id')).toBe(true)
    })

    it('academy-wide holiday (student_ids=[]) → all students on holiday', () => {
      expect(isStudentOnHoliday({ student_ids: [] }, 'any-id')).toBe(true)
    })

    it('specific holiday — student IS in the list → on holiday', () => {
      expect(isStudentOnHoliday({ student_ids: ['id-1', 'id-2'] }, 'id-1')).toBe(true)
    })
  })

  describe('NEGATIVE', () => {
    it('no active holiday (null) → not on holiday', () => {
      expect(isStudentOnHoliday(null, 'any-id')).toBe(false)
    })

    it('specific holiday — student NOT in the list → not on holiday', () => {
      expect(isStudentOnHoliday({ student_ids: ['id-1', 'id-2'] }, 'id-3')).toBe(false)
    })
  })

  describe('EDGE', () => {
    it('undefined holiday → not on holiday', () => {
      expect(isStudentOnHoliday(undefined, 'any-id')).toBe(false)
    })

    it('single-student holiday list — exact match works', () => {
      const id = 'abc-123-xyz'
      expect(isStudentOnHoliday({ student_ids: [id] }, id)).toBe(true)
      expect(isStudentOnHoliday({ student_ids: [id] }, 'other')).toBe(false)
    })
  })
})

// ═════════════════════════════════════════════════════════════════
// RULES 5 & 6 — sessionCountsForStudent (transfer carry-over guard)
// ═════════════════════════════════════════════════════════════════

describe('Rules 5 & 6 — sessionCountsForStudent (transfer + holiday + start date)', () => {

  describe('POSITIVE', () => {
    it('no holiday, session on sub start date → counts', () => {
      const counts = sessionCountsForStudent({
        holiday: null,
        studentId: 'x',
        subStartDate: '2025-05-11',
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(true)
    })

    it('no holiday, session after sub start date → counts', () => {
      const counts = sessionCountsForStudent({
        holiday: null,
        studentId: 'x',
        subStartDate: '2025-05-11',
        sessionDate: '2025-05-18',
      })
      expect(counts).toBe(true)
    })

    it('no holiday, no start date restriction (null) → counts', () => {
      const counts = sessionCountsForStudent({
        holiday: null,
        studentId: 'x',
        subStartDate: null,
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(true)
    })
  })

  describe('NEGATIVE', () => {
    it('academy-wide holiday → does not count for any student', () => {
      const counts = sessionCountsForStudent({
        holiday: { student_ids: null },
        studentId: 'x',
        subStartDate: null,
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(false)
    })

    it('student-specific holiday and student is in list → does not count', () => {
      const counts = sessionCountsForStudent({
        holiday: { student_ids: ['x'] },
        studentId: 'x',
        subStartDate: null,
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(false)
    })

    it('session is BEFORE sub start date → does not count (transfer carry-over)', () => {
      // After transfer, new subscription starts May 13 (Tuesday).
      // Session on May 11 (Sunday, old group) should NOT count.
      const counts = sessionCountsForStudent({
        holiday: null,
        studentId: 'x',
        subStartDate: '2025-05-13',
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(false)
    })
  })

  describe('EDGE', () => {
    it('student NOT in specific holiday list → session still counts', () => {
      const counts = sessionCountsForStudent({
        holiday: { student_ids: ['other-id'] },
        studentId: 'x',
        subStartDate: null,
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(true)
    })

    it('holiday present but subStartDate not reached → holiday takes precedence (both false)', () => {
      const counts = sessionCountsForStudent({
        holiday: { student_ids: null },
        studentId: 'x',
        subStartDate: '2025-06-01',
        sessionDate: '2025-05-11',
      })
      expect(counts).toBe(false)
    })
  })
})

// ═════════════════════════════════════════════════════════════════
// Full scenario: 4-session cycle from requirements
// ═════════════════════════════════════════════════════════════════

describe('Full scenario: 4-Sunday cycle with late payment', () => {
  const classDays = ['Sunday']

  // Sessions: May 4, 11, 18, 25 (cycle 1), Jun 1 (cycle 2 starts), Jun 8 (cycle 2 session 2)
  it('sessions 1-3 decrement remaining correctly', () => {
    let remaining = 4
    const sessions = ['2025-05-04', '2025-05-11', '2025-05-18']
    for (const date of sessions) {
      const r = computeDeduction({
        status: 'present', prevStatus: null,
        remainingSessions: remaining, totalSessions: 4,
        sessionCounts: true, classDays, sessionDate: date,
      })
      expect(r.shouldDeduct).toBe(true)
      expect(r.nextCycleStart).toBeNull()
      remaining = r.newRemaining
    }
    expect(remaining).toBe(1)
  })

  it('session 4 (May 25) → remaining=0, nextCycleStart=Jun 1', () => {
    const r = computeDeduction({
      status: 'present', prevStatus: null,
      remainingSessions: 1, totalSessions: 4,
      sessionCounts: true, classDays, sessionDate: '2025-05-25',
    })
    expect(r.newRemaining).toBe(0)
    expect(r.nextCycleStart).toBe('2025-06-01')
  })

  it('session 5 (Jun 1) → remaining=0, pay button shows, no deduction', () => {
    const r = computeDeduction({
      status: 'present', prevStatus: null,
      remainingSessions: 0, totalSessions: 4,
      sessionCounts: true, classDays, sessionDate: '2025-06-01',
    })
    expect(r.shouldDeduct).toBe(false)
  })

  it('payment on session 6 (Jun 8) → start date backdated to Jun 1', () => {
    const sub = { next_cycle_start: '2025-06-01' }
    const startDate = computeSubscriptionStartDate(sub, classDays, d('2025-06-08'))
    expect(startDate).toBe('2025-06-01')
  })

  it('absent on session 2 still counts (rule 2: absent = present for deduction)', () => {
    const r = computeDeduction({
      status: 'absent', prevStatus: null,
      remainingSessions: 3, totalSessions: 4,
      sessionCounts: true, classDays, sessionDate: '2025-05-11',
    })
    expect(r.shouldDeduct).toBe(true)
    expect(r.newRemaining).toBe(2)
  })

  it('holiday on session 2 → does NOT deduct, subscription extended', () => {
    const counts = sessionCountsForStudent({
      holiday: { student_ids: null },
      studentId: 'student-1',
      subStartDate: '2025-05-04',
      sessionDate: '2025-05-11',
    })
    const r = computeDeduction({
      status: 'present', prevStatus: null,
      remainingSessions: 3, totalSessions: 4,
      sessionCounts: counts, classDays, sessionDate: '2025-05-11',
    })
    expect(r.shouldDeduct).toBe(false)
    expect(r.newRemaining).toBe(3)  // unchanged
  })
})
