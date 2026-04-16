'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EventEnrollForm({ eventId, eventPrice, students }: {
  eventId: string; eventPrice: number; students: any[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [studentId, setStudentId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState(eventPrice.toString())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function enroll() {
    if (!studentId) return
    setLoading(true); setMsg('')

    const paid = parseFloat(amountPaid) || 0
    const paymentStatus = paid >= eventPrice ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

    // Create payment
    let paymentId = null
    if (paid > 0) {
      const { data: pmt } = await supabase.from('payments').insert({
        student_id: studentId,
        type: 'event',
        amount_due: eventPrice,
        amount_paid: paid,
        payment_method: paymentMethod,
        date: new Date().toISOString().split('T')[0],
      }).select().single()
      paymentId = pmt?.id
    }

    await supabase.from('event_enrollments').insert({
      event_id: eventId,
      student_id: studentId,
      payment_status: paymentStatus,
      payment_id: paymentId,
    })

    setStudentId(''); setAmountPaid(eventPrice.toString())
    setMsg('تم التسجيل ✓'); setLoading(false)
    router.refresh()
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm focus:outline-none focus:border-rose-500/60"

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <UserPlus size={16} className="text-rose-400" />
        تسجيل طالبة
      </h2>
      <div className="space-y-3">
        <select value={studentId} onChange={e => setStudentId(e.target.value)} className={inputClass}>
          <option value="" className="bg-[#1a1a2e]">اختر الطالبة...</option>
          {students.map(s => <option key={s.id} value={s.id} className="bg-[#1a1a2e]">{s.name_ar}</option>)}
        </select>
        <div>
          <label className="block text-white/40 text-xs mb-1.5">المبلغ المدفوع (جنيه)</label>
          <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className={inputClass} min="0" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'cash', l: 'كاش' }, { v: 'instapay', l: 'إنستاباي' }].map(m => (
            <button key={m.v} type="button" onClick={() => setPaymentMethod(m.v)}
              className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                paymentMethod === m.v ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/3 border-white/10 text-white/30'
              }`}>{m.l}
            </button>
          ))}
        </div>
        <button onClick={enroll} disabled={!studentId || loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-rose-500/20 disabled:opacity-40">
          <UserPlus size={15} />
          {loading ? 'جارٍ...' : 'تسجيل'}
        </button>
        {msg && <p className="text-emerald-400 text-sm text-center">{msg}</p>}
      </div>
    </div>
  )
}
