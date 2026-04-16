'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewPrivateSessionForm({
  students, coaches,
}: {
  students: any[]; coaches: any[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({
    student_id: '', coach_id: '', date: new Date().toISOString().split('T')[0],
    duration_hours: '1', fee: '', notes: '', payment_method: 'cash',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Create payment first
    const { data: payment } = await supabase.from('payments').insert({
      student_id: form.student_id,
      type: 'private',
      amount_due: parseFloat(form.fee),
      amount_paid: parseFloat(form.fee),
      payment_method: form.payment_method,
      date: form.date,
      notes: form.notes || null,
    }).select().single()

    // Create private session
    await supabase.from('private_sessions').insert({
      student_id: form.student_id,
      coach_id: form.coach_id,
      date: form.date,
      duration_hours: parseFloat(form.duration_hours),
      fee: parseFloat(form.fee),
      payment_id: payment?.id || null,
      notes: form.notes || null,
    })

    // Log coach hours
    await supabase.from('coach_attendance').insert({
      coach_id: form.coach_id,
      hours_worked: parseFloat(form.duration_hours),
      location_status: 'valid',
      notes: `برايفيت — ${form.date}`,
    })

    setForm(f => ({ ...f, student_id: '', coach_id: '', fee: '', notes: '' }))
    setSaving(false)
    router.refresh()
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
      <h2 className="text-white font-semibold mb-5">تسجيل جلسة خاصة</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/50 text-sm mb-2">الطالبة</label>
          <select required value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} className={inputClass}>
            <option value="" className="bg-[#1a1a2e]">اختر الطالبة</option>
            {students.map(s => <option key={s.id} value={s.id} className="bg-[#1a1a2e]">{s.name_ar}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-white/50 text-sm mb-2">المدربة</label>
          <select required value={form.coach_id} onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))} className={inputClass}>
            <option value="" className="bg-[#1a1a2e]">اختر المدربة</option>
            {coaches.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name_ar}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-sm mb-2">التاريخ</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-white/50 text-sm mb-2">المدة (ساعة)</label>
            <select value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} className={inputClass}>
              {['0.5', '1', '1.5', '2', '2.5', '3'].map(h => (
                <option key={h} value={h} className="bg-[#1a1a2e]">{h} ساعة</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-sm mb-2">السعر (جنيه)</label>
            <input required type="number" min="0" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className="block text-white/50 text-sm mb-2">طريقة الدفع</label>
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className={inputClass}>
              <option value="cash" className="bg-[#1a1a2e]">كاش</option>
              <option value="instapay" className="bg-[#1a1a2e]">إنستاباي</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-white/50 text-sm mb-2">ملاحظات</label>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="اختياري..." className={inputClass} />
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-3 rounded-xl transition-all w-full justify-center shadow-lg shadow-rose-500/20 disabled:opacity-50">
          <Save size={16} />
          {saving ? 'جارٍ الحفظ...' : 'حفظ الجلسة'}
        </button>
      </form>
    </div>
  )
}
