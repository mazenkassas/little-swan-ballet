'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from 'next-intl'
import BackButton from '@/components/layout/BackButton'
import { Calendar } from 'lucide-react'

type Term  = { id: string; name: string }
type Plan  = { id: string; name: string; price: string | number; sessions_count: number }
type Grade = { id: string; name: string }
type Class = { id: string; name: string; days_of_week?: string[]; start_time?: string }

const LABELS = {
  en: {
    title: 'Edit Student',
    sub: 'Update the student\'s information',
    nameAr: 'Full Name (Arabic)', nameEn: 'Full Name (English)',
    dob: 'Date of Birth', phone: 'Parent Phone', parentName: 'Parent Name',
    grade: 'Grade', gradeDefault: 'Select grade',
    level: 'Term', levelDefault: 'Select term',
    plan: 'Subscription Plan', planDefault: 'Select plan',
    discountedFees: 'Discounted Monthly Subscription Fees (EGP)',
    discountEndDate: 'End Discount Date',
    feesSection: 'Fees',
    class: 'Group', classDefault: 'Select group',
    notes: 'Notes', notesPlaceholder: 'Medical or administrative notes...',
    save: 'Save Changes', saving: 'Saving...', cancel: 'Cancel',
    back: 'Back',
    err: {
      name_ar_alpha:   'Arabic name must contain Arabic letters only',
      name_en_alpha:   'English name must contain English letters only',
      phone_required:  'Parent phone is required',
      phone_digits:    'Only English digits are allowed (0–9)',
      phone_starts_01: 'Phone number must start with 01',
      phone_11:        'Phone number must be exactly 11 digits',
      discounted_fees_invalid:  'Enter a whole number (no decimals)',
      discounted_fees_not_less: 'Discounted fees must be less than monthly fees',
      discount_end_date:        'End discount date is required when a discount is applied',
      discount_end_date_past:   'End discount date cannot be in the past',
    },
  },
  ar: {
    title: 'تعديل بيانات الطالبة',
    sub: 'قم بتعديل المعلومات الأساسية',
    nameAr: 'الاسم بالعربي', nameEn: 'الاسم بالإنجليزي',
    dob: 'تاريخ الميلاد', phone: 'هاتف ولي الأمر', parentName: 'اسم ولي الأمر',
    grade: 'الصف الدراسي', gradeDefault: 'اختر الصف',
    level: 'الفصل الدراسي', levelDefault: 'اختر الفصل',
    plan: 'خطة الاشتراك', planDefault: 'اختر الخطة',
    discountedFees: 'رسوم الاشتراك الشهري المخفضة (جنيه)',
    discountEndDate: 'تاريخ انتهاء التخفيض',
    feesSection: 'الاشتراك الشهري',
    class: 'المجموعة', classDefault: 'اختر المجموعه',
    notes: 'ملاحظات', notesPlaceholder: 'ملاحظات طبية أو إدارية...',
    save: 'حفظ التعديلات', saving: 'جارٍ الحفظ...', cancel: 'إلغاء',
    back: 'رجوع',
    err: {
      name_ar_alpha:   'يجب أن يحتوي الاسم بالعربي على حروف عربية فقط',
      name_en_alpha:   'يجب أن يحتوي الاسم بالإنجليزي على حروف إنجليزية فقط',
      phone_required:  'هاتف ولي الأمر مطلوب',
      phone_digits:    'يُسمح بالأرقام الإنجليزية فقط (0–9)',
      phone_starts_01: 'يجب أن يبدأ رقم الهاتف بـ 01',
      phone_11:        'يجب أن يكون رقم الهاتف 11 رقماً بالضبط',
      discounted_fees_invalid:  'أدخل رقماً صحيحاً (بدون أرقام عشرية)',
      discounted_fees_not_less: 'يجب أن تكون الرسوم المخفضة أقل من الرسوم الشهرية',
      discount_end_date:        'تاريخ انتهاء التخفيض مطلوب عند تطبيق خصم',
      discount_end_date_past:   'لا يمكن أن يكون تاريخ انتهاء التخفيض في الماضي',
    },
  },
}

function classLabel(c: Class) {
  const day  = c.days_of_week?.join(', ') || ''
  const time = c.start_time ? ` — ${c.start_time.slice(0, 5)}` : ''
  return day ? `${c.name} (${day}${time})` : c.name
}

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const router   = useRouter()
  const locale   = useLocale()
  const isRtl    = locale === 'ar'
  const L        = LABELS[isRtl ? 'ar' : 'en']
  const supabase = createClient()
  const dateRef  = useRef<HTMLInputElement>(null)

  const [loading,    setLoading]    = useState(false)
  const [fetching,   setFetching]   = useState(true)
  const [studentId,  setStudentId]  = useState('')
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [terms,      setTerms]      = useState<Term[]>([])
  const [plans,      setPlans]      = useState<Plan[]>([])
  // Values as loaded, to detect what changed on save
  const [activeSub,  setActiveSub]  = useState<{ id: string; plan_id: string | null; class_id: string | null } | null>(null)
  const [origDiscountEnd, setOrigDiscountEnd] = useState('')
  const [discountError,    setDiscountError]    = useState('')
  const [discountEndError, setDiscountEndError] = useState('')
  const [grades,     setGrades]     = useState<Grade[]>([])
  const [classes,    setClasses]    = useState<Class[]>([])
  const [error,      setError]      = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [nameArError, setNameArError] = useState('')
  const [nameEnError, setNameEnError] = useState('')

  const [form, setForm] = useState({
    name_ar: '', name_en: '', date_of_birth: '',
    parent_phone: '', parent_name: '',
    grade_id: '', term_id: '', class_id: '',
    plan_id: '', discounted_monthly_fees: '', discount_end_date: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const { id } = await params
      setStudentId(id)

      const [
        { data: student },
        { data: trms },
        { data: plns },
        { data: subs },
        { data: grds },
        { data: clss },
        { data: enrollment },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('id', id).single(),
        supabase.from('terms').select('id, name').order('name'),
        supabase.from('subscription_plans').select('id, name, price, sessions_count').eq('is_active', true).order('sessions_count'),
        supabase.from('subscriptions').select('id, plan_id, class_id').eq('student_id', id).eq('status', 'active'),
        supabase.from('grades').select('id, name').order('name'),
        supabase.from('classes').select('id, name, days_of_week, start_time').eq('is_active', true).order('name'),
        supabase.from('class_students').select('id, class_id').eq('student_id', id).limit(1).maybeSingle(),
      ])

      // The subscription the plan field edits: the one for the current group,
      // else a legacy one with no group, else any active one
      const currentSub =
        (subs || []).find((s: any) => enrollment?.class_id && s.class_id === enrollment.class_id) ||
        (subs || []).find((s: any) => !s.class_id) ||
        (subs || [])[0] || null
      setActiveSub(currentSub)

      if (student) {
        setOrigDiscountEnd(student.discount_end_date || '')
        setForm({
          plan_id:                 currentSub?.plan_id || '',
          discounted_monthly_fees: student.discounted_monthly_fees != null ? String(Math.round(Number(student.discounted_monthly_fees))) : '',
          discount_end_date:       student.discount_end_date || '',
          name_ar:       student.name_ar       || '',
          name_en:       student.name_en       || '',
          date_of_birth: student.date_of_birth || '',
          parent_phone:  student.parent_phone  || '',
          parent_name:   student.parent_name   || '',
          grade_id:      student.grade_id      || '',
          term_id:       student.term_id       || '',
          class_id:      enrollment?.class_id  || '',
          notes:         student.notes         || '',
        })
      }
      if (enrollment) setEnrollmentId(enrollment.id)
      if (trms)  setTerms(trms)
      if (plns)  setPlans(plns)
      if (grds)  setGrades(grds)
      if (clss)  setClasses(clss)
      setFetching(false)
    }
    load()
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (field === 'parent_phone') setPhoneError('')
    if (field === 'name_ar') setNameArError('')
    if (field === 'name_en') setNameEnError('')
    if (field === 'plan_id' || field === 'discounted_monthly_fees') setDiscountError('')
    if (field === 'plan_id' || field === 'discounted_monthly_fees' || field === 'discount_end_date') setDiscountEndError('')
  }

  // The discount must be below the selected plan's price (no plan selected → any amount is accepted)
  const selectedPlan = plans.find(p => p.id === form.plan_id)
  const planPrice    = Number(selectedPlan?.price || 0)
  const discountNum  = parseInt(form.discounted_monthly_fees || '0', 10) || 0
  const hasDiscount  = discountNum > 0 && (planPrice === 0 || discountNum < planPrice)

  function validateDiscount(value: string): string {
    if (!value.trim()) return ''
    if (!/^\d+$/.test(value.trim())) return L.err.discounted_fees_invalid
    if (planPrice > 0 && parseInt(value.trim(), 10) >= planPrice) return L.err.discounted_fees_not_less
    return ''
  }

  function validateDiscountEnd(value: string): string {
    if (hasDiscount && !value) return L.err.discount_end_date
    // An end date that was already saved may be in the past; only a newly chosen one is checked
    if (value && value !== origDiscountEnd) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      if (new Date(value + 'T00:00:00') < today) return L.err.discount_end_date_past
    }
    return ''
  }

  function validatePhone(value: string): string {
    if (!value.trim()) return L.err.phone_required
    if (!/^\d+$/.test(value.trim())) return L.err.phone_digits
    if (!value.trim().startsWith('01')) return L.err.phone_starts_01
    if (value.trim().length !== 11) return L.err.phone_11
    return ''
  }

  function validateNameAr(value: string): string {
    if (!value.trim()) return ''
    if (!/^[؀-ۿ\s]+$/.test(value.trim())) return L.err.name_ar_alpha
    return ''
  }

  function validateNameEn(value: string): string {
    if (!value.trim()) return ''
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) return L.err.name_en_alpha
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const arMsg = validateNameAr(form.name_ar)
    const enMsg = validateNameEn(form.name_en)
    const phoneMsg = validatePhone(form.parent_phone)

    if (arMsg) { setNameArError(arMsg) }
    if (enMsg) { setNameEnError(enMsg) }
    if (phoneMsg) { setPhoneError(phoneMsg) }
    const discountMsg    = validateDiscount(form.discounted_monthly_fees)
    const discountEndMsg = discountMsg ? '' : validateDiscountEnd(form.discount_end_date)
    setDiscountError(discountMsg)
    setDiscountEndError(discountEndMsg)
    if (arMsg || enMsg || phoneMsg || discountMsg || discountEndMsg) return

    setLoading(true)

    const plan = selectedPlan
    const df   = discountNum

    const { error: err } = await supabase.from('students').update({
      name_ar:       form.name_ar,
      name_en:       form.name_en,
      date_of_birth: form.date_of_birth,
      parent_phone:  form.parent_phone,
      parent_name:   form.parent_name  || null,
      grade_id:      form.grade_id     || null,
      term_id:       form.term_id      || null,
      ...(plan ? { monthly_fees: planPrice || null } : {}),
      discounted_monthly_fees: hasDiscount ? df : null,
      discount_end_date:       hasDiscount && form.discount_end_date ? form.discount_end_date : null,
      notes:         form.notes        || null,
      updated_at:    new Date().toISOString(),
    }).eq('id', studentId)

    if (err) { setError(err.message); setLoading(false); return }

    const newClassId = form.class_id || null

    if (enrollmentId && newClassId === null) {
      await supabase.from('class_students').delete().eq('id', enrollmentId)
    } else if (enrollmentId && newClassId) {
      await supabase.from('class_students').update({ class_id: newClassId }).eq('id', enrollmentId)
    } else if (!enrollmentId && newClassId) {
      await supabase.from('class_students').insert({
        student_id:    studentId,
        class_id:      newClassId,
        enrolled_date: new Date().toISOString().split('T')[0],
      })
    }

    // Subscription: keep it on the student's group and plan
    if (activeSub) {
      const subUpdates: Record<string, any> = {}
      // New plan applies from the next renewal; sessions already counted are left as they are
      if (plan && plan.id !== activeSub.plan_id) subUpdates.plan_id = plan.id
      // Group changed → move the subscription with the student
      if (newClassId && activeSub.class_id && activeSub.class_id !== newClassId) subUpdates.class_id = newClassId
      if (Object.keys(subUpdates).length > 0) {
        await supabase.from('subscriptions').update(subUpdates).eq('id', activeSub.id)
      }
    } else if (plan) {
      // No active subscription yet → start one, same as the new-student form
      await supabase.from('subscriptions').insert({
        student_id:         studentId,
        class_id:           newClassId,
        plan_id:            plan.id,
        total_sessions:     plan.sessions_count ?? 4,
        remaining_sessions: plan.sessions_count ?? 4,
        start_date:         new Date().toISOString().split('T')[0],
        status:             'active',
      })
    }

    router.push(`/dashboard/students/${studentId}`)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--txt1)',
    outline: 'none', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const errMsg: React.CSSProperties = {
    fontSize: 11, color: '#e04040', marginTop: 4,
  }
  const sel: React.CSSProperties = {
    ...inp, cursor: 'pointer',
    ...(isRtl ? { direction: 'ltr', textAlign: 'right' } : {}),
  }
  const req = <span style={{ color: '#e04040' }}> *</span>

  if (fetching) return (
    <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--txt2)' }}>{isRtl ? 'جارٍ التحميل...' : 'Loading...'}</span>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <BackButton label={L.back} fallback={`/dashboard/students/${studentId}`} variant="primary" />
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
                <input required dir="rtl" value={form.name_ar}
                  onChange={e => set('name_ar', e.target.value.replace(/[^؀-ۿ\s]/g, ''))}
                  onBlur={() => { const msg = validateNameAr(form.name_ar); setNameArError(msg) }}
                  placeholder="مريم أحمد"
                  style={{ ...inp, borderColor: nameArError ? '#e04040' : undefined }} />
                {nameArError && <p style={errMsg}>⚠ {nameArError}</p>}
              </div>
              <div>
                <label style={lbl}>{L.nameEn}{req}</label>
                <input required dir="ltr" value={form.name_en}
                  onChange={e => set('name_en', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  onBlur={() => { const msg = validateNameEn(form.name_en); setNameEnError(msg) }}
                  placeholder="Mariam Ahmed"
                  style={{ ...inp, borderColor: nameEnError ? '#e04040' : undefined }} />
                {nameEnError && <p style={errMsg}>⚠ {nameEnError}</p>}
              </div>
            </div>

            {/* Row 2 — DOB & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{L.dob}{req}</label>
                <div style={{ position: 'relative', direction: 'ltr' }}>
                  <input required type="date" ref={dateRef} dir="ltr" value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)}
                    style={{ ...inp, paddingRight: 36 }} />
                  <button type="button"
                    onClick={() => { try { dateRef.current?.showPicker() } catch {} }}
                    style={{
                      position: 'absolute', right: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'var(--txt2)', display: 'flex', alignItems: 'center',
                    }}>
                    <Calendar size={15} />
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>{L.phone}{req}</label>
                <input required dir="ltr" inputMode="numeric" maxLength={11}
                  value={form.parent_phone}
                  onChange={e => set('parent_phone', e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => { const msg = validatePhone(form.parent_phone); setPhoneError(msg) }}
                  placeholder="01012345678"
                  style={{ ...inp, borderColor: phoneError ? '#e04040' : undefined }} />
                {phoneError && <p style={errMsg}>⚠ {phoneError}</p>}
              </div>
            </div>

            {/* Row 3 — Parent Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.parentName}</label>
              <input value={form.parent_name}
                onChange={e => set('parent_name', e.target.value)}
                placeholder={isRtl ? 'أحمد محمد' : 'Ahmed Mohamed'} style={inp} />
            </div>

            {/* Row 4 — Grade & Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{L.grade}</label>
                <select value={form.grade_id} onChange={e => set('grade_id', e.target.value)} style={sel}>
                  <option value="">{L.gradeDefault}</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{L.level}</label>
                <select value={form.term_id} onChange={e => set('term_id', e.target.value)} style={sel}>
                  <option value="">{L.levelDefault}</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 5 — Class */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.class}</label>
              <select value={form.class_id} onChange={e => set('class_id', e.target.value)} style={sel}>
                <option value="">{L.classDefault}</option>
                {classes.map(c => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
              </select>
            </div>

            {/* Row 6 — Fees */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', margin: '0 0 10px', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                💰 {L.feesSection}
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>{L.plan}</label>
                <select value={form.plan_id} onChange={e => set('plan_id', e.target.value)} style={sel}>
                  <option value="">{L.planDefault}</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {Number(p.price).toLocaleString()} EGP / {p.sessions_count} {isRtl ? 'حصص' : 'sessions'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>{L.discountedFees}</label>
                <input
                  value={form.discounted_monthly_fees}
                  onChange={e => set('discounted_monthly_fees', e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => setDiscountError(validateDiscount(form.discounted_monthly_fees))}
                  inputMode="numeric" placeholder="0" dir="ltr"
                  style={{ ...inp, borderColor: discountError ? '#e04040' : undefined }}
                />
                {discountError && <p style={errMsg}>⚠ {discountError}</p>}
              </div>

              {/* End Discount Date — shown + required only when a discount exists */}
              {hasDiscount && (
                <div>
                  <label style={lbl}>{L.discountEndDate}{req}</label>
                  <input
                    type="date" dir="ltr"
                    value={form.discount_end_date}
                    onChange={e => set('discount_end_date', e.target.value)}
                    onBlur={() => setDiscountEndError(validateDiscountEnd(form.discount_end_date))}
                    style={{ ...inp, borderColor: discountEndError ? '#e04040' : undefined }}
                  />
                  {discountEndError && <p style={errMsg}>⚠ {discountEndError}</p>}
                </div>
              )}
            </div>

            {/* Row 7 — Notes */}
            <div>
              <label style={lbl}>{L.notes}</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder={L.notesPlaceholder} rows={3}
                style={{ ...inp, resize: 'vertical' }} />
            </div>

            {error && (
              <div style={{
                marginTop: 14, background: '#e0404010', border: '1px solid #e0404030',
                borderRadius: 8, padding: '10px 14px', color: '#e04040', fontSize: 12,
              }}>
                {error}
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
            <BackButton label={L.cancel} fallback={`/dashboard/students/${studentId}`} />
          </div>
        </form>
      </div>
    </div>
  )
}
