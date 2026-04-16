'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'

export default function NewPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState('subscription')

  const [form, setForm] = useState({
    student_id: searchParams.get('student') || '',
    type: 'subscription',
    amount_due: '',
    amount_paid: '',
    payment_method: 'cash',
    plan_id: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar'),
      supabase.from('subscription_plans').select('*').eq('is_active', true),
    ]).then(([{ data: s }, { data: p }]) => {
      if (s) setStudents(s)
      if (p) {
        setPlans(p)
        if (p[0]) setForm(f => ({ ...f, plan_id: p[0].id, amount_due: p[0].price.toString() }))
      }
    })
  }, [])

  function handlePlanChange(planId: string) {
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setForm(f => ({ ...f, plan_id: planId, amount_due: plan.price.toString() }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.student_id) { setError('اختر الطالبة'); return }
    setLoading(true); setError('')

    const amountDue = parseFloat(form.amount_due)
    const amountPaid = parseFloat(form.amount_paid)

    // Create payment
    const { data: payment, error: payErr } = await supabase.from('payments').insert({
      student_id: form.student_id,
      type: form.type,
      amount_due: amountDue,
      amount_paid: amountPaid,
      payment_method: form.payment_method,
      date: new Date().toISOString().split('T')[0],
      notes: form.notes || null,
    }).select().single()

    if (payErr) { setError(payErr.message); setLoading(false); return }

    // If subscription, create subscription record
    if (form.type === 'subscription' && form.plan_id) {
      const plan = plans.find(p => p.id === form.plan_id)
      if (plan) {
        // Expire previous active subscription
        await supabase.from('subscriptions')
          .update({ status: 'expired' })
          .eq('student_id', form.student_id)
          .eq('status', 'active')

        await supabase.from('subscriptions').insert({
          student_id: form.student_id,
          plan_id: form.plan_id,
          total_sessions: plan.sessions_count,
          remaining_sessions: plan.sessions_count,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
          payment_id: payment.id,
        })
      }
    }

    router.push(`/dashboard/students/${form.student_id}`)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 transition-all text-sm"

  const paymentTypes = [
    { value: 'subscription', label: 'اشتراك' },
    { value: 'enrollment', label: 'تسجيل جديد' },
    { value: 'product', label: 'منتج / مايوه' },
    { value: 'event', label: 'فعالية' },
    { value: 'private', label: 'برايفيت' },
    { value: 'exam', label: 'امتحان' },
  ]

  return (
    <div className="p-8 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/payments" className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">إضافة دفعة</h1>
          <p className="text-white/40 text-sm mt-0.5">تسجيل معاملة مالية جديدة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          {/* Student */}
          <div>
            <label className="block text-sm text-white/60 mb-2">الطالبة <span className="text-rose-400">*</span></label>
            <select
              value={form.student_id}
              onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
              className={inputClass}
              required
            >
              <option value="" className="bg-[#1a1a2e]">اختر الطالبة</option>
              {students.map(s => (
                <option key={s.id} value={s.id} className="bg-[#1a1a2e]">{s.name_ar} — {s.name_en}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-white/60 mb-2">نوع الدفعة</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentTypes.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, type: t.value })); setSelectedType(t.value) }}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    form.type === t.value
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-white/3 border-white/10 text-white/40 hover:bg-white/6'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subscription Plan */}
          {form.type === 'subscription' && plans.length > 0 && (
            <div>
              <label className="block text-sm text-white/60 mb-2">خطة الاشتراك</label>
              <select
                value={form.plan_id}
                onChange={e => handlePlanChange(e.target.value)}
                className={inputClass}
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1a1a2e]">{p.name} — {p.sessions_count} حصص</option>
                ))}
              </select>
            </div>
          )}

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">المبلغ المطلوب (جنيه)</label>
              <input
                type="number"
                value={form.amount_due}
                onChange={e => setForm(f => ({ ...f, amount_due: e.target.value }))}
                placeholder="500"
                className={inputClass}
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">المبلغ المدفوع (جنيه)</label>
              <input
                type="number"
                value={form.amount_paid}
                onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
                placeholder="500"
                className={inputClass}
                required
                min="0"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm text-white/60 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'cash', label: '💵 كاش' }, { value: 'instapay', label: '📱 إنستاباي' }].map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, payment_method: m.value }))}
                  className={`py-3 rounded-xl text-sm font-medium transition-all border ${
                    form.payment_method === m.value
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/3 border-white/10 text-white/40 hover:bg-white/6'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-2">ملاحظات</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="أي تفاصيل إضافية..."
              className={inputClass}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
          </button>
          <Link href="/dashboard/payments" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold px-6 py-3 rounded-xl transition-all">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
