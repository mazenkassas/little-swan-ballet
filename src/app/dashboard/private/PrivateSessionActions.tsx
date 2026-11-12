'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Save } from 'lucide-react'

const HOURS: { value: string; en: string; ar: string }[] = []
for (let h = 7; h <= 22; h++) {
  const value    = `${String(h).padStart(2, '0')}:00`
  const h12      = h > 12 ? h - 12 : h === 0 ? 12 : h
  const suffix   = h < 12 ? 'AM' : 'PM'
  const suffixAr = h < 12 ? 'ص' : 'م'
  HOURS.push({ value, en: `${h12} ${suffix}`, ar: `${h12} ${suffixAr}` })
  // Half-hour slot (the list ends at 10 PM)
  if (h < 22) HOURS.push({ value: `${String(h).padStart(2, '0')}:30`, en: `${h12}:30 ${suffix}`, ar: `${h12}:30 ${suffixAr}` })
}

function hhmm(time: string | null | undefined): string {
  return time ? String(time).slice(0, 5) : ''
}

function computeDuration(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm = 0] = start.split(':').map(Number)
  const [eh, em = 0] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
}

export default function PrivateSessionActions({
  session, students, coaches, halls, isRtl,
}: {
  session: any
  students: any[]
  coaches: any[]
  halls: any[]
  isRtl: boolean
}) {
  const supabase = createClient()
  const router   = useRouter()

  const [mode,   setMode]   = useState<null | 'edit' | 'delete'>(null)
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState(initialForm())

  function initialForm() {
    return {
      student_id: session.student_id || '',
      coach_id:   session.coach_id   || '',
      hall_id:    session.hall_id    || '',
      date:       session.date       || '',
      start_time: hhmm(session.start_time),
      end_time:   hhmm(session.end_time),
      fee:        session.fee != null ? String(Number(session.fee)) : '',
      payment_method: session.payment_method === 'instapay' ? 'instapay' : 'cash',
      notes:      session.notes || '',
    }
  }

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function openEdit() {
    setForm(initialForm())
    setSubmitted(false)
    setError('')
    setMode('edit')
  }

  function openDelete() {
    setError('')
    setMode('delete')
  }

  function close() {
    if (!busy) setMode(null)
  }

  const personName = (p: any) => (p ? (isRtl ? p.name_ar : (p.name_en || p.name_ar)) : '—')
  const notPermitted = isRtl
    ? 'تعذر تنفيذ العملية. قد لا تملك الصلاحية.'
    : 'The change could not be applied. You may not have permission.'

  // The coach-hours row created together with this session (matched by its note)
  async function findCoachHoursRowId(): Promise<string | undefined> {
    const { data } = await supabase
      .from('coach_attendance')
      .select('id')
      .eq('coach_id', session.coach_id)
      .eq('notes', `Private — ${session.date}`)
      .limit(1)
    return data?.[0]?.id
  }

  const duration   = computeDuration(form.start_time, form.end_time)
  const timeError  = !!form.start_time && !!form.end_time && duration <= 0

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setError('')
    if (!form.student_id || !form.coach_id || !form.date || !form.start_time || !form.end_time || timeError) return
    setBusy(true)

    const fee = parseFloat(form.fee) || 0

    const { data: updated, error: updErr } = await supabase
      .from('private_sessions')
      .update({
        student_id:     form.student_id,
        coach_id:       form.coach_id,
        hall_id:        form.hall_id || null,
        date:           form.date,
        start_time:     form.start_time,
        end_time:       form.end_time,
        duration_hours: duration,
        fee,
        payment_method: form.payment_method,
        notes:          form.notes || null,
      })
      .eq('id', session.id)
      .select('id')

    if (updErr || !updated?.length) {
      setError(updErr?.message || notPermitted)
      setBusy(false)
      return
    }

    // Keep the linked payment in step with the session
    const paymentFields = {
      student_id:     form.student_id,
      amount_due:     fee,
      amount_paid:    fee,
      payment_method: form.payment_method,
      date:           form.date,
      notes:          form.notes || null,
    }
    if (session.payment_id) {
      await supabase.from('payments').update(paymentFields).eq('id', session.payment_id)
    } else {
      // Older sessions were saved without a payment — create it now so the
      // session counts in revenue
      const { data: payment } = await supabase.from('payments')
        .insert({ ...paymentFields, type: 'private' }).select('id').single()
      if (payment) {
        await supabase.from('private_sessions').update({ payment_id: payment.id }).eq('id', session.id)
      }
    }

    // Keep the coach's logged hours in step with the session
    const coachRowId = await findCoachHoursRowId()
    if (coachRowId) {
      await supabase.from('coach_attendance').update({
        coach_id:     form.coach_id,
        hours_worked: duration,
        notes:        `Private — ${form.date}`,
      }).eq('id', coachRowId)
    }

    setBusy(false)
    setMode(null)
    router.refresh()
  }

  async function handleDelete() {
    setBusy(true)
    setError('')

    const coachRowId = await findCoachHoursRowId()

    const { data: deleted, error: delErr } = await supabase
      .from('private_sessions')
      .delete()
      .eq('id', session.id)
      .select('id')

    if (delErr || !deleted?.length) {
      setError(delErr?.message || notPermitted)
      setBusy(false)
      return
    }

    // Remove the payment and the coach hours that were logged with this session
    if (session.payment_id) await supabase.from('payments').delete().eq('id', session.payment_id)
    if (coachRowId)         await supabase.from('coach_attendance').delete().eq('id', coachRowId)

    setBusy(false)
    setMode(null)
    router.refresh()
  }

  const REQUIRED: (keyof typeof form)[] = ['student_id', 'coach_id', 'date', 'start_time', 'end_time']
  const err = (f: keyof typeof form) => submitted && REQUIRED.includes(f) && !form[f]

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const field = (f: keyof typeof form, forceErr = false): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${err(f) || forceErr ? '#e04040' : 'var(--border)'}`,
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    direction: isRtl ? 'rtl' : 'ltr', boxSizing: 'border-box',
  })
  const errTxt: React.CSSProperties = { margin: '4px 0 0', color: '#e04040', fontSize: 11 }
  const req: React.CSSProperties = { color: '#e04040', marginInlineStart: 3 }
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }
  const cancelBtn: React.CSSProperties = {
    background: 'var(--bg-page)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '9px 20px', color: 'var(--txt2)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
  const errorBox = error ? (
    <div style={{ background: '#e0404010', border: '1px solid #e0404030', borderRadius: 8, padding: '9px 12px', color: '#e04040', fontSize: 12 }}>
      ⚠ {error}
    </div>
  ) : null

  // Options for the current values even if they are no longer in the active lists
  const studentMissing = !!form.student_id && !students.some(s => s.id === form.student_id)
  const coachMissing   = !!form.coach_id   && !coaches.some(c => c.id === form.coach_id)
  const timeOptions = (current: string) => {
    const list = HOURS.map(h => ({ value: h.value, label: isRtl ? h.ar : h.en }))
    if (current && !list.some(o => o.value === current)) list.push({ value: current, label: current })
    return list.sort((a, b) => a.value.localeCompare(b.value))
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={openEdit}
          style={{
            background: '#4a90d912', color: '#4a90d9', border: '1px solid #4a90d928',
            borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}
        >
          <Pencil size={12} />
          {isRtl ? 'تعديل' : 'Edit'}
        </button>
        <button
          onClick={openDelete}
          style={{
            background: '#e0404012', color: '#e04040', border: '1px solid #e0404028',
            borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}
        >
          <Trash2 size={12} />
          {isRtl ? 'حذف' : 'Delete'}
        </button>
      </div>

      {/* ── Edit modal ── */}
      {mode === 'edit' && (
        <div onClick={e => { if (e.target === e.currentTarget) close() }} style={overlay}>
          <div style={{
            background: 'var(--bg-popup)', border: '1px solid var(--border)',
            borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left',
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--txt1)' }}>
                {isRtl ? 'تعديل الجلسة الخاصة' : 'Edit Private Session'}
              </p>
            </div>

            <form onSubmit={handleSave} noValidate style={{ padding: '18px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Student */}
              <div>
                <label style={lbl}>{isRtl ? 'الطالبة' : 'Student'}<span style={req}>*</span></label>
                <select value={form.student_id} onChange={e => setField('student_id', e.target.value)} style={field('student_id')}>
                  <option value="">{isRtl ? 'اختر الطالبة' : 'Select student'}</option>
                  {studentMissing && <option value={form.student_id}>{personName(session.student)}</option>}
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{personName(s)}</option>
                  ))}
                </select>
                {err('student_id') && <p style={errTxt}>{isRtl ? 'الطالبة مطلوبة' : 'Student is required'}</p>}
              </div>

              {/* Coach */}
              <div>
                <label style={lbl}>{isRtl ? 'المدربة' : 'Coach'}<span style={req}>*</span></label>
                <select value={form.coach_id} onChange={e => setField('coach_id', e.target.value)} style={field('coach_id')}>
                  <option value="">{isRtl ? 'اختر المدربة' : 'Select coach'}</option>
                  {coachMissing && <option value={form.coach_id}>{personName(session.coach)}</option>}
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>{personName(c)}</option>
                  ))}
                </select>
                {err('coach_id') && <p style={errTxt}>{isRtl ? 'المدربة مطلوبة' : 'Coach is required'}</p>}
              </div>

              {/* Date + Hall */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>{isRtl ? 'التاريخ' : 'Date'}<span style={req}>*</span></label>
                  <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} style={field('date')} />
                  {err('date') && <p style={errTxt}>{isRtl ? 'التاريخ مطلوب' : 'Date is required'}</p>}
                </div>
                <div>
                  <label style={lbl}>{isRtl ? 'القاعة' : 'Hall'}</label>
                  <select value={form.hall_id} onChange={e => setField('hall_id', e.target.value)} style={field('hall_id')}>
                    <option value="">{isRtl ? 'اختر القاعة' : 'Select hall'}</option>
                    {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Start + End */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>{isRtl ? 'وقت البداية' : 'Start Time'}<span style={req}>*</span></label>
                  <select value={form.start_time} onChange={e => setField('start_time', e.target.value)} style={field('start_time')}>
                    <option value="">{isRtl ? 'اختر الساعة' : 'Select hour'}</option>
                    {timeOptions(form.start_time).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {err('start_time') && <p style={errTxt}>{isRtl ? 'وقت البداية مطلوب' : 'Start time is required'}</p>}
                </div>
                <div>
                  <label style={lbl}>{isRtl ? 'وقت النهاية' : 'End Time'}<span style={req}>*</span></label>
                  <select value={form.end_time} onChange={e => setField('end_time', e.target.value)} style={field('end_time', timeError)}>
                    <option value="">{isRtl ? 'اختر الساعة' : 'Select hour'}</option>
                    {timeOptions(form.end_time).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {err('end_time') && <p style={errTxt}>{isRtl ? 'وقت النهاية مطلوب' : 'End time is required'}</p>}
                  {timeError && <p style={errTxt}>{isRtl ? 'يجب أن يكون وقت النهاية بعد وقت البداية' : 'End time must be after start time'}</p>}
                </div>
              </div>

              {duration > 0 && (
                <p style={{ margin: '-6px 0 0', fontSize: 11, color: '#d4667a', fontWeight: 600 }}>
                  ⏱ {duration} {isRtl ? 'ساعة' : 'hr'}
                </p>
              )}

              {/* Fee + Payment type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>{isRtl ? 'السعر (جنيه)' : 'Fee (EGP)'}</label>
                  <input
                    type="number" min="0"
                    value={form.fee} placeholder="0"
                    onChange={e => setField('fee', e.target.value)}
                    style={{ ...field('notes'), direction: 'ltr' }}
                  />
                </div>
                <div>
                  <label style={lbl}>{isRtl ? 'طريقة الدفع' : 'Payment Type'}</label>
                  <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)} style={field('notes')}>
                    <option value="cash">{isRtl ? 'كاش' : 'Cash'}</option>
                    <option value="instapay">{isRtl ? 'إنستاباي' : 'InstaPay'}</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={lbl}>{isRtl ? 'ملاحظات' : 'Notes'}</label>
                <input
                  value={form.notes}
                  placeholder={isRtl ? 'اختياري…' : 'Optional…'}
                  onChange={e => setField('notes', e.target.value)}
                  style={field('notes')}
                />
              </div>

              {errorBox}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                <button type="button" onClick={close} disabled={busy} style={cancelBtn}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={busy} style={{
                  background: '#d4667a', border: 'none', borderRadius: 10,
                  padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <Save size={13} />
                  {busy ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'حفظ التعديلات' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {mode === 'delete' && (
        <div onClick={e => { if (e.target === e.currentTarget) close() }} style={overlay}>
          <div style={{
            background: 'var(--bg-popup)', border: '1px solid var(--border)',
            borderRadius: 16, width: '100%', maxWidth: 400,
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, marginBottom: 12,
                background: '#e0404015', border: '1px solid #e0404030',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={18} color="#e04040" />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--txt1)' }}>
                {isRtl ? 'حذف الجلسة الخاصة' : 'Delete Private Session'}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5 }}>
                {isRtl
                  ? <>هل أنت متأكد من حذف جلسة <strong style={{ color: 'var(--txt1)' }}>{personName(session.student)}</strong> بتاريخ {session.date}؟ سيتم حذف الدفعة المرتبطة بها أيضاً. لا يمكن التراجع عن هذا الإجراء.</>
                  : <>Are you sure you want to delete the session for <strong style={{ color: 'var(--txt1)' }}>{personName(session.student)}</strong> on {session.date}? Its payment will be deleted too. This action cannot be undone.</>
                }
              </p>
            </div>

            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {errorBox}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={close} disabled={busy} style={cancelBtn}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  style={{
                    background: '#e04040', border: 'none', borderRadius: 10,
                    padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Trash2 size={13} />
                  {busy ? (isRtl ? 'جارٍ الحذف…' : 'Deleting…') : (isRtl ? 'تأكيد الحذف' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
