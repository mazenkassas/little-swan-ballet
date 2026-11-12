'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Student = { id: string; name_ar: string; name_en?: string | null }

// "Enroll Student" button that opens a small popup to enroll a student in the event.
export default function EventEnrollForm({ eventId, eventPrice, students, isRtl }: {
  eventId: string; eventPrice: number; students: Student[]; isRtl?: boolean
}) {
  const supabase = createClient()
  const router   = useRouter()
  const [open,          setOpen]          = useState(false)
  const [studentId,     setStudentId]     = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay'>('cash')
  const [amountPaid,    setAmountPaid]    = useState(eventPrice.toString())
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  const L = isRtl ? {
    title: 'تسجيل طالبة', student: 'الطالبة', selectPlaceholder: 'اختر الطالبة...',
    noneLeft: 'كل الطالبات النشطات مسجلات بالفعل',
    amountLabel: 'المبلغ المدفوع (جنيه)', method: 'طريقة الدفع', cash: '💵 كاش', instapay: '📱 إنستاباي',
    enroll: 'تسجيل', enrolling: 'جارٍ التسجيل...', cancel: 'إلغاء', close: 'إغلاق',
    failed: 'تعذّر التسجيل',
  } : {
    title: 'Enroll Student', student: 'Student', selectPlaceholder: 'Select student...',
    noneLeft: 'All active students are already enrolled',
    amountLabel: 'Amount paid (EGP)', method: 'Payment method', cash: '💵 Cash', instapay: '📱 Instapay',
    enroll: 'Enroll', enrolling: 'Enrolling...', cancel: 'Cancel', close: 'Close',
    failed: 'Could not enroll',
  }

  function openPopup() {
    setStudentId(''); setAmountPaid(eventPrice.toString()); setPaymentMethod('cash'); setError('')
    setOpen(true)
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading])

  async function enroll(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || loading) return
    setLoading(true); setError('')

    const paid          = parseFloat(amountPaid) || 0
    const paymentStatus = paid >= eventPrice ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

    let paymentId: string | null = null
    if (paid > 0) {
      const { data: pmt, error: pErr } = await supabase.from('payments').insert({
        student_id: studentId, type: 'event',
        amount_due: eventPrice, amount_paid: paid,
        payment_method: paymentMethod,
        date: new Date().toISOString().split('T')[0],
      }).select('id').single()
      if (pErr) { setError(`${L.failed}: ${pErr.message}`); setLoading(false); return }
      paymentId = pmt?.id ?? null
    }

    const { error: eErr } = await supabase.from('event_enrollments').insert({
      event_id: eventId, student_id: studentId,
      payment_status: paymentStatus, payment_id: paymentId,
    })
    if (eErr) {
      // Don't leave an orphan payment behind
      if (paymentId) await supabase.from('payments').delete().eq('id', paymentId)
      setError(`${L.failed}: ${eErr.message}`); setLoading(false); return
    }

    setLoading(false); setOpen(false)
    router.refresh()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--txt1)', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const canSubmit = !!studentId && !loading

  return (
    <>
      <button type="button" onClick={openPopup} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#d4667a', color: '#fff', border: 'none', borderRadius: 8,
        padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', whiteSpace: 'nowrap',
      }}>
        <UserPlus size={14} />
        {L.title}
      </button>

      {open && (
        <div
          onMouseDown={e => { if (e.target === e.currentTarget && !loading) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <form
            onSubmit={enroll}
            role="dialog" aria-modal="true" aria-label={L.title}
            style={{
              width: '100%', maxWidth: 400, background: 'var(--bg-popup)',
              border: '1px solid var(--border)', borderRadius: 14,
              boxShadow: '0 20px 50px rgba(0,0,0,.4)', direction: isRtl ? 'rtl' : 'ltr',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
            }}>
              <UserPlus size={16} color="#d4667a" />
              <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{L.title}</p>
              <button type="button" aria-label={L.close} onClick={() => !loading && setOpen(false)} style={{
                background: 'none', border: 'none', color: 'var(--txt2)', cursor: 'pointer', padding: 2, display: 'flex',
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>{L.student}</label>
                {students.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)' }}>{L.noneLeft}</p>
                ) : (
                  <select autoFocus value={studentId} onChange={e => setStudentId(e.target.value)} style={inp}>
                    <option value="">{L.selectPlaceholder}</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {isRtl || !s.name_en ? s.name_ar : s.name_en}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={lbl}>{L.amountLabel}</label>
                <input
                  type="number" value={amountPaid} min="0"
                  onChange={e => setAmountPaid(e.target.value)}
                  style={{ ...inp, direction: 'ltr' }}
                />
              </div>

              <div>
                <label style={lbl}>{L.method}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([{ v: 'cash', l: L.cash }, { v: 'instapay', l: L.instapay }] as const).map(m => (
                    <button key={m.v} type="button" onClick={() => setPaymentMethod(m.v)} style={{
                      padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${paymentMethod === m.v ? '#d4667a' : 'var(--border)'}`,
                      background: paymentMethod === m.v ? '#d4667a18' : 'var(--bg-page)',
                      color: paymentMethod === m.v ? '#d4667a' : 'var(--txt2)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>{m.l}</button>
                  ))}
                </div>
              </div>

              {error && (
                <p role="alert" style={{
                  margin: 0, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                  background: '#e0404012', border: '1px solid #e0404030', color: '#e04040',
                }}>{error}</p>
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'flex-end',
              padding: '12px 18px', borderTop: '1px solid var(--border)',
            }}>
              <button type="button" onClick={() => setOpen(false)} disabled={loading} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--txt2)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{L.cancel}</button>
              <button type="submit" disabled={!canSubmit} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: '#d4667a', color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5,
                fontFamily: 'inherit',
              }}>
                <UserPlus size={14} />
                {loading ? L.enrolling : L.enroll}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
