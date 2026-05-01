'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Sun, Moon } from 'lucide-react'

type Lang = 'ar' | 'en'

const t = {
  ar: {
    title: 'Little Swan',
    subtitle: 'أكاديمية الباليه',
    slogan: 'حيث تبدأ رحلة الرقص',
    login: 'تسجيل الدخول',
    loginSub: 'أدخل بياناتك للوصول إلى النظام',
    email: 'البريد الإلكتروني',
    emailPh: '',
    password: 'كلمة المرور',
    passwordPh: '',
    submit: 'دخول',
    loading: 'جارٍ الدخول...',
    forgot: 'نسيت كلمة المرور؟',
    forgotSub: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين',
    send: 'إرسال رابط التعيين',
    sending: 'جارٍ الإرسال...',
    sent: 'تم إرسال رابط إعادة التعيين! تحقق من بريدك.',
    back: 'العودة لتسجيل الدخول',
    errEmpty: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
    errEmail: 'يرجى إدخال البريد الإلكتروني',
    errInvalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    errGeneral: 'حدث خطأ، يرجى المحاولة مرة أخرى',
  },
  en: {
    title: 'Little Swan',
    subtitle: 'Ballet Academy',
    slogan: 'Where the dance journey begins',
    login: 'Sign In',
    loginSub: 'Enter your credentials to access the system',
    email: 'Email Address',
    emailPh: '',
    password: 'Password',
    passwordPh: '',
    submit: 'Sign In',
    loading: 'Signing in...',
    forgot: 'Forgot password?',
    forgotSub: 'Enter your email and we will send you a reset link',
    send: 'Send Reset Link',
    sending: 'Sending...',
    sent: 'Reset link sent! Check your email.',
    back: 'Back to Sign In',
    errEmpty: 'Please enter your email and password',
    errEmail: 'Please enter your email',
    errInvalid: 'Invalid email or password',
    errGeneral: 'An error occurred, please try again',
  }
}

export default function LoginPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )locale=([^;]*)/)
    if (m && (m[1] === 'ar' || m[1] === 'en')) setLang(m[1] as Lang)
    setDark(document.documentElement.classList.contains('dark'))
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [forgotSent, setForgotSent] = useState(false)
  const router = useRouter()
  const T = t[lang]
  const isRtl = lang === 'ar'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError(T.errEmpty)
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      if (err.message.includes('Invalid')) setError(T.errInvalid)
      else setError(T.errGeneral)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError(T.errEmail); return }
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    setForgotSent(true)
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
        title={dark ? 'Light mode' : 'Dark mode'}
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
          transition: 'background 0.3s, border-color 0.3s',
        }}>
          {mode === 'login' ? (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: dark ? '#ffffff' : '#2C1F24', marginBottom: 4, textAlign: 'center' }}>{T.login}</h2>
              <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.45)' : '#B89CA0', marginBottom: 24, textAlign: 'center' }}>{T.loginSub}</p>

              <form onSubmit={handleLogin} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.6)' : '#7A5C63', marginBottom: 6 }}>{T.email}</label>
                  <input
                    type="text" inputMode="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="" autoComplete="off" name="ls-email" style={inp}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.6)' : '#7A5C63', marginBottom: 6 }}>{T.password}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="" autoComplete="new-password" name="ls-password"
                      style={{ ...inp, paddingLeft: isRtl ? 14 : 40, paddingRight: isRtl ? 40 : 14 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      style={{
                        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                        left: isRtl ? 'auto' : 12, right: isRtl ? 12 : 'auto',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: dark ? 'rgba(255,255,255,0.4)' : '#B89CA0',
                        display: 'flex', alignItems: 'center', padding: 0,
                      }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
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

                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setEmail(''); setPassword('') }}
                  style={{
                    background: 'none', border: 'none', color: '#C8788A',
                    fontSize: 12, cursor: 'pointer', textAlign: 'center',
                    fontFamily: 'inherit', marginTop: 4,
                  }}
                >
                  {T.forgot}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: dark ? '#ffffff' : '#2C1F24', marginBottom: 4, textAlign: 'center' }}>{T.forgot}</h2>
              <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.45)' : '#B89CA0', marginBottom: 24, textAlign: 'center' }}>{T.forgotSub}</p>

              {forgotSent ? (
                <div style={{ background: dark ? 'rgba(74,140,106,0.15)' : '#E8F5EE', border: `1px solid ${dark ? 'rgba(74,140,106,0.4)' : '#4A8C6A'}`, borderRadius: 10, padding: '16px', textAlign: 'center', color: dark ? '#6DCCA0' : '#4A8C6A', fontSize: 13 }}>
                  {T.sent}
                </div>
              ) : (
                <form onSubmit={handleForgot} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.6)' : '#7A5C63', marginBottom: 6 }}>{T.email}</label>
                    <input type="text" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="" autoComplete="off" name="ls-forgot-email" style={inp} />
                  </div>
                  {error && (
                    <div style={{ background: dark ? 'rgba(244,192,204,0.12)' : '#FFF0F2', border: `1px solid ${dark ? 'rgba(244,192,204,0.3)' : '#F4C0CC'}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: dark ? '#F4A0B0' : '#8B4A58', textAlign: 'center' }}>
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={loading} style={{
                    background: loading ? '#E8B4C0' : '#C8788A', color: 'white', border: 'none',
                    borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}>
                    {loading ? T.sending : T.send}
                  </button>
                </form>
              )}

              <button
                onClick={() => { setMode('login'); setError(''); setForgotSent(false); setEmail('') }}
                style={{
                  background: 'none', border: 'none',
                  color: dark ? 'rgba(255,255,255,0.4)' : '#B89CA0',
                  fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  fontFamily: 'inherit', marginTop: 16, display: 'block', width: '100%',
                }}
              >
                ← {T.back}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: dark ? 'rgba(255,255,255,0.3)' : '#B89CA0', fontSize: 11, marginTop: 20 }}>
          {T.slogan}
        </p>
      </div>
    </div>
  )
}
