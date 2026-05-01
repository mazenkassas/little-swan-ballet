'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'

type Expense = { id: string; title: string; amount: number }
type NewRow  = { title: string; amount: string }

export default function DailyExpensesSection({
  expenses, date, locale,
}: {
  expenses: Expense[]
  date: string
  locale: string
}) {
  const supabase = createClient()
  const router   = useRouter()
  const isRtl    = locale === 'ar'

  const [rows,     setRows]     = useState<NewRow[]>([])
  const [saving,   setSaving]   = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function addRow()  { setRows(r => [...r, { title: '', amount: '' }]) }
  function removeRow(i: number) { setRows(r => r.filter((_, j) => j !== i)) }
  function update(i: number, f: string, v: string) {
    setRows(r => r.map((row, j) => j === i ? { ...row, [f]: v } : row))
  }

  async function saveRow(i: number) {
    const row = rows[i]
    if (!row.title || !row.amount) return
    setSaving(i)
    await supabase.from('expenses').insert({ title: row.title, amount: parseFloat(row.amount), date })
    setSaving(null)
    removeRow(i)
    router.refresh()
  }

  async function deleteRow(id: string) {
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

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
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#e0404018', border: '1px solid #e0404028', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            📉
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
            {isRtl ? 'مصروفات اليوم' : "Today's Expenses"}
          </p>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#e04040' }}>{formatCurrency(total)}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 28 }}>#</th>
              <th style={th}>{isRtl ? 'البند' : 'Description'}</th>
              <th style={{ ...th, width: 100, textAlign: 'center' }}>{isRtl ? 'المبلغ' : 'Amount'}</th>
              <th style={{ ...th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={e.id} style={{ background: i % 2 === 1 ? 'var(--bg-page)' : 'transparent' }}>
                <td style={{ ...td, textAlign: 'center', color: 'var(--txt2)', fontSize: 11 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{e.title}</td>
                <td style={{ ...td, textAlign: 'center', color: '#e04040', fontWeight: 700 }}>{formatCurrency(e.amount)}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button onClick={() => deleteRow(e.id)} disabled={deleting === e.id}
                    style={{ background: 'none', border: 'none', color: '#e04040', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                    {deleting === e.id ? '…' : '×'}
                  </button>
                </td>
              </tr>
            ))}

            {rows.map((row, i) => (
              <tr key={`new-${i}`} style={{ background: '#e0404008' }}>
                <td style={{ ...td, textAlign: 'center', color: 'var(--txt2)', fontSize: 11 }}>{expenses.length + i + 1}</td>
                <td style={td}>
                  <input type="text" value={row.title}
                    placeholder={isRtl ? 'وصف المصروف' : 'Description'}
                    onChange={e => update(i, 'title', e.target.value)}
                    style={inp} />
                </td>
                <td style={td}>
                  <input type="number" value={row.amount} placeholder="0"
                    onChange={e => update(i, 'amount', e.target.value)}
                    style={{ ...inp, textAlign: 'center', direction: 'ltr' }} />
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    <button onClick={() => saveRow(i)} disabled={saving === i || !row.title || !row.amount}
                      style={{ background: '#e04040', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: (!row.title || !row.amount) ? 0.4 : 1 }}>
                      {saving === i ? '…' : '✓'}
                    </button>
                    <button onClick={() => removeRow(i)}
                      style={{ background: 'none', border: 'none', color: '#e04040', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                </td>
              </tr>
            ))}

            {expenses.length === 0 && rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...td, textAlign: 'center', padding: '24px', color: 'var(--txt2)' }}>
                  {isRtl ? 'لا توجد مصروفات اليوم' : 'No expenses today'}
                </td>
              </tr>
            )}

            <tr>
              <td colSpan={4} style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <button onClick={addRow} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#e04040', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Plus size={13} />
                  {isRtl ? 'إضافة' : 'Add Expense'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
