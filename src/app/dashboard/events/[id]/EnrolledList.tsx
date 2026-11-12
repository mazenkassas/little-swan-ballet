'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search, Trash2, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { unenrollStudent } from '../actions'

export type EnrolledRow = {
  id: string
  name: string
  altName: string | null
  initial: string
  classes: { id: string; name: string }[]
  status: 'paid' | 'partial' | 'unpaid' | string
  amountPaid: number
  method: string | null
}

type Filter = 'all' | 'paid' | 'partial' | 'unpaid'

const PAY_COLORS: Record<string, string> = { paid: '#3dab7e', partial: '#e8960a', unpaid: '#e04040' }

/** Lower-case, strip Arabic diacritics and unify common letter variants. */
function norm(s: string | null | undefined): string {
  return (s || '').toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim()
}

export default function EnrolledList({ rows, eventId, price, isRtl }: {
  rows: EnrolledRow[]; eventId: string; price: number; isRtl: boolean
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery]   = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError]   = useState('')
  const [, startTransition] = useTransition()

  const L = isRtl ? {
    all: 'الكل', paid: 'دفعت', partial: 'جزئي', unpaid: 'لم تدفع', search: 'ابحث بالاسم...',
    noClass: 'غير مسجلة في مجموعة', noMatch: 'لا توجد نتائج', remove: 'إزالة من الفعالية', sure: 'تأكيد الإزالة',
    removing: '...', err: 'تعذرت الإزالة: ', noStudents: 'لا توجد طالبات مسجلات بعد',
    hint: 'استخدمي زر «تسجيل طالبة» لإضافة أول طالبة.', cash: 'كاش', instapay: 'إنستاباي',
  } : {
    all: 'All', paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', search: 'Search by name...',
    noClass: 'Not enrolled in a class', noMatch: 'No students match', remove: 'Remove from event', sure: 'Confirm remove',
    removing: '...', err: 'Could not remove: ', noStudents: 'No students enrolled yet',
    hint: 'Use “Enroll Student” to add the first one.', cash: 'Cash', instapay: 'Instapay',
  }

  const counts = useMemo(() => ({
    all: rows.length,
    paid: rows.filter(r => r.status === 'paid').length,
    partial: rows.filter(r => r.status === 'partial').length,
    unpaid: rows.filter(r => r.status === 'unpaid').length,
  }), [rows])

  const q = norm(query)
  const visible = rows.filter(r =>
    (filter === 'all' || r.status === filter) &&
    (!q || norm(r.name).includes(q) || norm(r.altName).includes(q)),
  )

  function remove(id: string) {
    setBusyId(id); setError('')
    startTransition(async () => {
      const r = await unenrollStudent(id, eventId)
      if (r.error) setError(L.err + r.error)
      setBusyId(null); setConfirmId(null)
    })
  }

  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '44px 16px', color: 'var(--txt2)' }}>
        <Users size={32} style={{ opacity: 0.25, margin: '0 auto 10px', display: 'block' }} />
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{L.noStudents}</p>
        <p style={{ margin: 0, fontSize: 12 }}>{L.hint}</p>
      </div>
    )
  }

  return (
    <>
      <div className="ev-toolbar">
        <div className="ev-search">
          <Search size={14} />
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={L.search} aria-label={L.search} />
        </div>
        <div className="ev-tabs" role="tablist">
          {(['all', 'paid', 'partial', 'unpaid'] as const).map(f => (
            <button key={f} type="button" role="tab" aria-selected={filter === f}
              className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {L[f]}<span>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, padding: '8px 16px', fontSize: 12, color: '#e04040', background: '#e0404010', borderBottom: '1px solid var(--border)' }}>
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="dh-empty">{L.noMatch}</p>
      ) : visible.map(r => {
        const clr = PAY_COLORS[r.status] || '#888'
        const lbl = (L as any)[r.status] || r.status
        const method = r.method === 'cash' ? L.cash : r.method === 'instapay' ? L.instapay : r.method
        const confirming = confirmId === r.id
        return (
          <div key={r.id} className="ev-row" style={{ opacity: busyId === r.id ? 0.5 : 1 }}>
            <div className="dh-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{r.initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{r.name}</p>
                {r.classes.length > 0 ? r.classes.map(c => (
                  <span key={c.id} dir="ltr" style={{
                    fontSize: 11, fontWeight: 600, color: '#c9506a', background: '#d4667a12',
                    border: '1px solid #d4667a26', borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap',
                  }}>{c.name}</span>
                )) : (
                  <span style={{ fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic' }}>{L.noClass}</span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--txt2)', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: r.amountPaid > 0 ? 'var(--txt1)' : undefined, fontWeight: 600 }}>{formatCurrency(r.amountPaid)}</span>
                {' / '}{formatCurrency(price)}
                {method ? ` · ${method}` : ''}
              </p>
            </div>
            <div className="ev-row-end">
              <span style={{
                fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px',
                background: clr + '15', color: clr, whiteSpace: 'nowrap',
              }}>{lbl}</span>
              {confirming ? (
                <>
                  <button type="button" className="ev-iconbtn confirm" disabled={busyId === r.id} onClick={() => remove(r.id)}>
                    {busyId === r.id ? L.removing : L.sure}
                  </button>
                  <button type="button" className="ev-iconbtn" style={{ width: 'auto', padding: '0 8px', fontSize: 11.5, fontFamily: 'inherit' }}
                    onClick={() => setConfirmId(null)} disabled={busyId === r.id}>✕</button>
                </>
              ) : (
                <button type="button" className="ev-iconbtn" title={L.remove} aria-label={`${L.remove}: ${r.name}`}
                  onClick={() => setConfirmId(r.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
