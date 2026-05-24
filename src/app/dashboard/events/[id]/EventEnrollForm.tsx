'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EventEnrollForm({ eventId, eventPrice, students, isRtl }: {
  eventId: string; eventPrice: number; students: any[]; isRtl?: boolean
}) {
  const supabase = createClient()
  const router   = useRouter()
  const [studentId,      setStudentId]      = useState('')
  const [paymentMethod,  setPaymentMethod]  = useState<'cash' | 'instapay'>('cash')
  const [amountPaid,     setAmountPaid]     = useState(eventPrice.toString())
  const [loading,        setLoading]        = useState(false)
  const [msg,            setMsg]            = useState('')

  const L = isRtl ? {
    title: 'تسجيل طالبة', selectPlaceholder: 'اختر الطالبة...',
    amountLabel: 'المبلغ المدفوع (جنيه)', cash: '💵 كاش', instapay: '📱 إنستاباي',
    enroll: 'تسجيل', enrolling: 'جارٍ...', success: 'تم التسجيل ✓',
  } : {
    title: 'Enroll Student', selectPlaceholder: 'Select student...',
    amountLabel: 'Amount paid (EGP)', cash: '💵 Cash', instapay: '📱 Instapay',
    enroll: 'Enroll', enrolling: 'Enrolling...', success: 'Enrolled ✓',
  }

  async function enroll() {
    if (!studentId) return
    setLoading(true); setMsg('')

    const paid          = parseFloat(amountPaid) || 0
    const paymentStatus = paid >= eventPrice ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

    let paymentId = null
    if (paid > 0) {
      const { data: pmt } = await supabase.from('payments').insert({
        student_id: studentId, type: 'event',
        amount_due: eventPrice, amount_paid: paid,
        payment_method: paymentMethod,
        date: new Date().toISOString().split('T')[0],
      }).select().single()
      paymentId = pmt?.id
    }

    await supabase.from('event_enrollments').insert({
      event_id: eventId, student_id: studentId,
      payment_status: paymentStatus, payment_id: paymentId,
    })

    setStudentId(''); setAmountPaid(eventPrice.toString())
    setMsg(L.success); setLoading(false)
    router.refresh()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--txt1)', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', direction: isRtl ? 'rtl' : 'ltr',
    boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'var(--txt2)', marginBottom: 4,
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, direction: isRtl ? 'rtl' : 'ltr',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <UserPlus size={15} color="#d4667a" />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{L.title}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Student select */}
        <div>
          <select value={studentId} onChange={e => setStudentId(e.target.value)} style={inp}>
            <option value="">{L.selectPlaceholder}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {isRtl || !s.name_en ? s.name_ar : s.name_en}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label style={lbl}>{L.amountLabel}</label>
          <input
            type="number" value={amountPaid} min="0"
            onChange={e => setAmountPaid(e.target.value)}
            style={inp}
          />
        </div>

        {/* Payment method */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([{ v: 'cash', l: L.cash }, { v: 'instapay', l: L.instapay }] as const).map(m => (
            <button key={m.v} type="button" onClick={() => setPaymentMethod(m.v)}
              style={{
                padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${paymentMethod === m.v ? '#d4667a' : 'var(--border)'}`,
                background: paymentMethod === m.v ? '#d4667a18' : 'var(--bg-page)',
                color: paymentMethod === m.v ? '#d4667a' : 'var(--txt2)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{m.l}</button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={enroll}
          disabled={!studentId || loading}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
            background: !studentId || loading ? 'var(--bg-page)' : '#d4667a',
            color: !studentId || loading ? 'var(--txt2)' : '#fff',
            fontSize: 13, fontWeight: 700, cursor: !studentId || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: !studentId ? 0.5 : 1,
          }}
        >
          <UserPlus size={14} />
          {loading ? L.enrolling : L.enroll}
        </button>

        {msg && (
          <p style={{ margin: 0, fontSize: 12, color: '#3dab7e', textAlign: 'center', fontWeight: 600 }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  )
}
