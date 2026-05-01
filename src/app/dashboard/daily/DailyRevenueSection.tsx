'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'

type Student = { id: string; name_ar: string; name_en?: string | null }
type Payment = {
  id: string
  student: { name_ar: string; name_en?: string | null } | null
  amount_paid: number
  type: string
  payment_method: string
}
type NewRow = { student_id: string; amount: string; type: string; payment_method: string }

const TYPES = ['subscription', 'product', 'event', 'private', 'exam', 'enrollment']

export default function DailyRevenueSection({
  payments, students, date, locale,
}: {
  payments: Payment[]
  students: Student[]
  date: string
  locale: string
}) {
  const supabase = createClient()
  const router   = useRouter()
  const isRtl    = locale === 'ar'

  const TYPE_LABELS: Record<string, string> = {
    subscription: isRtl ? 'اشتراك'  : 'Subscription',
    product:      isRtl ? 'منتج'     : 'Product',
    event:        isRtl ? 'فعالية'   : 'Event',
    private:      isRtl ? 'برايفيت' : 'Private',
    exam:         isRtl ? 'امتحان'   : 'Exam',
    enrollment:   isRtl ? 'تسجيل'   : 'Enrollment',
  }

  const [rows,     setRows]     = useState<NewRow[]>([])
  const [saving,   setSaving]   = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function sName(s: { name_ar: string; name_en?: string | null } | null) {
    if (!s) return '—'
    return locale === 'en' && s.name_en ? s.name_en : s.name_ar
  }
  function addRow() {
    setRows(r => [...r, { student_id: '', amount: '', type: 'subscription', payment_method: 'cash' }])
  }
  function removeRow(i: number) { setRows(r => r.filter((_, j) => j !== i)) }
  function update(i: number, f: string, v: string) {
    setRows(r => r.map((row, j) => j === i ? { ...row, [f]: v } : row))
  }

  async function saveRow(i: number) {
    const row = rows[i]
    if (!row.student_id || !row.amount) return
    setSaving(i)
    await supabase.from('payments').insert({
      student_id: row.student_id, type: row.type,
      amount_due: parseFloat(row.amount), amount_paid: parseFloat(row.amount),
      payment_method: row.payment_method, date,
    })
    setSaving(null)
    removeRow(i)
    router.refresh()
  }

  async function deleteRow(id: string) {
    setDeleting(id)
    await supabase.from('payments').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  const total      = payments.reduce((s, p) => s + p.amount_paid, 0)
  const cashTotal  = payments.filter(p => p.payment_method === 'cash').reduce((s, p) => s + p.amount_paid, 0)
  const instaTotal = payments.filter(p => p.payment_method === 'instapay').reduce((s, p) => s + p.amount_paid, 0)

  const th: React.CSSProperties = {
    background: 'var(--bg-page)', color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
    padding: '8px 10px', textAlign: isRtl ? 'right' : 'left',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '8px 10px', fontSize: 12, borderBottom: '1px solid var(--border)',
    color: 'var(--txt1)', verticalAlign: 'middle',
  }
  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--txt1)',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

      {/* Section header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#3dab7e18', border: '1px solid #3dab7e28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            💳
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
              {isRtl ? 'تحصيلات اليوم' : "Today's Revenue"}
            </p>
            {total > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                {cashTotal > 0 && <span style={{ fontSize: 10, color: '#3dab7e', fontWeight: 600 }}>{isRtl ? 'كاش' : 'Cash'}: {formatCurrency(cashTotal)}</span>}
                {instaTotal > 0 && <span style={{ fontSize: 10, color: '#4a90d9', fontWeight: 600 }}>{isRtl ? 'إنستاباي' : 'Instapay'}: {formatCurrency(instaTotal)}</span>}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#3dab7e' }}>{formatCurrency(total)}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 28 }}>#</th>
              <th style={th}>{isRtl ? 'اسم البنت' : 'Student'}</th>
              <th style={{ ...th, width: 90, textAlign: 'center' }}>{isRtl ? 'المبلغ' : 'Amount'}</th>
              <th style={{ ...th, width: 120 }}>{isRtl ? 'السبب' : 'Type'}</th>
              <th style={{ ...th, width: 110 }}>{isRtl ? 'طريقة الدفع' : 'Method'}</th>
              <th style={{ ...th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.id} style={{ background: i % 2 === 1 ? 'var(--bg-page)' : 'transparent' }}>
                <td style={{ ...td, textAlign: 'center', color: 'var(--txt2)', fontSize: 11 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{sName(p.student)}</td>
                <td style={{ ...td, textAlign: 'center', color: '#3dab7e', fontWeight: 700 }}>{formatCurrency(p.amount_paid)}</td>
                <td style={{ ...td, fontSize: 11 }}>{TYPE_LABELS[p.type] || p.type}</td>
                <td style={td}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 10px',
                    background: p.payment_method === 'cash' ? '#3dab7e18' : '#4a90d918',
                    color:      p.payment_method === 'cash' ? '#3dab7e'   : '#4a90d9',
                    border: `1px solid ${p.payment_method === 'cash' ? '#3dab7e28' : '#4a90d928'}`,
                  }}>
                    {p.payment_method === 'cash' ? (isRtl ? 'كاش' : 'Cash') : (isRtl ? 'إنستاباي' : 'Instapay')}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button
                    onClick={() => deleteRow(p.id)}
                    disabled={deleting === p.id}
                    style={{ background: 'none', border: 'none', color: '#e04040', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                  >
                    {deleting === p.id ? '…' : '×'}
                  </button>
                </td>
              </tr>
            ))}

            {rows.map((row, i) => (
              <tr key={`new-${i}`} style={{ background: '#3dab7e08' }}>
                <td style={{ ...td, textAlign: 'center', color: 'var(--txt2)', fontSize: 11 }}>{payments.length + i + 1}</td>
                <td style={td}>
                  <select value={row.student_id} onChange={e => update(i, 'student_id', e.target.value)} style={inp}>
                    <option value="">{isRtl ? '— اختاري —' : '— select —'}</option>
                    {students.map(s => <option key={s.id} value={s.id}>{sName(s)}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <input type="number" value={row.amount} placeholder="0"
                    onChange={e => update(i, 'amount', e.target.value)}
                    style={{ ...inp, textAlign: 'center', direction: 'ltr' }} />
                </td>
                <td style={td}>
                  <select value={row.type} onChange={e => update(i, 'type', e.target.value)} style={inp}>
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={row.payment_method} onChange={e => update(i, 'payment_method', e.target.value)} style={inp}>
                    <option value="cash">{isRtl ? 'كاش' : 'Cash'}</option>
                    <option value="instapay">{isRtl ? 'إنستاباي' : 'Instapay'}</option>
                  </select>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    <button onClick={() => saveRow(i)} disabled={saving === i || !row.student_id || !row.amount}
                      style={{ background: '#3dab7e', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: (!row.student_id || !row.amount) ? 0.4 : 1 }}>
                      {saving === i ? '…' : '✓'}
                    </button>
                    <button onClick={() => removeRow(i)}
                      style={{ background: 'none', border: 'none', color: '#e04040', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                </td>
              </tr>
            ))}

            {payments.length === 0 && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: 'center', padding: '24px', color: 'var(--txt2)' }}>
                  {isRtl ? 'لا توجد تحصيلات اليوم' : 'No payments today'}
                </td>
              </tr>
            )}

            <tr>
              <td colSpan={6} style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <button onClick={addRow} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#3dab7e', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Plus size={13} />
                  {isRtl ? 'إضافة' : 'Add Payment'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
