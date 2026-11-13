import { describe, it, expect } from 'vitest'
import { subscriptionDates, needsPayment } from '../subscriptionLogic'

describe('subscriptionDates', () => {
  it('due = end date, pay = stored renewal date', () => {
    const d = subscriptionDates({ end_date: '2026-11-27', next_cycle_start: '2026-11-06' }, ['Friday'])
    expect(d).toEqual({ dueDate: '2026-11-27', payDate: '2026-11-06' })
  })
  it('pay = first class after the end date when no renewal date is stored', () => {
    // 2026-11-27 is a Friday → next Friday class is 2026-12-04
    expect(subscriptionDates({ end_date: '2026-11-27' }, ['Friday']).payDate).toBe('2026-12-04')
  })
  it('Darin: unpaid package started 6/11 → pay date 6/11, payment required on 13/11', () => {
    const sub = { start_date: '2026-11-06', end_date: '2026-11-27', remaining_sessions: 2 }
    const d = subscriptionDates(sub, ['Friday'], null, false)
    expect(d).toEqual({ dueDate: '2026-11-27', payDate: '2026-11-06' })
    expect(needsPayment(sub, d, '2026-11-13')).toBe(true)
  })
  it('paid package: pay date is the next renewal, active until then', () => {
    const sub = { start_date: '2026-11-13', end_date: '2026-12-04', remaining_sessions: 3 }
    const d = subscriptionDates(sub, ['Friday'], null, true)
    expect(d.payDate).toBe('2026-12-11')
    expect(needsPayment(sub, d, '2026-11-13')).toBe(false)
  })
  it('falls back to the calendar schedule', () => {
    const d = subscriptionDates({}, ['Friday'], { endDate: '2026-11-20', nextStart: '2026-11-27' })
    expect(d).toEqual({ dueDate: '2026-11-20', payDate: '2026-11-27' })
  })
})

describe('needsPayment', () => {
  const sub = { start_date: '2026-10-09', remaining_sessions: 2 }
  it('Darin: pay date 6/11 has passed → payment required even with sessions left', () => {
    expect(needsPayment(sub, { dueDate: '2026-11-27', payDate: '2026-11-06' }, '2026-11-13')).toBe(true)
  })
  it('active while the pay date is in the future', () => {
    expect(needsPayment(sub, { dueDate: '2026-11-27', payDate: '2026-12-04' }, '2026-11-13')).toBe(false)
  })
  it('required on the pay date itself, after the due date, or with 0 sessions', () => {
    expect(needsPayment(sub, { dueDate: '2026-11-06', payDate: '2026-11-13' }, '2026-11-13')).toBe(true)
    expect(needsPayment(sub, { dueDate: '2026-11-06', payDate: null }, '2026-11-13')).toBe(true)
    expect(needsPayment({ ...sub, remaining_sessions: 0 }, { dueDate: null, payDate: null }, '2026-11-13')).toBe(true)
  })
  it('never before the package starts', () => {
    expect(needsPayment({ start_date: '2026-11-20', remaining_sessions: 0 }, { dueDate: null, payDate: '2026-11-06' }, '2026-11-13')).toBe(false)
  })
})
