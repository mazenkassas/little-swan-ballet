'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const LABELS = {
  en: {
    back: 'Back',
    title: 'New Staff Member',
    sub: 'Fill in the staff member details below',
    nameAr: 'Full Name (Arabic)',
    nameEn: 'Full Name (English)',
    role: 'Role',
    roleDefault: 'Select role',
    email: 'Email Address',
    password: 'Login Password',
    phone: 'Phone Number',
    rate: 'Monthly Salary (EGP)',
    nameArPlaceholder: '',
    nameEnPlaceholder: '',
    emailPlaceholder: '',
    phonePlaceholder: '',
    ratePlaceholder: '',
    roles: { super_admin: 'Super Admin', admin: 'Admin', staff: 'Staff' },
    save: 'Save Staff',
    saving: 'Saving…',
    cancel: 'Cancel',
    err: {
      name_ar:         'Arabic name is required',
      name_ar_alpha:   'Arabic name must contain Arabic letters only',
      name_en:         'English name is required',
      name_en_alpha:   'English name must contain English letters only',
      role:            'Role is required',
      email:           'Email address is required',
      email_format:    'Enter a valid email address',
      password:        'Password is required',
      password_min:    'Password must be at least 6 characters',
      phone:           'Phone number is required',
      phone_digits:    'Only English digits are allowed (0–9)',
      phone_starts_01: 'Phone number must start with 01',
      phone_11:        'Phone number must be exactly 11 digits',
      hourly_rate:     'Monthly salary is required',
      hourly_rate_pos: 'Monthly salary must be greater than 0',
    },
  },
  ar: {
    back: 'رجوع',
    title: 'موظف جديد',
    sub: 'أدخل بيانات الموظف الجديد',
    nameAr: 'الاسم بالعربي',
    nameEn: 'الاسم بالإنجليزي',
    role: 'الدور الوظيفي',
    roleDefault: 'اختر الدور',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    phone: 'رقم الهاتف',
    rate: 'الراتب الشهري (جنيه)',
    nameArPlaceholder: '',
    nameEnPlaceholder: '',
    emailPlaceholder: '',
    phonePlaceholder: '',
    ratePlaceholder: '',
    roles: { super_admin: 'مشرف عام', admin: 'مدير', staff: 'موظف' },
    save: 'حفظ الموظف',
    saving: 'جارٍ الحفظ…',
    cancel: 'إلغاء',
    err: {
      name_ar:         'الاسم بالعربي مطلوب',
      name_ar_alpha:   'يجب أن يحتوي الاسم على حروف عربية فقط',
      name_en:         'الاسم بالإنجليزي مطلوب',
      name_en_alpha:   'يجب أن يحتوي الاسم على حروف إنجليزية فقط',
      role:            'الدور الوظيفي مطلوب',
      email:           'البريد الإلكتروني مطلوب',
      email_format:    'أدخل بريدًا إلكترونيًا صحيحًا',
      password:        'كلمة المرور مطلوبة',
      password_min:    'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      phone:           'رقم الهاتف مطلوب',
      phone_digits:    'يُسمح فقط بالأرقام الإنجليزية (0–9)',
      phone_starts_01: 'يجب أن يبدأ رقم الهاتف بـ 01',
      phone_11:        'يجب أن يكون رقم الهاتف 11 رقمًا بالضبط',
      hourly_rate:     'الراتب الشهري مطلوب',
      hourly_rate_pos: 'يجب أن يكون الراتب الشهري أكبر من صفر',
    },
  },
}

type FormFields = 'name_ar' | 'name_en' | 'role' | 'email' | 'password' | 'phone' | 'hourly_rate'

export default function NewStaffPage() {
  const router   = useRouter()
  const locale   = useLocale()
  const isRtl    = locale === 'ar'
  const L        = LABELS[isRtl ? 'ar' : 'en']
  const supabase = createClient()

  const [loading,      setLoading]      = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverErr,    setServerErr]    = useState('')
  const [errors,       setErrors]       = useState<Partial<Record<FormFields, string>>>({})
  const [touched,      setTouched]      = useState<Partial<Record<FormFields, boolean>>>({})
  const [form,         setForm]         = useState({
    name_ar: '', name_en: '', role: '', email: '',
    password: '', phone: '', hourly_rate: '',
  })

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
      case 'role':
        return value ? undefined : L.err.role
      case 'email':
        if (!value.trim()) return L.err.email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return L.err.email_format
        return undefined
      case 'password':
        if (!value) return L.err.password
        if (value.length < 6) return L.err.password_min
        return undefined
      case 'phone': {
        if (!value.trim()) return L.err.phone
        if (!/^\d+$/.test(value.trim())) return L.err.phone_digits
        if (!value.trim().startsWith('01')) return L.err.phone_starts_01
        if (value.trim().length !== 11) return L.err.phone_11
        return undefined
      }
      case 'hourly_rate':
        if (form.role === 'super_admin') return undefined
        if (!value) return L.err.hourly_rate
        if (parseFloat(value) <= 0) return L.err.hourly_rate_pos
        return undefined
    }
  }

  function validateAll(): Partial<Record<FormFields, string>> {
    const fields: FormFields[] = ['name_ar', 'name_en', 'role', 'email', 'password', 'phone', 'hourly_rate']
    const result: Partial<Record<FormFields, string>> = {}
    for (const f of fields) {
      const msg = validateField(f, form[f as keyof typeof form])
      if (msg) result[f] = msg
    }
    return result
  }

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key as FormFields]) setErrors(e => ({ ...e, [key]: undefined }))
  }

  function touch(field: FormFields) {
    setTouched(t => ({ ...t, [field]: true }))
    const msg = validateField(field, form[field as keyof typeof form])
    setErrors(e => ({ ...e, [field]: msg }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerErr('')
    const allErrors = validateAll()
    const allTouched = Object.fromEntries(
      (['name_ar', 'name_en', 'role', 'email', 'password', 'phone', 'hourly_rate'] as FormFields[]).map(f => [f, true])
    ) as Record<FormFields, boolean>
    setTouched(allTouched)
    setErrors(allErrors)
    if (Object.keys(allErrors).length > 0) return

    setLoading(true)
    const payload: Record<string, unknown> = {
      name:          form.name_ar,
      name_en:       form.name_en,
      email:         form.email,
      password_hash: form.password,
      role:          form.role,
      phone:         form.phone,
      is_active:     true,
    }
    if (form.hourly_rate) payload.monthly_salary = parseFloat(form.hourly_rate)

    const { error: err } = await supabase.from('staff').insert(payload)
    if (err) { setServerErr(err.message); setLoading(false) }
    else router.push('/dashboard/staff')
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

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const req = <span style={{ color: '#e04040' }}> *</span>

  function Err({ field }: { field: FormFields }) {
    if (!touched[field] || !errors[field]) return null
    return <p style={{ fontSize: 11, color: '#e04040', marginTop: 4 }}>⚠ {errors[field]}</p>
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/dashboard/staff" style={{
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
              👤 {L.title}
            </p>

            {/* Names row */}
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

            {/* Role */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.role}{req}</label>
              <select value={form.role}
                onChange={e => {
                  set('role', e.target.value)
                  if (e.target.value === 'super_admin') setErrors(err => ({ ...err, hourly_rate: undefined }))
                }}
                onBlur={() => touch('role')}
                style={{ ...inpStyle('role'), cursor: 'pointer' }}>
                <option value="">{L.roleDefault}</option>
                <option value="super_admin">{L.roles.super_admin}</option>
                <option value="admin">{L.roles.admin}</option>
                <option value="staff">{L.roles.staff}</option>
              </select>
              <Err field="role" />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.email}{req}</label>
              <input type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                onBlur={() => touch('email')}
                placeholder="" dir="ltr" autoComplete="off"
                style={inpStyle('email')} />
              <Err field="email" />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{L.password}{req}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onBlur={() => touch('password')}
                  placeholder="" dir="ltr" autoComplete="new-password"
                  style={{ ...inpStyle('password'), paddingInlineEnd: 36 }} />
                <button type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)', zIndex: 2,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#d4667a', display: 'flex', alignItems: 'center',
                  }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Err field="password" />
            </div>

            {/* Phone + Rate row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>{L.phone}{req}</label>
                <input value={form.phone}
                  onChange={e => set('phone', e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => touch('phone')}
                  placeholder={L.phonePlaceholder} dir="ltr"
                  inputMode="numeric" maxLength={11}
                  style={inpStyle('phone')} />
                <Err field="phone" />
              </div>
              <div>
                <label style={lbl}>{L.rate}{form.role !== 'super_admin' && req}</label>
                <input type="number" min="0" value={form.hourly_rate}
                  onChange={e => set('hourly_rate', e.target.value)}
                  onBlur={() => touch('hourly_rate')}
                  placeholder={L.ratePlaceholder} dir="ltr"
                  style={inpStyle('hourly_rate')} />
                <Err field="hourly_rate" />
              </div>
            </div>

            {serverErr && (
              <div style={{
                background: '#e0404012', border: '1px solid #e0404028',
                borderRadius: 10, padding: '10px 14px',
                color: '#e04040', fontSize: 12, marginTop: 4,
              }}>
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
            <Link href="/dashboard/staff" style={{
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
