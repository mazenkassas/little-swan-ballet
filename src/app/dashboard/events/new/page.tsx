'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'recital', date: '', venue: '', price: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data } = await supabase.from('events').insert({
      name: form.name, type: form.type, date: form.date,
      venue: form.venue || null, price: parseFloat(form.price) || 0,
    }).select().single()
    router.push(`/dashboard/events/${data?.id}`)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"
  const eventTypes = [
    { value: 'recital', label: '🎭 عرض (Recital)' },
    { value: 'tv_show', label: '📺 عرض تلفزيوني' },
    { value: 'workshop', label: '🎓 ورشة عمل' },
    { value: 'competition', label: '🏆 مسابقة' },
  ]

  return (
    <div className="p-8 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/events" className="text-white/30 hover:text-white/60"><ArrowRight size={20} /></Link>
        <h1 className="text-2xl font-bold text-white">إنشاء فعالية جديدة</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">اسم الفعالية *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="حفل نهاية العام" className={inputClass} />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">نوع الفعالية</label>
            <div className="grid grid-cols-2 gap-2">
              {eventTypes.map(t => (
                <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all border text-right px-4 ${
                    form.type === t.value ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-white/3 border-white/10 text-white/40 hover:bg-white/6'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">التاريخ *</label>
              <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">سعر التسجيل (جنيه)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">المكان</label>
            <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="قاعة الأكاديمية" className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50">
            <Save size={16} />
            {loading ? 'جارٍ...' : 'إنشاء الفعالية'}
          </button>
          <Link href="/dashboard/events" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-xl transition-all">إلغاء</Link>
        </div>
      </form>
    </div>
  )
}
