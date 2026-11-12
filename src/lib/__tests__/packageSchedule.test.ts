import { describe, it, expect } from 'vitest'
import { computePackageSchedule, nextClassDateAfter, type AttendanceStatus } from '../subscriptionLogic'

// Thursdays: 2026-10-29, 11-05, 11-12, 11-19, 11-26, 12-03
const THU = ['Thursday']
const marks = (m: Record<string, AttendanceStatus>) => (d: string) => m[d] ?? null
const dates = (s: ReturnType<typeof computePackageSchedule>) => s.classes.map(c => `${c.date}:${c.state}`)

describe('computePackageSchedule — fareha (4-class package from 29 Oct)', () => {
  it('counts passed classes automatically and today once marked', () => {
    const s = computePackageSchedule({
      classDays: THU, start: '2026-10-29', size: 4, today: '2026-11-12',
      markOn: marks({ '2026-11-12': 'present' }),
    })
    expect(dates(s)).toEqual([
      '2026-10-29:used', '2026-11-05:used', '2026-11-12:used', '2026-11-19:upcoming',
    ])
    expect(s.total).toBe(4)
    expect(s.used).toBe(3)
    expect(s.remaining).toBe(1)
    expect(s.endDate).toBe('2026-11-19')
    expect(s.nextStart).toBe('2026-11-26')
  })

  it('gives the same result with the manual end date 19 Nov', () => {
    const s = computePackageSchedule({
      classDays: THU, start: '2026-10-29', end: '2026-11-19', size: 4, today: '2026-11-12',
      markOn: marks({ '2026-11-12': 'present' }),
    })
    expect(s.total).toBe(4)
    expect(s.remaining).toBe(1)
    expect(s.endDate).toBe('2026-11-19')
    expect(s.nextStart).toBe('2026-11-26')
  })

  it("does not use today's class until it is marked", () => {
    const s = computePackageSchedule({ classDays: THU, start: '2026-10-29', size: 4, today: '2026-11-12' })
    expect(dates(s)).toEqual([
      '2026-10-29:used', '2026-11-05:used', '2026-11-12:today', '2026-11-19:upcoming',
    ])
    expect(s.remaining).toBe(2)
  })

  it('counts an absence the same as a presence', () => {
    const s = computePackageSchedule({
      classDays: THU, start: '2026-10-29', size: 4, today: '2026-11-12',
      markOn: marks({ '2026-11-12': 'absent' }),
    })
    expect(s.remaining).toBe(1)
  })

  it('a make-up does not use a session and extends the package by one class', () => {
    const s = computePackageSchedule({
      classDays: THU, start: '2026-10-29', size: 4, today: '2026-11-12',
      markOn: marks({ '2026-11-05': 'make_up' }),
    })
    expect(dates(s)).toEqual([
      '2026-10-29:used', '2026-11-05:skipped', '2026-11-12:today', '2026-11-19:upcoming', '2026-11-26:upcoming',
    ])
    expect(s.total).toBe(4)
    expect(s.used).toBe(1)
    expect(s.remaining).toBe(3)
    expect(s.endDate).toBe('2026-11-26')
    expect(s.nextStart).toBe('2026-12-03')
  })

  it('a holiday does not use a session and extends the package by one class', () => {
    const s = computePackageSchedule({
      classDays: THU, start: '2026-10-29', size: 4, today: '2026-12-10',
      isHoliday: d => d === '2026-11-19',
    })
    expect(s.classes.find(c => c.date === '2026-11-19')?.reason).toBe('holiday')
    expect(s.endDate).toBe('2026-11-26')
    expect(s.used).toBe(4)
    expect(s.remaining).toBe(0)
    expect(s.nextStart).toBe('2026-12-03')
  })

  it('with a manual end date a holiday shortens the package instead', () => {
    const s = computePackageSchedule({
      classDays: THU, start: '2026-10-29', end: '2026-11-19', size: 4, today: '2026-11-01',
      isHoliday: d => d === '2026-11-05',
    })
    expect(s.total).toBe(3)
    expect(s.endDate).toBe('2026-11-19')
  })
})

describe('computePackageSchedule — other cases', () => {
  it('a package that starts in the future has used nothing', () => {
    const s = computePackageSchedule({ classDays: THU, start: '2026-11-26', size: 4, today: '2026-11-12' })
    expect(s.used).toBe(0)
    expect(s.remaining).toBe(4)
    expect(s.endDate).toBe('2026-12-17')
  })

  it('a package whose classes are all past is finished (renewal due)', () => {
    const s = computePackageSchedule({ classDays: THU, start: '2026-07-02', size: 4, today: '2026-11-12' })
    expect(s.used).toBe(4)
    expect(s.remaining).toBe(0)
    expect(s.endDate).toBe('2026-07-23')
    expect(s.nextStart).toBe('2026-07-30')
  })

  it('works with two class days a week', () => {
    // Sat 2026-11-07, Mon 11-09, Sat 11-14, Mon 11-16
    const s = computePackageSchedule({ classDays: ['Saturday', 'Monday'], start: '2026-11-07', size: 4, today: '2026-11-15' })
    expect(s.classes.map(c => c.date)).toEqual(['2026-11-07', '2026-11-09', '2026-11-14', '2026-11-16'])
    expect(s.used).toBe(3)
    expect(s.nextStart).toBe('2026-11-21')
  })

  it('a start date that is not a class day begins at the next class', () => {
    const s = computePackageSchedule({ classDays: THU, start: '2026-10-27', size: 2, today: '2026-10-01' })
    expect(s.classes.map(c => c.date)).toEqual(['2026-10-29', '2026-11-05'])
  })

  it('returns ok=false when the group has no class days', () => {
    const s = computePackageSchedule({ classDays: [], start: '2026-10-29', size: 4, today: '2026-11-12' })
    expect(s.ok).toBe(false)
    expect(s.remaining).toBe(4)
  })
})

describe('nextClassDateAfter', () => {
  it('is strictly after the given date', () => {
    expect(nextClassDateAfter(THU, '2026-11-19')).toBe('2026-11-26')
    expect(nextClassDateAfter(THU, '2026-11-18')).toBe('2026-11-19')
  })
})
