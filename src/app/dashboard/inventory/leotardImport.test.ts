import { describe, it, expect } from 'vitest'
import { parseLeotardSheet } from './leotardImport'

const opts = {
  branch: [{ v: 'miami', ar: 'ميامي', en: 'Miami' }],
  day: [{ v: 'fri', ar: 'الجمعة', en: 'Friday' }, { v: 'sat', ar: 'السبت', en: 'Saturday' }],
  payStatus: [{ v: 'paid', ar: 'خالص', en: 'Paid' }, { v: 'remaining', ar: 'باقي', en: 'Remaining' }],
  size: [{ v: 'M', ar: 'M', en: 'M' }],
  tailor: [{ v: 'received', ar: 'تم الاستلام', en: 'Received' }, { v: 'pending', ar: 'لم يتم الاستلام', en: 'Not received' }],
  delivery: [{ v: 'delivered', ar: 'تم الاستلام', en: 'Received' }, { v: 'pending', ar: 'لم يتم الاستلام', en: 'Not received' }],
}

describe('parseLeotardSheet', () => {
  it('reads Arabic headers in any order and maps values', () => {
    const res = parseLeotardSheet([
      ['مايوهات شهر 11'],
      ['م', 'الاسم', 'التاريخ', 'الجروب', 'المدفوع', 'الإجمالي', 'كاش', 'انستاباي', 'المقاس', 'حالة الاستلام من الخياط', 'حالة التسليم للعميل'],
      [1, 'سارة', new Date(Date.UTC(2026, 10, 13)), '5 - 7', 200, '300', 'كاش', '', 'm', 'تم الاستلام', 'لم يتم الاستلام'],
      [2, '', null, null, null, null, null, null, null, null, null],
      ['', 'الاجمالي', null, null, 200, 300],
    ], opts, ['Total', 'الاجمالي'])
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.orders).toEqual([{
      customer_name: 'سارة', branch: null, order_date: '2026-11-13', day_of_week: 'fri', group_name: '5 - 7',
      size: 'M', total_amount: 300, paid_amount: 200, pay_status: 'remaining', cash: true, instapay: false,
      tailor_status: 'received', delivery_status: 'pending',
    }])
  })

  it('reads English headers, day/month/year dates and a day name', () => {
    const res = parseLeotardSheet([
      ['Name', 'Day', 'Date', 'Total', 'Paid', 'Payment Status'],
      ['Mona', 'Saturday', '', 0, 0, 'Paid'],
      ['Lina', '', '14/11/2026', 100, 100, ''],
    ], opts, ['Total'])
    if (!res.ok) throw new Error('not ok')
    expect(res.orders[0]).toMatchObject({ day_of_week: 'sat', order_date: null, pay_status: 'paid' })
    expect(res.orders[1]).toMatchObject({ day_of_week: 'sat', order_date: '2026-11-14', pay_status: 'paid' })
  })

  it('reports a missing name column', () => {
    expect(parseLeotardSheet([['a', 'b'], [1, 2]], opts, [])).toEqual({ ok: false, reason: 'noHeader' })
  })
})
