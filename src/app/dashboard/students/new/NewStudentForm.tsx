'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Term   = { id: string; name: string }
type Grade  = { id: string; name: string }
type Class  = { id: string; name: string; days_of_week?: string[]; start_time?: string }
type Plan   = { id: string; name: string; price: string | number; sessions_count: number }

const LABELS = {
  en: {
    back: 'Back',
    title: 'New Student',
    sub: 'Fill in the student details below',
    nameAr: 'Full Name (Arabic)',
    nameEn: 'Full Name (English)',
    dob: 'Date of Birth',
    phone: 'Parent Phone',
    parentName: 'Parent Name',
    grade: 'Grade',
    gradeDefault: 'Select grade',
    level: 'Term',
    levelDefault: 'Select term',
    class: 'Group',
    classDefault: 'Select group',
    notes: 'Notes',
    notesPlaceholder: 'Medical or administrative notes...',
    plan: 'Subscription Plan', planDefault: 'Select plan',
    monthlyFees: 'Monthly Subscription (EGP)',
    discountedFees: 'Discounted Monthly Subscription Fees (EGP)',
    discountEndDate: 'End Discount Date',
    feesSection: 'Fees',
    nameArPlaceholder: '',
    nameEnPlaceholder: '',
    phonePlaceholder: '',
    parentNamePlaceholder: '',
    save: 'Save Student',
    saving: 'Saving...',
    cancel: 'Cancel',
    serverError: 'Something went wrong. Please try again.',
    err: {
      name_ar:               'Arabic name is required',
      name_ar_alpha:         'Arabic name must contain Arabic letters only',
      name_en:               'English name is required',
      name_en_alpha:         'English name must contain English letters only',
      date_of_birth:         'Date of birth is required',
      dob_future:            'Date of birth cannot be in the future',
      parent_phone:          'Parent phone is required',
      phone_digits:          'Only English digits are allowed (0–9)',
      phone_starts_01:       'Phone number must start with 01',
      phone_11:              'Phone number must be exactly 11 digits',
      grade_id:              'Please select a grade',
      level_id:              'Please select a term',
      class_id:              'Please select a group',
      plan_id:               'Please select a subscription plan',
      monthly_fees:          'Monthly fees are required',
      monthly_fees_invalid:  'Enter a whole number (no decimals)',
      discounted_fees:       'Discounted fees are required',
      discounted_fees_invalid:  'Enter a whole number (no decimals)',
      discounted_fees_not_less: 'Discounted fees must be less than monthly fees',
      discount_end_date:        'End discount date is required when a discount is applied',
      discount_end_date_past:   'End discount date cannot be in the past',
    },
  },
  ar: {
    back: 'رجوع',
    title: 'طالبة جديدة',
    sub: 'أدخلي بيانات الطالبة الجديدة',
    nameAr: 'الاسم بالعربي',
    nameEn: 'الاسم بالإنجليزي',
    dob: 'تاريخ الميلاد',
    phone: 'هاتف ولي الأمر',
    parentName: 'اسم ولي الأمر',
    grade: 'الصف الدراسي',
    gradeDefault: 'اختر الصف',
    level: 'الفصل الدراسي',
    levelDefault: 'اختر الفصل',
    class: 'المجموعة',
    classDefault: 'اختر المجموعه',
    notes: 'ملاحظات',
    notesPlaceholder: 'أي ملاحظات طبية أو إدارية...',
    plan: 'خطة الاشتراك', planDefault: 'اختر الخطة (اختياري)',
    monthlyFees: 'الاشتراك الشهري (جنيه)',
    discountedFees: 'رسوم الاشتراك الشهري المخفضة (جنيه)',
    discountEndDate: 'تاريخ انتهاء التخفيض',
    feesSection: 'الاشتراك الشهري',
    nameArPlaceholder: '',
    nameEnPlaceholder: '',
    phonePlaceholder: '',
    parentNamePlaceholder: '',
    save: 'حفظ الطالبة',
    saving: 'جارٍ الحفظ...',
    cancel: 'إلغاء',
    serverError: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    err: {
      name_ar:               'الاسم بالعربي مطلوب',
      name_ar_alpha:         'يجب أن يحتوي الاسم بالعربي على حروف عربية فقط',
      name_en:               'الاسم بالإنجليزي مطلوب',
      name_en_alpha:         'يجب أن يحتوي الاسم بالإنجليزي على حروف إنجليزية فقط',
      date_of_birth:         'تاريخ الميلاد مطلوب',
      dob_future:            'تاريخ الميلاد لا يمكن أن يكون في المستقبل',
      parent_phone:          'هاتف ولي الأمر مطلوب',
      phone_digits:          'يُسمح بالأرقام الإنجليزية فقط (0–9)',
      phone_starts_01:       'يجب أن يبدأ رقم الهاتف بـ 01',
      phone_11:              'يجب أن يكون رقم الهاتف 11 رقماً بالضبط',
      grade_id:              'يرجى اختيار الصف الدراسي',
      level_id:              'يرجى اختيار الفصل الدراسي',
      class_id:              'يرجى اختيار المجموعة',
      plan_id:               'يرجى اختيار خطة الاشتراك',
      monthly_fees:          'الرسوم الشهرية مطلوبة',
      monthly_fees_invalid:  'أدخل رقماً صحيحاً (بدون أرقام عشرية)',
      discounted_fees:       'الرسوم المخفضة مطلوبة',
      discounted_fees_invalid:  'أدخل رقماً صحيحاً (بدون أرقام عشرية)',
      discounted_fees_not_less: 'يجب أن تكون الرسوم المخفضة أقل من الرسوم الشهرية',
      discount_end_date:        'تاريخ انتهاء التخفيض مطلوب عند تطبيق خصم',
      discount_end_date_past:   'لا يمكن أن يكون تاريخ انتهاء التخفيض في الماضي',
    },
  },
}

function classLabel(c: Class) {
  return c.name
}

type FormFields = 'name_ar' | 'name_en' | 'date_of_birth' | 'parent_phone' | 'grade_id' | 'term_id' | 'class_id' | 'plan_id' | 'discounted_monthly_fees' | 'discount_end_date'

export default function NewStudentForm({
  terms, grades, classes, plans, locale,
}: {
  terms:   Term[]
  grades:  Grade[]
  classes: Class[]
  plans:   Plan[]
  locale:  string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const isRtl    = locale === 'ar'
  const L        = LABELS[isRtl ? 'ar' : 'en']

  const [form, setForm] = useState({
    name_ar: '', name_en: '', date_of_birth: '',
    parent_phone: '', parent_name: '',
    grade_id: '', term_id: '', class_id: '',
    notes: '',
    plan_id: '',
    discounted_monthly_fees: '',
    discount_end_date: '',
  })
  const [errors,  setErrors]  = useState<Partial<Record<FormFields, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<FormFields, boolean>>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field as FormFields]) {
      setErrors(e => ({ ...e, [field]: undefined }))
    }
  }

  function touch(field: FormFields) {
    setTouched(t => ({ ...t, [field]: true }))
    const msg = validateField(field, form[field])
    setErrors(e => ({ ...e, [field]: msg }))
  }

  function validateField(field: FormFields, value: string): string | undefined {
    switch (field) {
      case 'name_ar':
        if (!value.trim()) return L.err.name_ar
        if (!/^[؀-ۿ\s]+$/.test(value.trim())) return L.err.name_ar_alpha
        return undefined
      case 'name_en':
        if (!value.trim()) return L.err.name_en
        if (!/^[a-zA-Z\s]+$/.test(value.trim())) return L.err.name_en_alpha
        return undefined
      case 'date_of_birth':
        if (!value) return L.err.date_of_birth
        if (new Date(value) > new Date()) return L.err.dob_future
        return undefined
      case 'parent_phone': {
        if (!value.trim()) return L.err.parent_phone
        if (!/^\d+$/.test(value.trim())) return L.err.phone_digits
        if (!value.trim().startsWith('01')) return L.err.phone_starts_01
        if (value.trim().length !== 11) return L.err.phone_11
        return undefined
      }
      case 'grade_id':
        return value ? undefined : L.err.grade_id
      case 'term_id':
        return value ? undefined : L.err.level_id
      case 'class_id':
        return value ? undefined : L.err.class_id
      case 'plan_id':
        return value ? undefined : L.err.plan_id
      case 'discounted_monthly_fees': {
        if (!value.trim()) return undefined
        if (!/^\d+$/.test(value.trim())) return L.err.discounted_fees_invalid
        const planPrice = Number(plans.find(p => p.id === form.plan_id)?.price || 0)
        const df = parseInt(value.trim(), 10)
        if (planPrice > 0 && df >= planPrice) return L.err.discounted_fees_not_less
        return undefined
      }
      case 'discount_end_date': {
        const planPrice = Number(plans.find(p => p.id === form.plan_id)?.price || 0)
        const df = parseInt(form.discounted_monthly_fees || '0', 10)
        const hasDiscount = df > 0 && df < planPrice
        if (hasDiscount && !value) return L.err.discount_end_date
        if (value) {
          const today = new Date(); today.setHours(0, 0, 0, 0)
          if (new Date(value + 'T00:00:00') < today) return L.err.discount_end_date_past
        }
        return undefined
      }
    }
  }

  function validateAll(): Partial<Record<FormFields, string>> {
    const fields: FormFields[] = [
      'name_ar', 'name_en', 'date_of_birth', 'parent_phone',
      'grade_id', 'term_id', 'class_id', 'plan_id',
      'discounted_monthly_fees', 'discount_end_date',
    ]
    const result: Partial<Record<FormFields, string>> = {}
    for (const f of fields) {
      const msg = validateField(f, form[f as keyof typeof form])
      if (msg) result[f] = msg
    }
    return result
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')

    const allErrors = validateAll()
    setTouched({ name_ar: true, name_en: true, date_of_birth: true, parent_phone: true, grade_id: true, term_id: true, class_id: true, plan_id: true, discounted_monthly_fees: true, discount_end_date: true })
    setErrors(allErrors)
    if (Object.keys(allErrors).length > 0) return

    setLoading(true)

    const plan       = plans.find(p => p.id === form.plan_id)
    const planPrice  = Number(plan?.price || 0)
    const df         = parseInt(form.discounted_monthly_fees, 10)
    const hasDiscount = df > 0 && df < planPrice

    const { data: student, error: err } = await supabase
      .from('students')
      .insert({
        name_ar:                  form.name_ar,
        name_en:                  form.name_en,
        date_of_birth:            form.date_of_birth,
        parent_phone:             form.parent_phone,
        parent_name:              form.parent_name  || null,
        grade_id:                 form.grade_id  || null,
        term_id:                  form.term_id   || null,
        notes:                    form.notes        || null,
        enrollment_date:          new Date().toISOString().split('T')[0],
        monthly_fees:             planPrice || null,
        discounted_monthly_fees:  hasDiscount ? df : null,
        discount_end_date:        hasDiscount && form.discount_end_date ? form.discount_end_date : null,
      })
      .select()
      .single()

    if (err) {
      setServerError(err.message || L.serverError)
      setLoading(false)
      return
    }

    if (form.class_id && student) {
      await supabase.from('class_students').insert({
        student_id:    student.id,
        class_id:      form.class_id,
        enrolled_date: new Date().toISOString().split('T')[0],
      })
    }

    if (form.plan_id && student) {
      const plan = plans.find(p => p.id === form.plan_id)
      await supabase.from('subscriptions').insert({
        student_id:          student.id,
        class_id:            form.class_id || null,
        plan_id:             form.plan_id,
        total_sessions:      plan?.sessions_count ?? 4,
        remaining_sessions:  plan?.sessions_count ?? 4,
        start_date:          new Date().toISOString().split('T')[0],
        status:              'active',
      })
    }

    router.push(`/dashboard/students/${student.id}`)
  }

  function inpStyle(field?: FormFields): React.CSSProperties {
    const hasErr = field && touched[field] && errors[field]
    return {
      width: '100%', background: 'var(--bg-page)',
      border: `1px solid ${hasErr ? '#e04040' : 'var(--border)'}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--txt1)',
      outline: 'none', fontFamily: 'inherit',
      transition: 'border-color 0.15s',
      textAlign: isRtl ? 'right' : 'left',
    }
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const errMsg: React.CSSProperties = {
    fontSize: 11, color: '#e04040', marginTop: 4,
  }
  const req = <span style={{ color: '#e04040' }}> *</span>

  function Err({ field }: { field: FormFields }) {
    if (!touched[field] || !errors[field]) return null
    return <p style={errMsg}>⚠ {errors[field]}</p>
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/dashboard/students" style={{
          background: '#d4667a', borderRadius: 8, padding: '7px 16px',
          color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {L.back}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div>
          <p style={{ color: 'var(--txt1)', fontSize: 14, fontWeight: 700, margin: 0 }}>{L.title}</p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: 0 }}>{L.sub}</p>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 640 }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.07)',
          }}>
            <p style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 700, margin: '0 0 20px', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              🩰 {L.title}
            </p>

            {/* Row 1 — Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{L.nameAr}{req}</label>
                <input value={form.name_ar}
                  onChange={e => set('name_ar', e.target.value)}
                  onBlur={() => touch('name_ar')}
                  placeholder={L.nameArPlaceholder} dir="rtl"
                  style={inpStyle('name_ar')} />
                <Err field="name_ar" />
              </div>
              <div>
                <label style={lbl}>{L.nameEn}{req}</label>
                <input value={form.name_en}
                  onChange={e => set('name_en', e.target.value)}
                  onBlur={() => touch('name_en')}
                  placeholder={L.nameEnPlaceholder} dir="ltr"
                  style={inpStyle('name_en')} />
                <Err field="name_en" />
              </div>
            </div>

            {/* Row 2 — DOB & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{L.dob}{req}</label>
                <input type="date" value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                  onBlur={() => touch('date_of_birth')}
                  style={inpStyle('date_of_birth')} />
                <Err field="date_of_birth" />
              </div>
              <div>
                <label style={lbl}>{L.phone}{req}</label>
                <input value={form.parent_phone}
                  onChange={e => set('parent_phone', e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => touch('parent_phone')}
                  placeholder={L.phonePlaceholder} dir="ltr"
                  maxLength={11} inputMode="numeric"
                  style={inpStyle('parent_phone')} />
                <Err field="parent_phone" />
              </div>
            </div>

            {/* Row 3 — Parent Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.parentName}</label>
              <input value={form.parent_name}
                onChange={e => set('parent_name', e.target.value)}
                placeholder={L.parentNamePlaceholder}
                style={inpStyle()} />
            </div>

            {/* Row 4 — Grade & Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{L.grade}{req}</label>
                <select value={form.grade_id}
                  onChange={e => set('grade_id', e.target.value)}
                  onBlur={() => touch('grade_id')}
                  style={{ ...inpStyle('grade_id'), cursor: 'pointer' }}>
                  <option value="">{L.gradeDefault}</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <Err field="grade_id" />
              </div>
              <div>
                <label style={lbl}>{L.level}{req}</label>
                <select value={form.term_id}
                  onChange={e => set('term_id', e.target.value)}
                  onBlur={() => touch('term_id')}
                  style={{ ...inpStyle('term_id'), cursor: 'pointer' }}>
                  <option value="">{L.levelDefault}</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Err field="term_id" />
              </div>
            </div>

            {/* Row 5 — Class */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.class}{req}</label>
              <select value={form.class_id}
                onChange={e => set('class_id', e.target.value)}
                onBlur={() => touch('class_id')}
                style={{ ...inpStyle('class_id'), cursor: 'pointer' }}>
                <option value="">{L.classDefault}</option>
                {classes.map(c => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
              </select>
              <Err field="class_id" />
            </div>

            {/* Row 6 — Fees */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', margin: '0 0 10px', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                💰 {L.feesSection}
              </p>

              {/* Plan selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>{L.plan}{req}</label>
                <select
                  value={form.plan_id}
                  onChange={e => { set('plan_id', e.target.value); setTouched(t => ({ ...t, plan_id: true })) }}
                  onBlur={() => touch('plan_id')}
                  style={{ ...inpStyle('plan_id'), cursor: 'pointer' }}
                >
                  <option value="">{L.planDefault}</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {Number(p.price).toLocaleString()} EGP / {p.sessions_count} {isRtl ? 'حصص' : 'sessions'}
                    </option>
                  ))}
                </select>
                <Err field="plan_id" />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>{L.discountedFees}</label>
                <input
                  value={form.discounted_monthly_fees}
                  onChange={e => {
                    set('discounted_monthly_fees', e.target.value.replace(/[^\d]/g, ''))
                    setTouched(t => ({ ...t, discount_end_date: true }))
                  }}
                  onBlur={() => { touch('discounted_monthly_fees'); touch('discount_end_date') }}
                  inputMode="numeric"
                  placeholder="0"
                  dir="ltr"
                  style={inpStyle('discounted_monthly_fees')}
                />
                <Err field="discounted_monthly_fees" />
              </div>

              {/* End Discount Date — shown + required only when a discount exists */}
              {(() => {
                const planPrice  = Number(plans.find(p => p.id === form.plan_id)?.price || 0)
                const df         = parseInt(form.discounted_monthly_fees || '0', 10)
                const hasDiscount = df > 0 && df < planPrice
                return hasDiscount ? (
                  <div>
                    <label style={lbl}>{L.discountEndDate}{req}</label>
                    <input
                      type="date"
                      value={form.discount_end_date}
                      onChange={e => { set('discount_end_date', e.target.value); touch('discount_end_date') }}
                      onBlur={() => touch('discount_end_date')}
                      style={inpStyle('discount_end_date')}
                    />
                    <Err field="discount_end_date" />
                  </div>
                ) : null
              })()}
            </div>

            {/* Row 7 — Notes */}
            <div>
              <label style={lbl}>{L.notes}</label>
              <textarea value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder={L.notesPlaceholder} rows={3}
                style={{ ...inpStyle(), resize: 'vertical' }} />
            </div>

            {/* Server error */}
            {serverError && (
              <div style={{
                marginTop: 14, background: '#e0404010', border: '1px solid #e0404030',
                borderRadius: 8, padding: '10px 14px', color: '#e04040', fontSize: 12,
              }}>
                ⚠ {serverError}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={loading} style={{
              background: '#d4667a', border: 'none', borderRadius: 10,
              padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? L.saving : L.save}
            </button>
            <Link href="/dashboard/students" style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 20px', color: 'var(--txt2)',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              {L.cancel}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
