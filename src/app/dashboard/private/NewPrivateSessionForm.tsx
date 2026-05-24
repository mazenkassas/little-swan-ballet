'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

const HOURS: { value: string; en: string; ar: string }[] = []
for (let h = 7; h <= 22; h++) {
  const value  = `${String(h).padStart(2, '0')}:00`
  const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h
  const suffix   = h < 12 ? 'AM' : 'PM'
  const suffixAr = h < 12 ? 'ص' : 'م'
  HOURS.push({ value, en: `${h12} ${suffix}`, ar: `${h12} ${suffixAr}` })
}

function computeDuration(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh] = start.split(':').map(Number)
  const [eh] = end.split(':').map(Number)
  return Math.max(0, eh - sh)
}

export default function NewPrivateSessionForm({
  students, coaches, halls, isRtl,
}: {
  students: any[]
  coaches: any[]
  halls: any[]
  isRtl: boolean
}) {
  const supabase = createClient()
  const router   = useRouter()

  const [form, setForm] = useState({
    student_id: '', coach_id: '', hall_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '', end_time: '',
    fee: '', notes: '',
  })
  const [saving,  setSaving]  = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!form.student_id || !form.coach_id || !form.start_time || !form.end_time) return
    setSaving(true)

    const duration = computeDuration(form.start_time, form.end_time)
    const fee      = parseFloat(form.fee) || 0

    const { data: payment } = await supabase.from('payments').insert({
      student_id:     form.student_id,
      type:           'private',
      amount_due:     fee,
      amount_paid:    fee,
      payment_method: 'cash',
      date:           form.date,
      notes:          form.notes || null,
    }).select('id').single()

    await supabase.from('private_sessions').insert({
      student_id:     form.student_id,
      coach_id:       form.coach_id,
      hall_id:        form.hall_id || null,
      date:           form.date,
      start_time:     form.start_time,
      end_time:       form.end_time,
      duration_hours: duration,
      fee,
      payment_method: 'cash',
      payment_id:     payment?.id || null,
      notes:          form.notes || null,
    })

    await supabase.from('coach_attendance').insert({
      coach_id:        form.coach_id,
      hours_worked:    duration,
      location_status: 'valid',
      notes:           `Private — ${form.date}`,
    })

    setForm(f => ({ ...f, student_id: '', coach_id: '', hall_id: '', start_time: '', end_time: '', fee: '', notes: '' }))
    setSubmitted(false)
    setSaving(false)
    router.refresh()
  }

  const err = (field: string) => submitted && !form[field as keyof typeof form]

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const field = (f: string): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${err(f) ? '#e04040' : 'var(--border)'}`,
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    direction: isRtl ? 'rtl' : 'ltr', boxSizing: 'border-box',
  })
  const errTxt: React.CSSProperties = { margin: '4px 0 0', color: '#e04040', fontSize: 11 }
  const req: React.CSSProperties = { color: '#e04040', marginInlineStart: 3 }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20,
    }}>
      <p style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>
        {isRtl ? 'تسجيل جلسة خاصة' : 'Log Private Session'}
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Student */}
        <div>
          <label style={lbl}>{isRtl ? 'الطالبة' : 'Student'}<span style={req}>*</span></label>
          <select required value={form.student_id} onChange={e => setField('student_id', e.target.value)} style={field('student_id')}>
            <option value="">{isRtl ? 'اختر الطالبة' : 'Select student'}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{isRtl ? s.name_ar : (s.name_en || s.name_ar)}</option>
            ))}
          </select>
          {err('student_id') && <p style={errTxt}>{isRtl ? 'الطالبة مطلوبة' : 'Student is required'}</p>}
        </div>

        {/* Coach */}
        <div>
          <label style={lbl}>{isRtl ? 'المدربة' : 'Coach'}<span style={req}>*</span></label>
          <select required value={form.coach_id} onChange={e => setField('coach_id', e.target.value)} style={field('coach_id')}>
            <option value="">{isRtl ? 'اختر المدربة' : 'Select coach'}</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{isRtl ? c.name_ar : (c.name_en || c.name_ar)}</option>
            ))}
          </select>
          {err('coach_id') && <p style={errTxt}>{isRtl ? 'المدربة مطلوبة' : 'Coach is required'}</p>}
        </div>

        {/* Date + Hall */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>{isRtl ? 'التاريخ' : 'Date'}</label>
            <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} style={field('date')} />
          </div>
          <div>
            <label style={lbl}>{isRtl ? 'القاعة' : 'Hall'}</label>
            <select value={form.hall_id} onChange={e => setField('hall_id', e.target.value)} style={field('hall_id')}>
              <option value="">{isRtl ? 'اختر القاعة' : 'Select hall'}</option>
              {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        </div>

        {/* Start Time + End Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>{isRtl ? 'وقت البداية' : 'Start Time'}<span style={req}>*</span></label>
            <select value={form.start_time} onChange={e => setField('start_time', e.target.value)} style={field('start_time')}>
              <option value="">{isRtl ? 'اختر الساعة' : 'Select hour'}</option>
              {HOURS.map(h => <option key={h.value} value={h.value}>{isRtl ? h.ar : h.en}</option>)}
            </select>
            {err('start_time') && <p style={errTxt}>{isRtl ? 'وقت البداية مطلوب' : 'Start time is required'}</p>}
          </div>
          <div>
            <label style={lbl}>{isRtl ? 'وقت النهاية' : 'End Time'}<span style={req}>*</span></label>
            <select value={form.end_time} onChange={e => setField('end_time', e.target.value)} style={field('end_time')}>
              <option value="">{isRtl ? 'اختر الساعة' : 'Select hour'}</option>
              {HOURS.map(h => <option key={h.value} value={h.value}>{isRtl ? h.ar : h.en}</option>)}
            </select>
            {err('end_time') && <p style={errTxt}>{isRtl ? 'وقت النهاية مطلوب' : 'End time is required'}</p>}
          </div>
        </div>

        {/* Duration hint */}
        {form.start_time && form.end_time && computeDuration(form.start_time, form.end_time) > 0 && (
          <p style={{ margin: '-6px 0 0', fontSize: 11, color: '#d4667a', fontWeight: 600 }}>
            ⏱ {computeDuration(form.start_time, form.end_time)} {isRtl ? 'ساعة' : 'hr'}
          </p>
        )}

        {/* Fee */}
        <div>
          <label style={lbl}>{isRtl ? 'السعر (جنيه)' : 'Fee (EGP)'}</label>
          <input
            type="number" min="0"
            value={form.fee} placeholder="0"
            onChange={e => setField('fee', e.target.value)}
            style={{ ...field('fee'), direction: 'ltr' }}
          />
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

        <button type="submit" disabled={saving} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: '#d4667a', border: 'none', borderRadius: 10,
          padding: '11px 0', width: '100%', color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1, fontFamily: 'inherit', marginTop: 2,
        }}>
          <Save size={14} />
          {saving ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'حفظ الجلسة' : 'Save Session')}
        </button>
      </form>
    </div>
  )
}
