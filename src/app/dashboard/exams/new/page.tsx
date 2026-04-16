'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'

export default function NewExamPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [levels, setLevels] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', date: '', fee: '', level_id: '' })

  useEffect(() => {
    supabase.from('levels').select('*').order('order_num').then(({ data }) => { if (data) setLevels(data) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data } = await supabase.from('exams').insert({
      name: form.name,
      date: form.date,
      fee: parseFloat(form.fee) || 0,
      level_id: form.level_id || null,
    }).select().single()
    router.push(`/dashboard/exams/${data?.id}`)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"

  return (
    <div className="p-8 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/exams" className="text-white/30 hover:text-white/60"><ArrowRight size={20} /></Link>
        <h1 className="text-2xl font-bold text-white">إنشاء امتحان جديد</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">اسم الامتحان *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="امتحان منتصف العام" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">التاريخ *</label>
              <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">الرسوم (جنيه)</label>
              <input type="number" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} placeholder="0" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">المستوى المستهدف</label>
            <select value={form.level_id} onChange={e => setForm(f => ({ ...f, level_id: e.target.value }))} className={inputClass}>
              <option value="" className="bg-[#1a1a2e]">جميع المستويات</option>
              {levels.map(l => <option key={l.id} value={l.id} className="bg-[#1a1a2e]">{l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50">
            <Save size={16} />
            {loading ? 'جارٍ الإنشاء...' : 'إنشاء الامتحان'}
          </button>
          <Link href="/dashboard/exams" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-xl transition-all">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
