'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'

export default function NewSessionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [form, setForm] = useState({ class_id: '', date: new Date().toISOString().split('T')[0], coach_id: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('classes').select('*, hall:halls(name, id), default_coach_id').eq('is_active', true).order('name'),
      supabase.from('coaches').select('id, name_ar').eq('is_active', true).order('name_ar'),
    ]).then(([{ data: c }, { data: co }]) => {
      if (c) setClasses(c)
      if (co) setCoaches(co)
    })
  }, [])

  function handleClassChange(classId: string) {
    const cls = classes.find(c => c.id === classId)
    setSelectedClass(cls)
    setForm(f => ({ ...f, class_id: classId, coach_id: cls?.default_coach_id || '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const cls = classes.find(c => c.id === form.class_id)
    await supabase.from('sessions').insert({
      class_id: form.class_id,
      date: form.date,
      coach_id: form.coach_id || null,
      hall_id: cls?.hall?.id,
      status: 'scheduled',
    })
    router.push('/dashboard/sessions')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"

  return (
    <div className="p-8 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/sessions" className="text-white/30 hover:text-white/60"><ArrowRight size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">إضافة حصة يدوية</h1>
          <p className="text-white/40 text-sm mt-0.5">إنشاء حصة خارج الجدول التلقائي</p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">الفصل *</label>
            <select required value={form.class_id} onChange={e => handleClassChange(e.target.value)} className={inputClass}>
              <option value="" className="bg-[#1a1a2e]">اختر الفصل</option>
              {classes.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name} — {c.hall?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">التاريخ *</label>
            <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">المدربة</label>
            <select value={form.coach_id} onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))} className={inputClass}>
              <option value="" className="bg-[#1a1a2e]">اختر المدربة</option>
              {coaches.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name_ar}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50">
            <Save size={16} />
            {loading ? 'جارٍ...' : 'إنشاء الحصة'}
          </button>
          <Link href="/dashboard/sessions" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-xl transition-all">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
