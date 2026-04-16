'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'
import type { Level } from '@/lib/types'

export default function NewStudentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [levels, setLevels] = useState<Level[]>([])
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    date_of_birth: '',
    parent_phone: '',
    level_id: '',
    notes: '',
  })

  useEffect(() => {
    supabase.from('levels').select('*').order('order_num').then(({ data }) => {
      if (data) setLevels(data)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.from('students').insert({
      ...form,
      level_id: form.level_id || null,
      enrollment_date: new Date().toISOString().split('T')[0],
    }).select().single()

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push(`/dashboard/students/${data.id}`)
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 transition-all text-sm"
  const labelClass = "block text-sm text-white/60 mb-2"

  return (
    <div className="p-8 max-w-2xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/students" className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">إضافة طالبة جديدة</h1>
          <p className="text-white/40 text-sm mt-0.5">أدخل بيانات الطالبة الجديدة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>الاسم بالعربي <span className="text-rose-400">*</span></label>
              <input
                required
                value={form.name_ar}
                onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                placeholder="مريم أحمد"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>الاسم بالإنجليزي <span className="text-rose-400">*</span></label>
              <input
                required
                value={form.name_en}
                onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="Mariam Ahmed"
                className={inputClass}
              />
            </div>
          </div>

          {/* DOB & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>تاريخ الميلاد <span className="text-rose-400">*</span></label>
              <input
                required
                type="date"
                value={form.date_of_birth}
                onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>هاتف ولي الأمر <span className="text-rose-400">*</span></label>
              <input
                required
                value={form.parent_phone}
                onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                placeholder="+201234567890"
                className={inputClass}
              />
            </div>
          </div>

          {/* Level */}
          <div>
            <label className={labelClass}>المستوى</label>
            <select
              value={form.level_id}
              onChange={e => setForm(f => ({ ...f, level_id: e.target.value }))}
              className={inputClass}
            >
              <option value="" className="bg-[#1a1a2e]">اختر المستوى (اختياري)</option>
              {levels.map(l => (
                <option key={l.id} value={l.id} className="bg-[#1a1a2e]">{l.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="أي ملاحظات طبية أو إدارية..."
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'جارٍ الحفظ...' : 'حفظ الطالبة'}
          </button>
          <Link
            href="/dashboard/students"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold px-6 py-3 rounded-xl transition-all"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
