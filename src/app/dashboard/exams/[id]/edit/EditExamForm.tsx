'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { updateExam } from '../../actions'

const LABELS = {
  en: {
    back: 'Back',
    title: 'Edit Exam',
    sub: 'Update the exam details below',
    name: 'Exam Name',
    date: 'Exam Date',
    fee: 'Exam Fees (EGP)',
    paymentDeadline: 'Last Payment Date',
    level: 'Target Level',
    selectAll: 'Select All',
    clearAll: 'Clear',
    save: 'Save Changes',
    saving: 'Saving…',
    cancel: 'Cancel',
    err: {
      name:             'Exam name is required',
      date:             'Exam date is required',
      date_past:        'Exam date cannot be in the past',
      fee:              'Exam fees are required',
      fee_neg:          'Fee cannot be negative',
      levels:           'Select at least one target level',
      payment_deadline: 'Last payment date is required',
      deadline_after:   'Payment deadline must be on or before the exam date',
    },
  },
  ar: {
    back: 'رجوع',
    title: 'تعديل الامتحان',
    sub: 'قم بتحديث بيانات الامتحان',
    name: 'اسم الامتحان',
    date: 'تاريخ الامتحان',
    fee: 'رسوم الامتحان (جنيه)',
    paymentDeadline: 'آخر موعد للسداد',
    level: 'المستوى المستهدف',
    selectAll: 'تحديد الكل',
    clearAll: 'مسح',
    save: 'حفظ التعديلات',
    saving: 'جارٍ الحفظ…',
    cancel: 'إلغاء',
    err: {
      name:             'اسم الامتحان مطلوب',
      date:             'تاريخ الامتحان مطلوب',
      date_past:        'لا يمكن أن يكون تاريخ الامتحان في الماضي',
      fee:              'رسوم الامتحان مطلوبة',
      fee_neg:          'لا يمكن أن تكون الرسوم سالبة',
      levels:           'اختر مستوى واحداً على الأقل',
      payment_deadline: 'آخر موعد للسداد مطلوب',
      deadline_after:   'يجب أن يكون آخر موعد للسداد قبل تاريخ الامتحان أو في نفسه',
    },
  },
}

type FormFields = 'name' | 'date' | 'fee' | 'levels' | 'payment_deadline'

function sortGrades(grades: any[]) {
  return [...grades].sort((a, b) => {
    const isPre = (n: string) => n.toLowerCase().startsWith('preballet')
    if (isPre(a.name) && !isPre(b.name)) return -1
    if (!isPre(a.name) && isPre(b.name)) return 1
    return a.name.localeCompare(b.name)
  })
}

interface Props {
  exam: any
  existingTargets: { grade_id: string; term_id: string }[]
  grades: any[]
  terms: any[]
  isRtl: boolean
}

export default function EditExamForm({ exam, existingTargets, grades: rawGrades, terms, isRtl }: Props) {
  const router = useRouter()
  const L      = LABELS[isRtl ? 'ar' : 'en']
  const grades = sortGrades(rawGrades)

  const today = new Date().toISOString().split('T')[0]

  const [loading,   setLoading]   = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [errors,    setErrors]    = useState<Partial<Record<FormFields, string>>>({})
  const [touched,   setTouched]   = useState<Partial<Record<FormFields, boolean>>>({})

  const [selectedLevels, setSelectedLevels] = useState<string[]>(
    existingTargets.map(t => `${t.grade_id}__${t.term_id}`)
  )

  const [form, setFormState] = useState({
    name: exam.name ?? '',
    date: exam.date ?? '',
    fee:  exam.fee != null ? String(exam.fee) : '',
    payment_deadline: exam.payment_deadline ?? '',
  })

  const allOptions = grades.flatMap(g => terms.map(t => ({
    value: `${g.id}__${t.id}`,
    grade_id: g.id,
    term_id:  t.id,
    gradeName: g.name,
    termName:  t.name,
  })))

  const allSelected = selectedLevels.length === allOptions.length && allOptions.length > 0

  function toggleLevel(value: string) {
    setSelectedLevels(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    setErrors(e => ({ ...e, levels: undefined }))
  }

  function toggleAll() {
    setSelectedLevels(allSelected ? [] : allOptions.map(o => o.value))
    setErrors(e => ({ ...e, levels: undefined }))
  }

  function toggleGrade(gradeId: string) {
    const gradeOptions = allOptions.filter(o => o.grade_id === gradeId).map(o => o.value)
    const allChecked   = gradeOptions.every(v => selectedLevels.includes(v))
    setSelectedLevels(prev =>
      allChecked ? prev.filter(v => !gradeOptions.includes(v)) : [...new Set([...prev, ...gradeOptions])]
    )
    setErrors(e => ({ ...e, levels: undefined }))
  }

  function validateField(field: FormFields, value: string, examDate?: string): string | undefined {
    switch (field) {
      case 'name':             return value.trim() ? undefined : L.err.name
      case 'date':
        if (!value) return L.err.date
        if (value < today) return L.err.date_past
        return undefined
      case 'fee':              return !value.trim() ? L.err.fee : parseFloat(value) < 0 ? L.err.fee_neg : undefined
      case 'levels':           return selectedLevels.length > 0 ? undefined : L.err.levels
      case 'payment_deadline':
        if (!value) return L.err.payment_deadline
        if (examDate && value > examDate) return L.err.deadline_after
        return undefined
    }
  }

  function validateAll(): Partial<Record<FormFields, string>> {
    const result: Partial<Record<FormFields, string>> = {}
    for (const f of ['name', 'date', 'fee', 'payment_deadline'] as FormFields[]) {
      const msg = validateField(f, form[f as keyof typeof form], form.date)
      if (msg) result[f] = msg
    }
    const lvlMsg = validateField('levels', '')
    if (lvlMsg) result.levels = lvlMsg
    return result
  }

  function set(key: keyof typeof form, value: string) {
    setFormState(f => ({ ...f, [key]: value }))
    if (key === 'date' && touched.payment_deadline) {
      setErrors(e => ({
        ...e,
        date: value < today ? L.err.date_past : undefined,
        payment_deadline: form.payment_deadline
          ? (form.payment_deadline > value ? L.err.deadline_after : undefined)
          : e.payment_deadline,
      }))
    } else if (errors[key as FormFields]) {
      setErrors(e => ({ ...e, [key]: undefined }))
    }
  }

  function touch(field: FormFields) {
    setTouched(t => ({ ...t, [field]: true }))
    setErrors(e => ({ ...e, [field]: validateField(field, form[field as keyof typeof form] ?? '', form.date) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerErr('')
    const allErrors = validateAll()
    setTouched({ name: true, date: true, fee: true, levels: true, payment_deadline: true })
    setErrors(allErrors)
    if (Object.keys(allErrors).length > 0) return

    setLoading(true)
    const targets = selectedLevels.map(val => {
      const opt = allOptions.find(o => o.value === val)!
      return { grade_id: opt.grade_id, term_id: opt.term_id }
    })
    const r = await updateExam(exam.id, {
      name: form.name,
      date: form.date,
      fee:  parseFloat(form.fee),
      payment_deadline: form.payment_deadline,
    }, targets)

    if (r.error) {
      setServerErr(r.error)
      setLoading(false)
      return
    }
    router.push(`/dashboard/exams/${exam.id}`)
  }

  function inpStyle(field: FormFields): React.CSSProperties {
    const hasErr = touched[field] && errors[field]
    return {
      width: '100%', background: 'var(--bg-page)',
      border: `1px solid ${hasErr ? '#e04040' : 'var(--border)'}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--txt1)',
      outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
      textAlign: isRtl ? 'right' : 'left',
    }
  }

  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }
  const req = <span style={{ color: '#e04040' }}> *</span>

  function Err({ field }: { field: FormFields }) {
    if (!touched[field] || !errors[field]) return null
    return <p style={{ fontSize: 11, color: '#e04040', marginTop: 6 }}>⚠ {errors[field]}</p>
  }

  const levelsHasErr = !!(touched.levels && errors.levels)

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href={`/dashboard/exams/${exam.id}`} style={{
          background: '#d4667a', borderRadius: 8, padding: '7px 16px',
          color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {L.back}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div>
          <p style={{ color: 'var(--txt1)', fontSize: 14, fontWeight: 700, margin: 0 }}>{L.title}</p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: 0 }}>{exam.name}</p>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 680 }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.07)',
          }}>
            <p style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 700, margin: '0 0 20px', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              📋 {L.title}
            </p>

            {/* Exam Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.name}{req}</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} onBlur={() => touch('name')} style={inpStyle('name')} />
              <Err field="name" />
            </div>

            {/* Date + Fee */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{L.date}{req}</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} onBlur={() => touch('date')} style={{ ...inpStyle('date'), colorScheme: 'auto' }} />
                <Err field="date" />
              </div>
              <div>
                <label style={lbl}>{L.fee}{req}</label>
                <input type="number" min="0" value={form.fee} onChange={e => set('fee', e.target.value)} onBlur={() => touch('fee')} placeholder="0" dir="ltr" style={inpStyle('fee')} />
                <Err field="fee" />
              </div>
            </div>

            {/* Last Payment Date */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>{L.paymentDeadline}{req}</label>
              <input type="date" value={form.payment_deadline} onChange={e => set('payment_deadline', e.target.value)} onBlur={() => touch('payment_deadline')} style={{ ...inpStyle('payment_deadline'), colorScheme: 'auto', maxWidth: 300 }} />
              <Err field="payment_deadline" />
            </div>

            {/* Target Levels */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>{L.level}{req}</label>
                <button type="button" onClick={toggleAll} style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                  cursor: 'pointer', fontFamily: 'inherit', border: '1px solid var(--border)',
                  background: allSelected ? '#d4667a' : 'var(--bg-page)',
                  color: allSelected ? '#fff' : 'var(--txt2)',
                  transition: 'all .15s',
                }}>
                  {allSelected ? L.clearAll : L.selectAll}
                </button>
              </div>

              <div style={{
                border: `1px solid ${levelsHasErr ? '#e04040' : 'var(--border)'}`,
                borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s',
              }}>
                {grades.map((grade, gi) => {
                  const gradeOptions    = allOptions.filter(o => o.grade_id === grade.id)
                  const allGradeChecked = gradeOptions.every(o => selectedLevels.includes(o.value))
                  const someChecked     = gradeOptions.some(o => selectedLevels.includes(o.value))

                  return (
                    <div key={grade.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px',
                      borderBottom: gi < grades.length - 1 ? '1px solid var(--border)' : 'none',
                      background: someChecked ? '#d4667a06' : 'var(--bg-page)',
                    }}>
                      <button type="button" onClick={() => toggleGrade(grade.id)} style={{
                        width: 120, flexShrink: 0, textAlign: isRtl ? 'right' : 'left',
                        fontSize: 12, fontWeight: 700,
                        color: someChecked ? '#d4667a' : 'var(--txt1)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', padding: 0,
                        opacity: allGradeChecked ? 1 : someChecked ? 0.8 : 0.65,
                      }}>
                        {grade.name}
                      </button>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {gradeOptions.map(opt => {
                          const checked = selectedLevels.includes(opt.value)
                          return (
                            <button key={opt.value} type="button" onClick={() => toggleLevel(opt.value)} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                              border: `1.5px solid ${checked ? '#d4667a' : 'var(--border)'}`,
                              background: checked ? '#d4667a' : 'var(--bg-page)',
                              color: checked ? '#fff' : 'var(--txt2)',
                            }}>
                              {checked && <Check size={11} strokeWidth={3} />}
                              {opt.termName}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <Err field="levels" />
            </div>

            {serverErr && (
              <div style={{ background: '#e0404012', border: '1px solid #e0404028', borderRadius: 10, padding: '10px 14px', color: '#e04040', fontSize: 12, marginTop: 14 }}>
                {serverErr}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={loading} style={{
              background: '#d4667a', border: 'none', borderRadius: 8,
              padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? L.saving : L.save}
            </button>
            <Link href={`/dashboard/exams/${exam.id}`} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 20px',
              color: 'var(--txt2)', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
            }}>
              {L.cancel}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
