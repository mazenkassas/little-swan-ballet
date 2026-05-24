'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateEvent } from '../../actions'

const TYPE_COLORS: Record<string, string> = {
  recital:     '#d4667a',
  tv_show:     '#4a90d9',
  workshop:    '#8e5fd9',
  competition: '#e8960a',
}

const EVENT_TYPES = [
  { value: 'recital',     en: 'Recital',     ar: 'عرض' },
  { value: 'tv_show',     en: 'TV Show',     ar: 'تلفزيون' },
  { value: 'workshop',    en: 'Workshop',    ar: 'ورشة' },
  { value: 'competition', en: 'Competition', ar: 'مسابقة' },
]

const LABELS = {
  en: {
    back: 'Back', title: 'Edit Event', sub: 'Update the event details',
    name: 'Event Name', type: 'Event Type',
    date: 'Event Date', deadline: 'Payment Deadline',
    price: 'Registration Fee (EGP)', venue: 'Venue (optional)',
    save: 'Save Changes', saving: 'Saving…', cancel: 'Cancel',
    err: {
      name:     'Event name is required',
      date:     'Event date is required',
      date_past: 'Event date cannot be in the past',
      price:    'Registration fee is required',
      deadline: 'Payment deadline is required',
      deadline_after: 'Payment deadline must be on or before the event date',
    },
  },
  ar: {
    back: 'رجوع', title: 'تعديل الفعالية', sub: 'تحديث بيانات الفعالية',
    name: 'اسم الفعالية', type: 'نوع الفعالية',
    date: 'تاريخ الفعالية', deadline: 'آخر موعد للدفع',
    price: 'رسوم التسجيل (جنيه)', venue: 'المكان (اختياري)',
    save: 'حفظ التعديلات', saving: 'جارٍ الحفظ…', cancel: 'إلغاء',
    err: {
      name:     'اسم الفعالية مطلوب',
      date:     'تاريخ الفعالية مطلوب',
      date_past: 'لا يمكن أن يكون تاريخ الفعالية في الماضي',
      price:    'رسوم التسجيل مطلوبة',
      deadline: 'آخر موعد للدفع مطلوب',
      deadline_after: 'يجب أن يكون آخر موعد للدفع قبل تاريخ الفعالية أو في نفسه',
    },
  },
}

interface Props { event: any; isRtl: boolean }

export default function EditEventForm({ event, isRtl }: Props) {
  const router = useRouter()
  const L      = LABELS[isRtl ? 'ar' : 'en']
  const today  = new Date().toISOString().split('T')[0]

  const [loading,   setLoading]   = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  const [form, setFormState] = useState({
    name:             event.name     ?? '',
    type:             event.type     ?? 'recital',
    date:             event.date     ?? '',
    price:            event.price    != null ? String(event.price) : '',
    payment_deadline: event.payment_deadline ?? '',
    venue:            event.venue    ?? '',
  })

  function validate(f = form) {
    const e: Record<string, string> = {}
    if (!f.name.trim())          e.name     = L.err.name
    if (!f.date)                 e.date     = L.err.date
    else if (f.date < today)     e.date     = L.err.date_past
    if (!f.price)                e.price    = L.err.price
    if (!f.payment_deadline)     e.deadline = L.err.deadline
    else if (f.payment_deadline > f.date && f.date) e.deadline = L.err.deadline_after
    return e
  }

  function setField(key: keyof typeof form, value: string) {
    const next = { ...form, [key]: value }
    setFormState(next)
    if (submitted) setErrors(validate(next))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true); setServerErr('')
    const r = await updateEvent(event.id, {
      name:             form.name.trim(),
      type:             form.type,
      date:             form.date,
      price:            parseFloat(form.price),
      payment_deadline: form.payment_deadline,
      venue:            form.venue.trim() || undefined,
    })

    if (r.error) { setServerErr(r.error); setLoading(false); return }
    router.push(`/dashboard/events/${event.id}`)
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const fieldBase = (field: string): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${errors[field] ? '#e04040' : 'var(--border)'}`,
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    direction: isRtl ? 'rtl' : 'ltr', boxSizing: 'border-box' as const,
  })
  const errTxt: React.CSSProperties = { margin: '4px 0 0', color: '#e04040', fontSize: 11 }
  const req: React.CSSProperties    = { color: '#e04040', marginInlineStart: 3 }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 28px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <Link href={`/dashboard/events/${event.id}`} style={{ background: '#d4667a', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {L.back}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div>
          <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{L.sub}</p>
          <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 14, fontWeight: 700 }}>{L.title}</p>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: 28, maxWidth: 620 }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Event Name */}
            <div>
              <label style={lbl}>{L.name}<span style={req}>*</span></label>
              <input value={form.name} onChange={e => setField('name', e.target.value)} style={fieldBase('name')} />
              {errors.name && <p style={errTxt}>⚠ {errors.name}</p>}
            </div>

            {/* Event Type */}
            <div>
              <label style={lbl}>{L.type}<span style={req}>*</span></label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EVENT_TYPES.map(t => {
                  const active = form.type === t.value
                  const color  = TYPE_COLORS[t.value]
                  return (
                    <button key={t.value} type="button" onClick={() => setField('type', t.value)} style={{
                      flex: 1, minWidth: 100, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      background: active ? color + '18' : 'transparent',
                      border: `1px solid ${active ? color : 'var(--border)'}`,
                      color: active ? color : 'var(--txt2)',
                    }}>
                      {isRtl ? t.ar : t.en}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date + Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>{L.date}<span style={req}>*</span></label>
                <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} style={{ ...fieldBase('date'), colorScheme: 'auto' }} />
                {errors.date && <p style={errTxt}>⚠ {errors.date}</p>}
              </div>
              <div>
                <label style={lbl}>{L.deadline}<span style={req}>*</span></label>
                <input type="date" value={form.payment_deadline} onChange={e => setField('payment_deadline', e.target.value)} style={{ ...fieldBase('deadline'), colorScheme: 'auto' }} />
                {errors.deadline && <p style={errTxt}>⚠ {errors.deadline}</p>}
              </div>
            </div>

            {/* Price */}
            <div>
              <label style={lbl}>{L.price}<span style={req}>*</span></label>
              <input type="number" min="0" value={form.price} placeholder="0" onChange={e => setField('price', e.target.value)} style={{ ...fieldBase('price'), direction: 'ltr' }} />
              {errors.price && <p style={errTxt}>⚠ {errors.price}</p>}
            </div>

            {/* Venue */}
            <div>
              <label style={lbl}>{L.venue}</label>
              <input value={form.venue} onChange={e => setField('venue', e.target.value)} style={fieldBase('venue')} />
            </div>

            {serverErr && (
              <div style={{ background: '#e0404010', border: '1px solid #e0404030', borderRadius: 8, padding: '10px 14px', color: '#e04040', fontSize: 12 }}>
                {serverErr}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={loading} style={{ background: '#d4667a', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
              {loading ? L.saving : L.save}
            </button>
            <Link href={`/dashboard/events/${event.id}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 24px', color: 'var(--txt2)', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              {L.cancel}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
