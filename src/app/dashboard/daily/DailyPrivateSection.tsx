'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Star, Clock, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Coach   = { id: string; name_ar: string; name_en?: string | null }
type Student = { id: string; name_ar: string; name_en?: string | null }
type Session = {
  id: string
  payment_id: string | null
  start_time: string | null
  end_time: string | null
  duration_hours: number | null
  fee: number
  payment_method: string | null
  attendance_status: string | null
  coach:   { name_ar: string; name_en?: string | null } | null
  student: { name_ar: string; name_en?: string | null } | null
}

const HOURS: { value: string; en: string; ar: string }[] = []
for (let h = 7; h <= 22; h++) {
  const value    = `${String(h).padStart(2, '0')}:00`
  const h12      = h > 12 ? h - 12 : h === 0 ? 12 : h
  const suffix   = h < 12 ? 'AM' : 'PM'
  const suffixAr = h < 12 ? 'ص' : 'م'
  HOURS.push({ value, en: `${h12} ${suffix}`, ar: `${h12} ${suffixAr}` })
}

function fmt12(time: string | null) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  const h12    = h % 12 || 12
  const suffix = h < 12 ? 'AM' : 'PM'
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function computeDuration(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh] = start.split(':').map(Number)
  const [eh] = end.split(':').map(Number)
  return Math.max(0, eh - sh)
}

const EMPTY_FORM = { coach_id: '', student_id: '', start_time: '', end_time: '', fee: '', payment_method: 'cash' }

export default function DailyPrivateSection({
  coaches, students, sessions, date, locale,
}: {
  coaches: Coach[]
  students: Student[]
  sessions: Session[]
  date: string
  locale: string
}) {
  const supabase = createClient()
  const router   = useRouter()
  const isRtl    = locale === 'ar'

  const [attendance, setAttendance] = useState<Record<string, string | null>>(
    Object.fromEntries(sessions.map(s => [s.id, s.attendance_status]))
  )
  const [methods,    setMethods]    = useState<Record<string, string>>(
    Object.fromEntries(sessions.map(s => [s.id, s.payment_method || 'cash']))
  )
  const [markingId,  setMarkingId]  = useState<string | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState({ ...EMPTY_FORM })
  const [saving,     setSaving]     = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  function sName(s: { name_ar: string; name_en?: string | null } | null) {
    if (!s) return '—'
    return locale === 'en' && s.name_en ? s.name_en : s.name_ar
  }

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function saveSession() {
    setSubmitted(true)
    if (!form.coach_id || !form.student_id || !form.start_time || !form.end_time) return
    setSaving(true)
    const duration = computeDuration(form.start_time, form.end_time)
    const fee      = parseFloat(form.fee) || 0
    await supabase.from('private_sessions').insert({
      student_id: form.student_id, coach_id: form.coach_id,
      date, start_time: form.start_time, end_time: form.end_time,
      duration_hours: duration, fee, payment_method: form.payment_method,
    })
    await supabase.from('coach_attendance').insert({
      coach_id: form.coach_id, hours_worked: duration,
      location_status: 'valid', notes: `Private — ${date}`,
    })
    setForm({ ...EMPTY_FORM })
    setSubmitted(false)
    setShowForm(false)
    setSaving(false)
    router.refresh()
  }

  async function updateMethod(sessionId: string, paymentId: string | null, method: string) {
    setMethods(m => ({ ...m, [sessionId]: method }))
    await supabase.from('private_sessions').update({ payment_method: method }).eq('id', sessionId)
    if (paymentId) {
      await supabase.from('payments').update({ payment_method: method }).eq('id', paymentId)
    }
  }

  async function markAttendance(sessionId: string, status: string) {
    const next = attendance[sessionId] === status ? null : status
    setMarkingId(sessionId)
    setAttendance(a => ({ ...a, [sessionId]: next }))
    await supabase.from('private_sessions').update({ attendance_status: next }).eq('id', sessionId)
    setMarkingId(null)
  }

  const methodTotals = sessions.reduce((acc, s) => {
    const m = methods[s.id] || 'cash'
    acc[m] = (acc[m] || 0) + (s.fee || 0)
    return acc
  }, {} as Record<string, number>)
  const totalFee = sessions.reduce((s, p) => s + (p.fee || 0), 0)

  const sel: React.CSSProperties = {
    width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--txt1)',
    outline: 'none', fontFamily: 'inherit',
  }
  const errSel = (field: string): React.CSSProperties => ({
    ...sel, border: `1px solid ${submitted && !form[field as keyof typeof form] ? '#e04040' : 'var(--border)'}`,
  })
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 5,
  }

  const methodPill = (m: string): React.CSSProperties => ({
    background: m === 'instapay' ? '#4a90d918' : '#3dab7e18',
    color:      m === 'instapay' ? '#4a90d9'   : '#3dab7e',
    border: `1px solid ${m === 'instapay' ? '#4a90d930' : '#3dab7e30'}`,
    borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600,
    outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
    appearance: 'none' as any, WebkitAppearance: 'none' as any,
  })

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid #d4667a22', borderRadius: 14, overflow: 'hidden' }}>

      {/* ── Section header ──────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #d4667a20', background: '#d4667a08',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#d4667a18', border: '1px solid #d4667a28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={14} color="#d4667a" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#d4667a' }}>
              {isRtl ? 'البرايفيت' : 'Private Sessions'}
            </p>
            {totalFee > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                {methodTotals['cash']     > 0 && <span style={{ fontSize: 10, color: '#3dab7e', fontWeight: 600 }}>{isRtl ? 'كاش' : 'Cash'}: {formatCurrency(methodTotals['cash'])}</span>}
                {methodTotals['instapay'] > 0 && <span style={{ fontSize: 10, color: '#4a90d9', fontWeight: 600 }}>Instapay: {formatCurrency(methodTotals['instapay'])}</span>}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {sessions.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#d4667a', background: '#d4667a18', border: '1px solid #d4667a28', borderRadius: 20, padding: '2px 10px' }}>
              {sessions.length}
            </span>
          )}
          {totalFee > 0 && (
            <span style={{ fontSize: 14, fontWeight: 800, color: '#3dab7e', marginInlineEnd: 4 }}>{formatCurrency(totalFee)}</span>
          )}
          <button
            onClick={() => { setShowForm(v => !v); setForm({ ...EMPTY_FORM }); setSubmitted(false) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: showForm ? 'var(--bg-page)' : '#d4667a',
              color: showForm ? 'var(--txt2)' : '#fff',
              border: showForm ? '1px solid var(--border)' : 'none',
              borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {isRtl ? 'إضافة جلسة' : 'Add Session'}
          </button>
        </div>
      </div>

      {/* ── Sessions grid ───────────────────────────────────────────── */}
      {sessions.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--txt2)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
            {isRtl ? 'لا توجد جلسات برايفيت اليوم' : 'No private sessions today'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11 }}>
            {isRtl ? 'اضغط "إضافة جلسة" لتسجيل جلسة' : 'Click "Add Session" to log one'}
          </p>
        </div>
      ) : sessions.length > 0 ? (
        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {sessions.map(s => {
            const att       = attendance[s.id]
            const method    = methods[s.id] || 'cash'
            const isMarking = markingId === s.id
            const initial   = (sName(s.student) || '').charAt(0)
            const timeRange = s.start_time && s.end_time
              ? `${fmt12(s.start_time)} – ${fmt12(s.end_time)}`
              : s.duration_hours ? `${s.duration_hours}${isRtl ? 'س' : 'h'}` : null
            const accent = att === 'present' ? '#3dab7e' : att === 'absent' ? '#e04040' : '#d4667a'

            return (
              <div key={s.id} style={{
                background: 'var(--bg-page)', border: `1px solid ${accent}25`,
                borderRadius: 12, overflow: 'hidden',
                borderTop: `3px solid ${accent}`,
              }}>
                {/* Card body */}
                <div style={{ padding: '12px 14px' }}>
                  {/* Student row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: '#d4667a15', border: '1px solid #d4667a25',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, color: '#d4667a',
                    }}>
                      {initial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sName(s.student)}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
                        {sName(s.coach)}
                      </p>
                    </div>
                    {timeRange && (
                      <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <Clock size={10} color="var(--txt2)" />
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt2)', whiteSpace: 'nowrap' }}>{timeRange}</span>
                      </div>
                    )}
                  </div>

                  {/* Fee + method row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#3dab7e' }}>
                      {s.fee > 0 ? formatCurrency(s.fee) : <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 400 }}>—</span>}
                    </span>
                    <select
                      value={method}
                      onChange={e => updateMethod(s.id, s.payment_id, e.target.value)}
                      style={methodPill(method)}
                    >
                      <option value="cash">{isRtl ? 'كاش' : 'Cash'}</option>
                      <option value="instapay">{isRtl ? 'إنستاباي' : 'Instapay'}</option>
                    </select>
                  </div>

                  {/* Attendance buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([
                      { val: 'present', label: isRtl ? '✓ حضرت' : '✓ Present', on: '#3dab7e' },
                      { val: 'absent',  label: isRtl ? '✗ غابت'  : '✗ Absent',  on: '#e04040' },
                    ] as const).map(btn => (
                      <button
                        key={btn.val}
                        onClick={() => markAttendance(s.id, btn.val)}
                        disabled={isMarking}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: att === btn.val ? btn.on : 'transparent',
                          color:      att === btn.val ? '#fff'  : 'var(--txt2)',
                          border: `1.5px solid ${att === btn.val ? btn.on : 'var(--border)'}`,
                          cursor: isMarking ? 'not-allowed' : 'pointer',
                          opacity: isMarking ? 0.5 : 1, fontFamily: 'inherit', transition: 'all 0.12s',
                        }}
                      >{btn.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* ── Add Session form ─────────────────────────────────────────── */}
      {showForm && (
        <div style={{
          padding: '16px', borderTop: sessions.length > 0 ? '1px solid var(--border)' : undefined,
          background: '#d4667a06',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid #d4667a25',
            borderRadius: 12, padding: '16px',
          }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#d4667a' }}>
              {isRtl ? 'تسجيل جلسة جديدة' : 'Log New Session'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>{isRtl ? 'الطالبة' : 'Student'} *</label>
                <select value={form.student_id} onChange={e => setField('student_id', e.target.value)} style={errSel('student_id')}>
                  <option value="">{isRtl ? '— اختر —' : '— select —'}</option>
                  {students.map(s => <option key={s.id} value={s.id}>{sName(s)}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{isRtl ? 'المدربة' : 'Coach'} *</label>
                <select value={form.coach_id} onChange={e => setField('coach_id', e.target.value)} style={errSel('coach_id')}>
                  <option value="">{isRtl ? '— اختر —' : '— select —'}</option>
                  {coaches.map(c => <option key={c.id} value={c.id}>{sName(c)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{isRtl ? 'وقت البداية' : 'Start Time'} *</label>
                <select value={form.start_time} onChange={e => setField('start_time', e.target.value)} style={errSel('start_time')}>
                  <option value="">{isRtl ? 'اختر' : 'Select'}</option>
                  {HOURS.map(h => <option key={h.value} value={h.value}>{isRtl ? h.ar : h.en}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{isRtl ? 'وقت النهاية' : 'End Time'} *</label>
                <select value={form.end_time} onChange={e => setField('end_time', e.target.value)} style={errSel('end_time')}>
                  <option value="">{isRtl ? 'اختر' : 'Select'}</option>
                  {HOURS.map(h => <option key={h.value} value={h.value}>{isRtl ? h.ar : h.en}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{isRtl ? 'السعر' : 'Fee (EGP)'}</label>
                <input
                  type="number" min="0" value={form.fee} placeholder="0"
                  onChange={e => setField('fee', e.target.value)}
                  style={{ ...sel, direction: 'ltr' }}
                />
              </div>
              <div>
                <label style={lbl}>{isRtl ? 'طريقة الدفع' : 'Method'}</label>
                <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)} style={sel}>
                  <option value="cash">{isRtl ? 'كاش' : 'Cash'}</option>
                  <option value="instapay">{isRtl ? 'إنستاباي' : 'Instapay'}</option>
                </select>
              </div>
            </div>

            {form.start_time && form.end_time && computeDuration(form.start_time, form.end_time) > 0 && (
              <p style={{ margin: '-6px 0 10px', fontSize: 11, color: '#d4667a', fontWeight: 600 }}>
                ⏱ {computeDuration(form.start_time, form.end_time)} {isRtl ? 'ساعة' : 'hr'}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={saveSession}
                disabled={saving}
                style={{
                  background: '#d4667a', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 24px', fontSize: 12, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
                }}
              >
                {saving ? '…' : (isRtl ? 'حفظ' : 'Save')}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setSubmitted(false) }}
                style={{
                  background: 'var(--bg-page)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', color: 'var(--txt2)', fontFamily: 'inherit',
                }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
