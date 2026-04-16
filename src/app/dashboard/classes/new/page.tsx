'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save, AlertTriangle } from 'lucide-react'

const DAYS = [
  { value: 'Sunday', label: 'الأحد' },
  { value: 'Monday', label: 'الاثنين' },
  { value: 'Tuesday', label: 'الثلاثاء' },
  { value: 'Wednesday', label: 'الأربعاء' },
  { value: 'Thursday', label: 'الخميس' },
  { value: 'Friday', label: 'الجمعة' },
  { value: 'Saturday', label: 'السبت' },
]

export default function NewClassPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [levels, setLevels] = useState<any[]>([])
  const [halls, setHalls] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [conflict, setConflict] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    level_id: '',
    age_group: '',
    default_coach_id: '',
    hall_id: '',
    days_of_week: [] as string[],
    start_time: '',
    end_time: '',
    max_capacity: '15',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('levels').select('*').order('order_num'),
      supabase.from('halls').select('*'),
      supabase.from('coaches').select('*').eq('is_active', true).order('name_ar'),
    ]).then(([{ data: l }, { data: h }, { data: c }]) => {
      if (l) setLevels(l)
      if (h) setHalls(h)
      if (c) setCoaches(c)
    })
  }, [])

  // Check for scheduling conflicts
  async function checkConflict() {
    if (!form.hall_id || !form.start_time || !form.end_time || form.days_of_week.length === 0) return
    setConflict('')

    const { data: existing } = await supabase
      .from('classes')
      .select('name, days_of_week, start_time, end_time')
      .eq('hall_id', form.hall_id)
      .eq('is_active', true)

    if (!existing) return

    for (const cls of existing) {
      const overlappingDays = cls.days_of_week?.filter((d: string) => form.days_of_week.includes(d))
      if (overlappingDays?.length > 0) {
        const existStart = cls.start_time
        const existEnd = cls.end_time
        const newStart = form.start_time
        const newEnd = form.end_time

        if (newStart < existEnd && newEnd > existStart) {
          setConflict(`تعارض مع فصل: ${cls.name} (${overlappingDays.join(', ')}) ${existStart.slice(0,5)}-${existEnd.slice(0,5)}`)
          return
        }
      }
    }
  }

  useEffect(() => { checkConflict() }, [form.hall_id, form.start_time, form.end_time, form.days_of_week])

  function toggleDay(day: string) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (conflict) { setError('يرجى إصلاح التعارض أولاً'); return }
    if (form.days_of_week.length === 0) { setError('اختر يوم واحد على الأقل'); return }
    setLoading(true); setError('')

    const { error: err } = await supabase.from('classes').insert({
      ...form,
      level_id: form.level_id || null,
      default_coach_id: form.default_coach_id || null,
      max_capacity: parseInt(form.max_capacity),
    })

    if (err) { setError(err.message); setLoading(false) }
    else router.push('/dashboard/classes')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 transition-all text-sm"

  return (
    <div className="p-8 max-w-2xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/classes" className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">إضافة فصل جديد</h1>
          <p className="text-white/40 text-sm mt-0.5">إنشاء جدول ثابت أسبوعي</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm text-white/60 mb-2">اسم الفصل <span className="text-rose-400">*</span></label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Grade-1 السبت 2م" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">المستوى</label>
              <select value={form.level_id} onChange={e => setForm(f => ({ ...f, level_id: e.target.value }))} className={inputClass}>
                <option value="" className="bg-[#1a1a2e]">اختر المستوى</option>
                {levels.map(l => <option key={l.id} value={l.id} className="bg-[#1a1a2e]">{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">الفئة العمرية</label>
              <input value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value }))}
                placeholder="3-5 سنوات" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">القاعة <span className="text-rose-400">*</span></label>
              <select required value={form.hall_id} onChange={e => setForm(f => ({ ...f, hall_id: e.target.value }))} className={inputClass}>
                <option value="" className="bg-[#1a1a2e]">اختر القاعة</option>
                {halls.map(h => <option key={h.id} value={h.id} className="bg-[#1a1a2e]">{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">المدربة الافتراضية</label>
              <select value={form.default_coach_id} onChange={e => setForm(f => ({ ...f, default_coach_id: e.target.value }))} className={inputClass}>
                <option value="" className="bg-[#1a1a2e]">اختر المدربة</option>
                {coaches.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name_ar}</option>)}
              </select>
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="block text-sm text-white/60 mb-2">أيام الأسبوع <span className="text-rose-400">*</span></label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d => (
                <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    form.days_of_week.includes(d.value)
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-white/3 border-white/10 text-white/40 hover:bg-white/6'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">وقت البداية</label>
              <input type="time" required value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">وقت النهاية</label>
              <input type="time" required value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">الطاقة الاستيعابية</label>
              <input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} className={inputClass} min="1" />
            </div>
          </div>

          {/* Conflict Warning */}
          {conflict && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-400 text-sm">
              <AlertTriangle size={16} />
              {conflict}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading || !!conflict}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50">
            <Save size={16} />
            {loading ? 'جارٍ الحفظ...' : 'حفظ الفصل'}
          </button>
          <Link href="/dashboard/classes" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold px-6 py-3 rounded-xl transition-all">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
