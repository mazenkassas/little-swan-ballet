'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Sun, Moon } from 'lucide-react'

type Lang = 'ar' | 'en'

const L = {
  ar: {
    title: 'Little Swan',
    subtitle: 'أكاديمية الباليه',
    slogan: 'حيث تبدأ رحلة الرقص',
    heading: 'تعيين كلمة مرور جديدة',
    sub: 'أدخل كلمة المرور الجديدة',
    newPass: 'كلمة المرور الجديدة',
    confirmPass: 'تأكيد كلمة المرور',
    submit: 'تعيين كلمة المرور',
    loading: 'جارٍ الحفظ...',
    success: 'تم تغيير كلمة المرور بنجاح! جارٍ التحويل...',
    errMatch: 'كلمتا المرور غير متطابقتين',
    errShort: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
    errGeneral: 'حدث خطأ، يرجى المحاولة مرة أخرى',
    errSession: 'انتهت صلاحية الرابط أو غير صالح، يرجى طلب رابط جديد',
    backLogin: 'العودة لتسجيل الدخول',
  },
  en: {
    title: 'Little Swan',
    subtitle: 'Ballet Academy',
    slogan: 'Where the dance journey begins',
    heading: 'Set New Password',
    sub: 'Enter your new password below',
    newPass: 'New Password',
    confirmPass: 'Confirm Password',
    submit: 'Set Password',
    loading: 'Saving...',
    success: 'Password changed successfully! Redirecting...',
    errMatch: 'Passwords do not match',
    errShort: 'Password must be at least 8 characters',
    errGeneral: 'An error occurred, please try again',
    errSession: 'Link is expired or invalid, please request a new one',
    backLogin: 'Back to Sign In',
  },
}

export default function ResetPasswordPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [dark, setDark] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )locale=([^;]*)/)
    if (m && (m[1] === 'ar' || m[1] === 'en')) setLang(m[1] as Lang)
    setDark(document.documentElement.classList.contains('dark'))

    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session)
    })
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('ls-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('ls-theme', 'light')
    }
  }

  const T = L[lang]
  const isRtl = lang === 'ar'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError(T.errShort); return }
    if (password !== confirm) { setError(T.errMatch); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(T.errGeneral)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%',
    background: dark ? 'rgba(255,255,255,0.07)' : '#FDFAF8',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : '#EDD8DC'}`,
    borderRadius: 10, padding: '11px 14px', fontSize: 13,
    color: dark ? '#ffffff' : '#2C1F24',
    outline: 'none', fontFamily: 'inherit', direction: isRtl ? 'rtl' : 'ltr',
  }

  const btnBase: React.CSSProperties = {
    background: dark ? 'rgba(255,255,255,0.08)' : 'white',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#EDD8DC'}`,
    color: dark ? 'rgba(255,255,255,0.7)' : '#7A5C63',
    cursor: 'pointer', fontWeight: 500,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: dark ? '#0f0f1a' : 'linear-gradient(135deg,#FDF6F8,#F5E6EA,#FDF6F8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative', direction: isRtl ? 'rtl' : 'ltr',
      transition: 'background 0.3s',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#C8788A' }} />

      {/* Lang toggle */}
      <button
        onClick={() => {
          const next = lang === 'ar' ? 'en' : 'ar'
          setLang(next)
          document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`
        }}
        style={{
          ...btnBase,
          position: 'absolute', top: 16, left: isRtl ? 'auto' : 16, right: isRtl ? 16 : 'auto',
          borderRadius: 20, padding: '5px 14px', fontSize: 12,
        }}
      >
        {lang === 'ar' ? 'EN' : 'عربي'}
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          ...btnBase,
          position: 'absolute', top: 16,
          left: isRtl ? 16 : 'auto', right: isRtl ? 'auto' : 16,
          borderRadius: 20, padding: '5px 10px', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {dark ? <Sun size={14} /> : <Moon size={14} />}
        {dark ? (isRtl ? 'فاتح' : 'Light') : (isRtl ? 'داكن' : 'Dark')}
      </button>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: dark ? 'rgba(255,255,255,0.07)' : 'white',
            border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : '#EDD8DC'}`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px', fontSize: 28,
          }}>🩰</div>
          <h1 style={{ fontSize: 28, fontFamily: 'Georgia,serif', fontStyle: 'italic', color: '#C8788A', fontWeight: 400, margin: 0 }}>
            {T.title}
          </h1>
          <p style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,0.4)' : '#B89CA0', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6 }}>
            {T.subtitle}
          </p>
          <div style={{ width: 40, height: 1.5, background: dark ? 'rgba(232,180,192,0.35)' : '#E8B4C0', margin: '12px auto 0' }} />
        </div>

        {/* Card */}
        <div style={{
          background: dark ? '#1e1e2e' : 'white',
          borderRadius: 20,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#EDD8DC'}`,
          padding: '32px 28px',
          boxShadow: dark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(200,120,138,0.12)',
          transition: 'background 0.3s',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: dark ? '#ffffff' : '#2C1F24', marginBottom: 4, textAlign: 'center' }}>{T.heading}</h2>
          <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.45)' : '#B89CA0', marginBottom: 24, textAlign: 'center' }}>{T.sub}</p>

          {sessionReady === false ? (
            <div style={{
              background: dark ? 'rgba(244,192,204,0.12)' : '#FFF0F2',
              border: `1px solid ${dark ? 'rgba(244,192,204,0.3)' : '#F4C0CC'}`,
              borderRadius: 8, padding: '12px 14px', fontSize: 13,
              color: dark ? '#F4A0B0' : '#8B4A58', textAlign: 'center', marginBottom: 16,
            }}>
              {T.errSession}
            </div>
          ) : done ? (
            <div style={{ background: dark ? 'rgba(74,140,106,0.15)' : '#E8F5EE', border: `1px solid ${dark ? 'rgba(74,140,106,0.4)' : '#4A8C6A'}`, borderRadius: 10, padding: '16px', textAlign: 'center', color: dark ? '#6DCCA0' : '#4A8C6A', fontSize: 13 }}>
              {T.success}
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.6)' : '#7A5C63', marginBottom: 6 }}>{T.newPass}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" name="new-password"
                    style={{ ...inp, paddingLeft: isRtl ? 14 : 40, paddingRight: isRtl ? 40 : 14 }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: isRtl ? 'auto' : 12, right: isRtl ? 12 : 'auto',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: dark ? 'rgba(255,255,255,0.4)' : '#B89CA0',
                    display: 'flex', alignItems: 'center', padding: 0,
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.6)' : '#7A5C63', marginBottom: 6 }}>{T.confirmPass}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password" name="confirm-password"
                    style={{ ...inp, paddingLeft: isRtl ? 14 : 40, paddingRight: isRtl ? 40 : 14 }}
                  />
                  <button type="button" onClick={() => setShowConfirm(s => !s)} style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: isRtl ? 'auto' : 12, right: isRtl ? 12 : 'auto',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: dark ? 'rgba(255,255,255,0.4)' : '#B89CA0',
                    display: 'flex', alignItems: 'center', padding: 0,
                  }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  background: dark ? 'rgba(244,192,204,0.12)' : '#FFF0F2',
                  border: `1px solid ${dark ? 'rgba(244,192,204,0.3)' : '#F4C0CC'}`,
                  borderRadius: 8, padding: '10px 14px', fontSize: 12,
                  color: dark ? '#F4A0B0' : '#8B4A58', textAlign: 'center',
                }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                background: loading ? '#E8B4C0' : '#C8788A', color: 'white',
                border: 'none', borderRadius: 10, padding: '13px', fontSize: 14,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, fontFamily: 'inherit',
              }}>
                {loading ? T.loading : T.submit}
              </button>
            </form>
          )}

          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'none', border: 'none',
              color: dark ? 'rgba(255,255,255,0.4)' : '#B89CA0',
              fontSize: 12, cursor: 'pointer', textAlign: 'center',
              fontFamily: 'inherit', marginTop: 16, display: 'block', width: '100%',
            }}
          >
            ← {T.backLogin}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: dark ? 'rgba(255,255,255,0.3)' : '#B89CA0', fontSize: 11, marginTop: 20 }}>
          {T.slogan}
        </p>
      </div>
    </div>
  )
}
