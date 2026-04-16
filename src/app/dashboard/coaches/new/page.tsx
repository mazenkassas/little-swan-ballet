'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'

export default function NewCoachPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name_ar: '', name_en: '', phone: '', email: '',
    hourly_rate: '', password: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    // Create Supabase auth user
    const { data: authData, error: authErr } = await supabase.auth.admin?.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
    }) || {}

    // Insert coach record (password stored as hash placeholder — use Supabase Auth)
    const { error: err } = await supabase.from('coaches').insert({
      name_ar: form.name_ar,
      name_en: form.name_en,
      phone: form.phone || null,
      email: form.email,
      password_hash: 'managed_by_supabase_auth',
      hourly_rate: parseFloat(form.hourly_rate),
      can_login: true,
    })

    if (err) { setError(err.message); setLoading(false) }
    else router.push('/dashboard/coaches')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"

  return (
    <div className="p-8 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/coaches" className="text-white/30 hover:text-white/60">
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">إضافة مدربة جديدة</h1>
          <p className="text-white/40 text-sm mt-0.5">أدخل بيانات المدربة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">الاسم بالعربي *</label>
              <input required value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="سارة محمد" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">الاسم بالإنجليزي *</label>
              <input required value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Sara Mohamed" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">البريد الإلكتروني *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="coach@littleswan.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">كلمة المرور *</label>
            <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">رقم الهاتف</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+201234567890" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">سعر الساعة (جنيه) *</label>
              <input required type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="100" className={inputClass} />
            </div>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50">
            <Save size={16} />
            {loading ? 'جارٍ الحفظ...' : 'حفظ المدربة'}
          </button>
          <Link href="/dashboard/coaches" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-xl transition-all">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
