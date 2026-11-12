import { describe, it, expect } from 'vitest'
import {
  listClassDates,
  getNthClassDate,
  computePackageFromDates,
  sessionCountsForStudent,
} from '../subscriptionLogic'

// 2026-11-04, 11, 18, 25 are Wednesdays
describe('listClassDates', () => {
  it('lists class days between start and end inclusive', () => {
    expect(listClassDates(['Wednesday'], '2026-11-04', '2026-11-25'))
      .toEqual(['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25'])
  })
  it('handles two class days a week', () => {
    expect(listClassDates(['Monday', 'Wednesday'], '2026-11-02', '2026-11-11'))
      .toEqual(['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11'])
  })
  it('skips holidays', () => {
    expect(listClassDates(['Wednesday'], '2026-11-04', '2026-11-25', d => d === '2026-11-18'))
      .toEqual(['2026-11-04', '2026-11-11', '2026-11-25'])
  })
  it('returns nothing when end is before start or no class days', () => {
    expect(listClassDates(['Wednesday'], '2026-11-25', '2026-11-04')).toEqual([])
    expect(listClassDates([], '2026-11-04', '2026-11-25')).toEqual([])
  })
})

describe('getNthClassDate', () => {
  it('finds the 4th Wednesday from the start', () => {
    expect(getNthClassDate(['Wednesday'], '2026-11-04', 4)).toBe('2026-11-25')
  })
  it('counts from the next class day when start is not a class day', () => {
    expect(getNthClassDate(['Wednesday'], '2026-11-05', 1)).toBe('2026-11-11')
  })
})

describe('computePackageFromDates', () => {
  it('total = class dates, remaining = total minus used', () => {
    expect(computePackageFromDates({ classDays: ['Wednesday'], start: '2026-11-04', end: '2026-11-25', usedSessions: 1 }))
      .toEqual({ total: 4, remaining: 3, nextCycleStart: null })
  })
  it('sets next cycle start after the end date when fully used', () => {
    expect(computePackageFromDates({ classDays: ['Wednesday'], start: '2026-11-04', end: '2026-11-11', usedSessions: 2 }))
      .toEqual({ total: 2, remaining: 0, nextCycleStart: '2026-11-18' })
  })
  it('never goes below zero', () => {
    expect(computePackageFromDates({ classDays: ['Wednesday'], start: '2026-11-04', end: '2026-11-04', usedSessions: 3 }).remaining).toBe(0)
  })
})

describe('sessionCountsForStudent with end date', () => {
  const base = { holiday: null, studentId: 's1', subStartDate: '2026-11-04' }
  it('counts inside the range', () => {
    expect(sessionCountsForStudent({ ...base, sessionDate: '2026-11-11', subEndDate: '2026-11-25' })).toBe(true)
  })
  it('does not count after the end date', () => {
    expect(sessionCountsForStudent({ ...base, sessionDate: '2026-12-02', subEndDate: '2026-11-25' })).toBe(false)
  })
  it('keeps old behaviour when no end date', () => {
    expect(sessionCountsForStudent({ ...base, sessionDate: '2027-01-06' })).toBe(true)
  })
})
