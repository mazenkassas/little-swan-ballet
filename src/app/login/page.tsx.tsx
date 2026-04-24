'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

type Lang = 'ar' | 'en'

const t = {
  ar: {
    title: 'Little Swan',
    subtitle: 'أكاديمية الباليه',
    slogan: 'حيث تبدأ رحلة الرقص',
    login: 'تسجيل الدخول',
    loginSub: 'أدخل بياناتك للوصول إلى النظام',
    email: 'البريد الإلكتروني',
    emailPh: 'أدخل بريدك الإلكتروني',
    password: 'كلمة المرور',
    passwordPh: 'أدخل كلمة المرور',
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
    emailPh: 'Enter your email',
    password: 'Password',
    passwordPh: 'Enter your password',
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
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    setForgotSent(true)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#FDFAF8', border: '1px solid #EDD8DC',
    borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#2C1F24',
    outline: 'none', fontFamily: 'inherit', direction: isRtl ? 'rtl' : 'ltr',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#FDF6F8,#F5E6EA,#FDF6F8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative', direction: isRtl ? 'rtl' : 'ltr',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#C8788A' }} />

      {/* Lang toggle */}
      <button
        onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
        style={{
          position: 'absolute', top: 16, left: isRtl ? 'auto' : 16, right: isRtl ? 16 : 'auto',
          background: 'white', border: '1px solid #EDD8DC', borderRadius: 20,
          padding: '5px 14px', fontSize: 12, color: '#7A5C63', cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        {lang === 'ar' ? 'EN' : 'عربي'}
      </button>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'white',
            border: '1.5px solid #EDD8DC', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px', fontSize: 28,
          }}>🩰</div>
          <h1 style={{ fontSize: 28, fontFamily: 'Georgia,serif', fontStyle: 'italic', color: '#C8788A', fontWeight: 400, margin: 0 }}>
            {T.title}
          </h1>
          <p style={{ fontSize: 10, color: '#B89CA0', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6 }}>
            {T.subtitle}
          </p>
          <div style={{ width: 40, height: 1.5, background: '#E8B4C0', margin: '12px auto 0' }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 20, border: '1px solid #EDD8DC',
          padding: '32px 28px', boxShadow: '0 8px 40px rgba(200,120,138,0.12)',
        }}>
          {mode === 'login' ? (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#2C1F24', marginBottom: 4, textAlign: 'center' }}>{T.login}</h2>
              <p style={{ fontSize: 12, color: '#B89CA0', marginBottom: 24, textAlign: 'center' }}>{T.loginSub}</p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#7A5C63', marginBottom: 6 }}>{T.email}</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={T.emailPh} style={inp}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#7A5C63', marginBottom: 6 }}>{T.password}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={T.passwordPh}
                      style={{ ...inp, paddingLeft: isRtl ? 14 : 40, paddingRight: isRtl ? 40 : 14 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      style={{
                        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                        left: isRtl ? 'auto' : 12, right: isRtl ? 12 : 'auto',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#B89CA0', display: 'flex', alignItems: 'center',
                        padding: 0,
                      }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: '#FFF0F2', border: '1px solid #F4C0CC',
                    borderRadius: 8, padding: '10px 14px', fontSize: 12,
                    color: '#8B4A58', textAlign: 'center',
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
                  onClick={() => { setMode('forgot'); setError('') }}
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
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#2C1F24', marginBottom: 4, textAlign: 'center' }}>{T.forgot}</h2>
              <p style={{ fontSize: 12, color: '#B89CA0', marginBottom: 24, textAlign: 'center' }}>{T.forgotSub}</p>

              {forgotSent ? (
                <div style={{ background: '#E8F5EE', border: '1px solid #4A8C6A', borderRadius: 10, padding: '16px', textAlign: 'center', color: '#4A8C6A', fontSize: 13 }}>
                  {T.sent}
                </div>
              ) : (
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#7A5C63', marginBottom: 6 }}>{T.email}</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={T.emailPh} style={inp} />
                  </div>
                  {error && (
                    <div style={{ background: '#FFF0F2', border: '1px solid #F4C0CC', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#8B4A58', textAlign: 'center' }}>
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
                onClick={() => { setMode('login'); setError(''); setForgotSent(false) }}
                style={{
                  background: 'none', border: 'none', color: '#B89CA0',
                  fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  fontFamily: 'inherit', marginTop: 16, display: 'block', width: '100%',
                }}
              >
                ← {T.back}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#B89CA0', fontSize: 11, marginTop: 20 }}>
          {T.slogan}
        </p>
      </div>
    </div>
  )
}
