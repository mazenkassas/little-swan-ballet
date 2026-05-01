'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

const LABELS = {
  en: {
    title:    'Log Private Session',
    student:  'Student', studentDef: 'Select student',
    coach:    'Coach',   coachDef:   'Select coach',
    date:     'Date',
    duration: 'Duration',
    fee:      'Fee (EGP)',
    method:   'Payment Method',
    notes:    'Notes', notesPlaceholder: 'Optional…',
    cash:     'Cash', instapay: 'Instapay',
    save:     'Save Session', saving: 'Saving…',
  },
  ar: {
    title:    'تسجيل جلسة خاصة',
    student:  'الطالبة', studentDef: 'اختر الطالبة',
    coach:    'المدربة', coachDef:   'اختر المدربة',
    date:     'التاريخ',
    duration: 'المدة',
    fee:      'السعر (جنيه)',
    method:   'طريقة الدفع',
    notes:    'ملاحظات', notesPlaceholder: 'اختياري…',
    cash:     'كاش', instapay: 'إنستاباي',
    save:     'حفظ الجلسة', saving: 'جارٍ الحفظ…',
  },
}

const DURATIONS = ['0.5', '1', '1.5', '2', '2.5', '3']

export default function NewPrivateSessionForm({
  students, coaches, isRtl,
}: {
  students: any[]
  coaches: any[]
  isRtl: boolean
}) {
  const L       = LABELS[isRtl ? 'ar' : 'en']
  const supabase = createClient()
  const router   = useRouter()

  const [form, setForm] = useState({
    student_id: '', coach_id: '',
    date: new Date().toISOString().split('T')[0],
    duration_hours: '1', fee: '', notes: '', payment_method: 'cash',
  })
  const [saving, setSaving] = useState(false)

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: payment } = await supabase.from('payments').insert({
      student_id:     form.student_id,
      type:           'private',
      amount_due:     parseFloat(form.fee),
      amount_paid:    parseFloat(form.fee),
      payment_method: form.payment_method,
      date:           form.date,
      notes:          form.notes || null,
    }).select().single()

    await supabase.from('private_sessions').insert({
      student_id:     form.student_id,
      coach_id:       form.coach_id,
      date:           form.date,
      duration_hours: parseFloat(form.duration_hours),
      fee:            parseFloat(form.fee),
      payment_id:     payment?.id || null,
      notes:          form.notes || null,
    })

    await supabase.from('coach_attendance').insert({
      coach_id:        form.coach_id,
      hours_worked:    parseFloat(form.duration_hours),
      location_status: 'valid',
      notes:           `Private — ${form.date}`,
    })

    setForm(f => ({ ...f, student_id: '', coach_id: '', fee: '', notes: '' }))
    setSaving(false)
    router.refresh()
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const field: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    direction: isRtl ? 'rtl' : 'ltr', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20,
    }}>
      <p style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{L.title}</p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Student */}
        <div>
          <label style={lbl}>{L.student}</label>
          <select required value={form.student_id} onChange={e => setField('student_id', e.target.value)} style={field}>
            <option value="">{L.studentDef}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {isRtl ? s.name_ar : (s.name_en || s.name_ar)}
              </option>
            ))}
          </select>
        </div>

        {/* Coach */}
        <div>
          <label style={lbl}>{L.coach}</label>
          <select required value={form.coach_id} onChange={e => setField('coach_id', e.target.value)} style={field}>
            <option value="">{L.coachDef}</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {isRtl ? c.name_ar : (c.name_en || c.name_ar)}
              </option>
            ))}
          </select>
        </div>

        {/* Date + Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>{L.date}</label>
            <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} style={field} />
          </div>
          <div>
            <label style={lbl}>{L.duration}</label>
            <select value={form.duration_hours} onChange={e => setField('duration_hours', e.target.value)} style={field}>
              {DURATIONS.map(h => (
                <option key={h} value={h}>{h} {isRtl ? 'ساعة' : 'hr'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fee + Method */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>{L.fee}</label>
            <input
              required type="number" min="0"
              value={form.fee} placeholder="0"
              onChange={e => setField('fee', e.target.value)}
              style={{ ...field, direction: 'ltr' }}
            />
          </div>
          <div>
            <label style={lbl}>{L.method}</label>
            <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)} style={field}>
              <option value="cash">{L.cash}</option>
              <option value="instapay">{L.instapay}</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={lbl}>{L.notes}</label>
          <input
            value={form.notes}
            placeholder={L.notesPlaceholder}
            onChange={e => setField('notes', e.target.value)}
            style={field}
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={saving} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: '#d4667a', border: 'none', borderRadius: 10,
          padding: '11px 0', width: '100%', color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1, fontFamily: 'inherit', marginTop: 2,
        }}>
          <Save size={14} />
          {saving ? L.saving : L.save}
        </button>
      </form>
    </div>
  )
}
