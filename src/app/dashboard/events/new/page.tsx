'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const TYPE_COLORS: Record<string, string> = {
  annual_performance: '#d4667a',
  tv_show:            '#4a90d9',
}

const EVENT_TYPES = [
  { value: 'annual_performance', en: 'Annual Performance', ar: 'عرض سنوي' },
  { value: 'tv_show',            en: 'TV Show',            ar: 'عرض تلفزيوني' },
]

const LABELS = {
  en: {
    back: 'Back', title: 'New Event', sub: 'Create a new event',
    name: 'Event Name', namePlaceholder: 'e.g. End of Year Performance',
    type: 'Event Type',
    date: 'Event Date',
    price: 'Registration Fee (EGP)',
    deadline: 'Payment Deadline',
    save: 'Create Event', saving: 'Saving…', cancel: 'Cancel',
    err: {
      name:     'Event name is required',
      date:     'Event date is required',
      price:    'Registration fee is required',
      deadline: 'Payment deadline is required',
    },
  },
  ar: {
    back: 'رجوع', title: 'فعالية جديدة', sub: 'إنشاء فعالية جديدة',
    name: 'اسم الفعالية', namePlaceholder: 'مثال: حفل نهاية العام',
    type: 'نوع الفعالية',
    date: 'تاريخ الفعالية',
    price: 'رسوم التسجيل (جنيه)',
    deadline: 'آخر موعد للدفع',
    save: 'إنشاء الفعالية', saving: 'جارٍ الحفظ…', cancel: 'إلغاء',
    err: {
      name:     'اسم الفعالية مطلوب',
      date:     'تاريخ الفعالية مطلوب',
      price:    'رسوم التسجيل مطلوبة',
      deadline: 'آخر موعد للدفع مطلوب',
    },
  },
}

export default function NewEventPage() {
  const router   = useRouter()
  const locale   = useLocale()
  const isRtl    = locale === 'ar'
  const L        = LABELS[isRtl ? 'ar' : 'en']
  const supabase = createClient()

  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [serverErr, setServerErr] = useState('')
  const [form, setForm] = useState({
    name: '', type: 'annual_performance', date: '', price: '', payment_deadline: '',
  })

  function setField(key: keyof typeof form, value: string) {
    setForm(f => { const n = { ...f, [key]: value }; if (submitted) setErrors(validate(n)); return n })
  }

  function validate(f = form) {
    const e: Record<string, string> = {}
    if (!f.name.trim())         e.name     = L.err.name
    if (!f.date)                e.date     = L.err.date
    if (!f.price)               e.price    = L.err.price
    if (!f.payment_deadline)    e.deadline = L.err.deadline
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true); setServerErr('')
    const { data, error } = await supabase.from('events').insert({
      name:             form.name.trim(),
      type:             form.type,
      date:             form.date,
      price:            parseFloat(form.price),
      payment_deadline: form.payment_deadline,
    }).select().single()

    if (error) { setServerErr(error.message); setLoading(false); return }
    router.push(`/dashboard/events/${data?.id}`)
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const fieldBase = (field: string): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${errors[field] ? '#e04040' : 'var(--border)'}`,
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    direction: isRtl ? 'rtl' : 'ltr', boxSizing: 'border-box',
  })
  const errTxt: React.CSSProperties = { margin: '4px 0 0', color: '#e04040', fontSize: 11 }
  const req: React.CSSProperties    = { color: '#e04040', marginInlineStart: 3 }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 28px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => router.back()} style={{
          background: '#d4667a', border: 'none', borderRadius: 8,
          padding: '7px 16px', color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {L.back}
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div>
          <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{L.sub}</p>
          <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 14, fontWeight: 700 }}>{L.title}</p>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: 28, maxWidth: 620 }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
          }}>

            {/* Event Name */}
            <div>
              <label style={lbl}>{L.name}<span style={req}>*</span></label>
              <input
                value={form.name}
                placeholder={L.namePlaceholder}
                onChange={e => setField('name', e.target.value)}
                style={fieldBase('name')}
              />
              {errors.name && <p style={errTxt}>{errors.name}</p>}
            </div>

            {/* Event Type */}
            <div>
              <label style={lbl}>{L.type}<span style={req}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                {EVENT_TYPES.map(t => {
                  const active = form.type === t.value
                  const color  = TYPE_COLORS[t.value]
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setField('type', t.value)}
                      style={{
                        flex: 1, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        background: active ? color + '18' : 'transparent',
                        border: `1px solid ${active ? color : 'var(--border)'}`,
                        color: active ? color : 'var(--txt2)',
                      }}
                    >
                      {isRtl ? t.ar : t.en}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Event Date + Payment Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>{L.date}<span style={req}>*</span></label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
                  style={fieldBase('date')}
                />
                {errors.date && <p style={errTxt}>{errors.date}</p>}
              </div>
              <div>
                <label style={lbl}>{L.deadline}<span style={req}>*</span></label>
                <input
                  type="date"
                  value={form.payment_deadline}
                  onChange={e => setField('payment_deadline', e.target.value)}
                  style={fieldBase('deadline')}
                />
                {errors.deadline && <p style={errTxt}>{errors.deadline}</p>}
              </div>
            </div>

            {/* Registration Fee */}
            <div>
              <label style={lbl}>{L.price}<span style={req}>*</span></label>
              <input
                type="number"
                min="0"
                value={form.price}
                placeholder="0"
                onChange={e => setField('price', e.target.value)}
                style={{ ...fieldBase('price'), direction: 'ltr' }}
              />
              {errors.price && <p style={errTxt}>{errors.price}</p>}
            </div>

            {/* Server error */}
            {serverErr && (
              <div style={{
                background: '#e0404010', border: '1px solid #e0404030',
                borderRadius: 8, padding: '10px 14px', color: '#e04040', fontSize: 12,
              }}>
                {serverErr}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={loading} style={{
              background: '#d4667a', border: 'none', borderRadius: 10,
              padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, fontFamily: 'inherit',
            }}>
              {loading ? L.saving : L.save}
            </button>
            <button type="button" onClick={() => router.back()} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 24px', color: 'var(--txt2)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {L.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
