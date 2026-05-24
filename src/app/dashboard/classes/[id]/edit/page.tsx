'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle } from 'lucide-react'

const LABELS = {
  en: {
    back: 'Back', title: 'Edit Group', sub: 'Update the weekly schedule',
    grade: 'Grade', gradeDefault: 'Select grade',
    term: 'Term', termDefault: 'Select term',
    ageGroup: 'Age Group',
    hall: 'Hall', hallDefault: 'Select hall',
    coach: 'Default Coach', coachDefault: 'Select coach (optional)',
    days: 'Week Day',
    startTime: 'Start Time', startTimeDef: 'Select hour',
    endTime: 'End Time', endTimeDef: 'Select hour', capacity: 'Max Capacity',
    save: 'Save Changes', saving: 'Saving…', cancel: 'Cancel',
    conflictFix: 'Please resolve the scheduling conflict first',
    conflict: (name: string, days: string, time: string) => `Conflict with group "${name}" (${days}) ${time}`,
    err: {
      grade_id: 'Grade is required', term_id: 'Term is required',
      hall_id: 'Hall is required', default_coach_id: 'Coach is required',
      days: 'Select a day', start_time: 'Start time is required',
      end_time: 'End time is required', max_capacity: 'Capacity is required',
    },
  },
  ar: {
    back: 'رجوع', title: 'تعديل المجموعة', sub: 'تحديث الجدول الأسبوعي',
    grade: 'المستوى الدراسي', gradeDefault: 'اختر المستوى',
    term: 'الفصل الدراسي', termDefault: 'اختر الفصل',
    ageGroup: 'الفئة العمرية',
    hall: 'القاعة', hallDefault: 'اختر القاعة',
    coach: 'المدربة', coachDefault: 'اختر المدربة',
    days: 'يوم الأسبوع',
    startTime: 'وقت البداية', startTimeDef: 'اختر الساعة',
    endTime: 'وقت النهاية', endTimeDef: 'اختر الساعة', capacity: 'الطاقة الاستيعابية',
    save: 'حفظ التعديلات', saving: 'جارٍ الحفظ…', cancel: 'إلغاء',
    conflictFix: 'يرجى إصلاح التعارض أولاً',
    conflict: (name: string, days: string, time: string) => `تعارض مع مجموعة: "${name}" (${days}) ${time}`,
    err: {
      grade_id: 'المستوى الدراسي مطلوب', term_id: 'الفصل الدراسي مطلوب',
      hall_id: 'القاعة مطلوبة', default_coach_id: 'المدربة مطلوبة',
      days: 'اختر يوماً من الأسبوع', start_time: 'وقت البداية مطلوب',
      end_time: 'وقت النهاية مطلوب', max_capacity: 'الطاقة الاستيعابية مطلوبة',
    },
  },
}

const DAYS_LABELS: Record<string, { en: string; ar: string }> = {
  Sunday:    { en: 'Sun', ar: 'الأحد' },
  Monday:    { en: 'Mon', ar: 'الاثنين' },
  Tuesday:   { en: 'Tue', ar: 'الثلاثاء' },
  Wednesday: { en: 'Wed', ar: 'الأربعاء' },
  Thursday:  { en: 'Thu', ar: 'الخميس' },
  Friday:    { en: 'Fri', ar: 'الجمعة' },
  Saturday:  { en: 'Sat', ar: 'السبت' },
}
const DAY_KEYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const HOURS: { value: string; en: string; ar: string }[] = []
for (let h = 7; h <= 22; h++) {
  const value = `${String(h).padStart(2, '0')}:00`
  const h12 = h > 12 ? h - 12 : h
  const suffix = h < 12 ? 'AM' : 'PM'
  const suffixAr = h < 12 ? 'ص' : 'م'
  HOURS.push({ value, en: `${h12} ${suffix}`, ar: `${h12} ${suffixAr}` })
}

type Errors = Partial<Record<string, string>>

export default function EditClassPage() {
  const router   = useRouter()
  const params   = useParams()
  const id       = params.id as string
  const locale   = useLocale()
  const isRtl    = locale === 'ar'
  const L        = LABELS[isRtl ? 'ar' : 'en']
  const supabase = createClient()

  const [loading,   setLoading]   = useState(false)
  const [fetching,  setFetching]  = useState(true)
  const [grades,    setGrades]    = useState<any[]>([])
  const [terms,     setTerms]     = useState<any[]>([])
  const [halls,     setHalls]     = useState<any[]>([])
  const [coaches,   setCoaches]   = useState<any[]>([])
  const [conflict,  setConflict]  = useState('')
  const [serverErr, setServerErr] = useState('')
  const [errors,    setErrors]    = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    grade_id: '', term_id: '', age_group: '', default_coach_id: '',
    hall_id: '', days_of_week: [] as string[],
    start_time: '', end_time: '', max_capacity: '15',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('grades').select('*').order('order_num'),
      supabase.from('terms').select('*'),
      supabase.from('halls').select('*'),
      supabase.from('coaches').select('*').eq('is_active', true).order('name_ar'),
      supabase.from('classes').select('*').eq('id', id).single(),
    ]).then(([{ data: g }, { data: tr }, { data: h }, { data: c }, { data: cls }]) => {
      if (g)  setGrades(g)
      if (tr) setTerms(tr)
      if (h)  setHalls(h)
      if (c)  setCoaches(c)
      if (cls) {
        setForm({
          grade_id:         cls.grade_id         || '',
          term_id:          cls.term_id          || '',
          age_group:        cls.age_group        || '',
          default_coach_id: cls.default_coach_id || '',
          hall_id:          cls.hall_id          || '',
          days_of_week:     cls.days_of_week     || [],
          start_time:       cls.start_time?.slice(0, 5) || '',
          end_time:         cls.end_time?.slice(0, 5)   || '',
          max_capacity:     String(cls.max_capacity || 15),
        })
      }
      setFetching(false)
    })
  }, [id])

  function validate(f = form): Errors {
    const e: Errors = {}
    if (!f.grade_id)                                     e.grade_id         = L.err.grade_id
    if (!f.term_id)                                      e.term_id          = L.err.term_id
    if (!f.hall_id)                                      e.hall_id          = L.err.hall_id
    if (!f.default_coach_id)                             e.default_coach_id = L.err.default_coach_id
    if (f.days_of_week.length === 0)                     e.days             = L.err.days
    if (!f.start_time)                                   e.start_time       = L.err.start_time
    if (!f.end_time)                                     e.end_time         = L.err.end_time
    if (!f.max_capacity || parseInt(f.max_capacity) < 1) e.max_capacity     = L.err.max_capacity
    return e
  }

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    if (submitted) setErrors(validate(next))
  }

  useEffect(() => {
    if (fetching || !form.hall_id || !form.start_time || !form.end_time || form.days_of_week.length === 0) return
    setConflict('')
    supabase
      .from('classes').select('name, days_of_week, start_time, end_time')
      .eq('hall_id', form.hall_id).eq('is_active', true).neq('id', id)
      .then(({ data: existing }) => {
        if (!existing) return
        for (const cls of existing) {
          const overlap = cls.days_of_week?.filter((d: string) => form.days_of_week.includes(d))
          if (overlap?.length > 0 && form.start_time < cls.end_time && form.end_time > cls.start_time) {
            const dayLabels = overlap.map((d: string) => DAYS_LABELS[d]?.[isRtl ? 'ar' : 'en'] || d)
            setConflict(L.conflict(cls.name, dayLabels.join(', '), `${cls.start_time.slice(0,5)}–${cls.end_time.slice(0,5)}`))
            return
          }
        }
      })
  }, [form.hall_id, form.start_time, form.end_time, form.days_of_week, fetching])

  function toggleDay(day: string) {
    setField('days_of_week', form.days_of_week[0] === day ? [] : [day])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (conflict) { setServerErr(L.conflictFix); return }

    setLoading(true); setServerErr('')

    const gradeName = grades.find(g => g.id === form.grade_id)?.name || ''
    const termName  = terms.find(t => t.id === form.term_id)?.name   || ''
    const dayStr    = form.days_of_week.map(d => DAYS_LABELS[d]?.en || d).join(', ')
    const fmt12h = (t: string) => { const [h, m] = t.split(':').map(Number); const h12 = h % 12 || 12; const s = h < 12 ? 'AM' : 'PM'; return m === 0 ? `${h12} ${s}` : `${h12}:${String(m).padStart(2,'0')} ${s}` }
    const timeRange = form.start_time
      ? (form.end_time ? `${fmt12h(form.start_time)} – ${fmt12h(form.end_time)}` : fmt12h(form.start_time))
      : ''
    const autoName  = [gradeName, termName, dayStr, timeRange].filter(Boolean).join(' · ')

    const { error: err } = await supabase.from('classes').update({
      name:             autoName,
      grade_id:         form.grade_id         || null,
      term_id:          form.term_id          || null,
      age_group:        form.age_group,
      default_coach_id: form.default_coach_id || null,
      hall_id:          form.hall_id,
      days_of_week:     form.days_of_week,
      start_time:       form.start_time,
      end_time:         form.end_time,
      max_capacity:     parseInt(form.max_capacity),
    }).eq('id', id)

    if (err) { setServerErr(err.message); setLoading(false) }
    else router.push('/dashboard/classes')
  }

  const base = (field: string): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${errors[field] && submitted ? '#e04040' : 'var(--border)'}`,
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
  })
  const inp = (f: string): React.CSSProperties => ({ ...base(f), direction: isRtl ? 'rtl' : 'ltr' })
  const sel = (f: string): React.CSSProperties => ({ ...base(f), direction: isRtl ? 'rtl' : 'ltr' })
  const num = (f: string): React.CSSProperties => ({ ...base(f), direction: 'ltr' })
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }
  const req: React.CSSProperties = { color: '#e04040', marginInlineStart: 3 }
  const errTxt: React.CSSProperties = { margin: '4px 0 0', color: '#e04040', fontSize: 11 }

  if (fetching) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--txt2)' }}>
      …
    </div>
  )

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
      <div style={{ padding: '28px', maxWidth: 680 }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
          }}>

            {/* Grade + Term */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>{L.grade}<span style={req}>*</span></label>
                <select value={form.grade_id} onChange={e => setField('grade_id', e.target.value)} style={sel('grade_id')}>
                  <option value="">{L.gradeDefault}</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {submitted && errors.grade_id && <p style={errTxt}>{errors.grade_id}</p>}
              </div>
              <div>
                <label style={lbl}>{L.term}<span style={req}>*</span></label>
                <select value={form.term_id} onChange={e => setField('term_id', e.target.value)} style={sel('term_id')}>
                  <option value="">{L.termDefault}</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {submitted && errors.term_id && <p style={errTxt}>{errors.term_id}</p>}
              </div>
            </div>

            {/* Age Group */}
            <div>
              <label style={lbl}>{L.ageGroup}</label>
              <input value={form.age_group} onChange={e => setField('age_group', e.target.value)} style={inp('age_group')} />
            </div>

            {/* Hall + Coach */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>{L.hall}<span style={req}>*</span></label>
                <select value={form.hall_id} onChange={e => setField('hall_id', e.target.value)} style={sel('hall_id')}>
                  <option value="">{L.hallDefault}</option>
                  {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                {submitted && errors.hall_id && <p style={errTxt}>{errors.hall_id}</p>}
              </div>
              <div>
                <label style={lbl}>{L.coach}<span style={req}>*</span></label>
                <select value={form.default_coach_id} onChange={e => setField('default_coach_id', e.target.value)} style={sel('default_coach_id')}>
                  <option value="">{L.coachDefault}</option>
                  {coaches.map(c => <option key={c.id} value={c.id}>{isRtl ? c.name_ar : c.name_en}</option>)}
                </select>
                {submitted && errors.default_coach_id && <p style={errTxt}>{errors.default_coach_id}</p>}
              </div>
            </div>

            {/* Days */}
            <div>
              <label style={lbl}>{L.days}<span style={req}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DAY_KEYS.map(day => {
                  const selected = form.days_of_week.includes(day)
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)} style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${selected ? '#d4667a' : 'var(--border)'}`,
                      background: selected ? '#d4667a18' : 'transparent',
                      color: selected ? '#d4667a' : 'var(--txt2)',
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>
                      {DAYS_LABELS[day][isRtl ? 'ar' : 'en']}
                    </button>
                  )
                })}
              </div>
              {submitted && errors.days && <p style={errTxt}>{errors.days}</p>}
            </div>

            {/* Times + Capacity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>{L.startTime}<span style={req}>*</span></label>
                <select value={form.start_time} onChange={e => setField('start_time', e.target.value)} style={sel('start_time')}>
                  <option value="">{L.startTimeDef}</option>
                  {HOURS.map(h => <option key={h.value} value={h.value}>{isRtl ? h.ar : h.en}</option>)}
                </select>
                {submitted && errors.start_time && <p style={errTxt}>{errors.start_time}</p>}
              </div>
              <div>
                <label style={lbl}>{L.endTime}<span style={req}>*</span></label>
                <select value={form.end_time} onChange={e => setField('end_time', e.target.value)} style={sel('end_time')}>
                  <option value="">{L.endTimeDef}</option>
                  {HOURS.map(h => <option key={h.value} value={h.value}>{isRtl ? h.ar : h.en}</option>)}
                </select>
                {submitted && errors.end_time && <p style={errTxt}>{errors.end_time}</p>}
              </div>
              <div>
                <label style={lbl}>{L.capacity}<span style={req}>*</span></label>
                <input type="number" min="1" value={form.max_capacity}
                  onChange={e => setField('max_capacity', e.target.value)} style={num('max_capacity')} />
                {submitted && errors.max_capacity && <p style={errTxt}>{errors.max_capacity}</p>}
              </div>
            </div>

            {conflict && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f5a62310', border: '1px solid #f5a62330',
                borderRadius: 8, padding: '10px 14px', color: '#f5a623', fontSize: 12,
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {conflict}
              </div>
            )}

            {serverErr && (
              <div style={{
                background: '#e0404010', border: '1px solid #e0404030',
                borderRadius: 8, padding: '10px 14px', color: '#e04040', fontSize: 12,
              }}>
                {serverErr}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={loading || !!conflict} style={{
              background: '#d4667a', border: 'none', borderRadius: 10,
              padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading || !!conflict ? 'not-allowed' : 'pointer',
              opacity: loading || !!conflict ? 0.6 : 1, fontFamily: 'inherit',
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
