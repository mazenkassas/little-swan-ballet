'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from 'next-intl'
import BackButton from '@/components/layout/BackButton'
import { Calendar } from 'lucide-react'

type Level = { id: string; name: string }
type Grade = { id: string; name: string }
type Class = { id: string; name: string; days_of_week?: string[]; start_time?: string }

const LABELS = {
  en: {
    title: 'Edit Student',
    sub: 'Update the student\'s information',
    nameAr: 'Full Name (Arabic)', nameEn: 'Full Name (English)',
    dob: 'Date of Birth', phone: 'Parent Phone', parentName: 'Parent Name',
    grade: 'Grade', gradeDefault: 'Select grade',
    level: 'Level', levelDefault: 'Select level',
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
    },
  },
  ar: {
    title: 'تعديل بيانات الطالبة',
    sub: 'قم بتعديل المعلومات الأساسية',
    nameAr: 'الاسم بالعربي', nameEn: 'الاسم بالإنجليزي',
    dob: 'تاريخ الميلاد', phone: 'هاتف ولي الأمر', parentName: 'اسم ولي الأمر',
    grade: 'الصف الدراسي', gradeDefault: 'اختر الصف',
    level: 'المستوى', levelDefault: 'اختر المستوي',
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
  const [levels,     setLevels]     = useState<Level[]>([])
  const [grades,     setGrades]     = useState<Grade[]>([])
  const [classes,    setClasses]    = useState<Class[]>([])
  const [error,      setError]      = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [nameArError, setNameArError] = useState('')
  const [nameEnError, setNameEnError] = useState('')

  const [form, setForm] = useState({
    name_ar: '', name_en: '', date_of_birth: '',
    parent_phone: '', parent_name: '',
    grade_id: '', level_id: '', class_id: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const { id } = await params
      setStudentId(id)

      const [
        { data: student },
        { data: lvls },
        { data: grds },
        { data: clss },
        { data: enrollment },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('id', id).single(),
        supabase.from('levels').select('id, name').order('order_num'),
        supabase.from('grades').select('id, name').order('name'),
        supabase.from('classes').select('id, name, days_of_week, start_time').eq('is_active', true).order('name'),
        supabase.from('class_students').select('id, class_id').eq('student_id', id).limit(1).maybeSingle(),
      ])

      if (student) {
        setForm({
          name_ar:       student.name_ar       || '',
          name_en:       student.name_en       || '',
          date_of_birth: student.date_of_birth || '',
          parent_phone:  student.parent_phone  || '',
          parent_name:   student.parent_name   || '',
          grade_id:      student.grade_id      || '',
          level_id:      student.level_id      || '',
          class_id:      enrollment?.class_id  || '',
          notes:         student.notes         || '',
        })
      }
      if (enrollment) setEnrollmentId(enrollment.id)
      if (lvls)  setLevels(lvls)
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
    if (arMsg || enMsg || phoneMsg) return

    setLoading(true)

    const { error: err } = await supabase.from('students').update({
      name_ar:       form.name_ar,
      name_en:       form.name_en,
      date_of_birth: form.date_of_birth,
      parent_phone:  form.parent_phone,
      parent_name:   form.parent_name  || null,
      grade_id:      form.grade_id     || null,
      level_id:      form.level_id     || null,
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
                <select value={form.level_id} onChange={e => set('level_id', e.target.value)} style={sel}>
                  <option value="">{L.levelDefault}</option>
                  {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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

            {/* Row 6 — Notes */}
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
