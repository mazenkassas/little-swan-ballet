'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save, ArrowLeftRight } from 'lucide-react'

export default function NewTransferPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [allClasses, setAllClasses] = useState<any[]>([])
  const [studentClasses, setStudentClasses] = useState<any[]>([])
  const [form, setForm] = useState({ student_id: '', from_class_id: '', to_class_id: '', notes: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('id, name_ar').eq('status', 'active').order('name_ar'),
      supabase.from('classes').select('id, name, hall:halls(name)').eq('is_active', true).order('name'),
    ]).then(([{ data: s }, { data: c }]) => {
      if (s) setStudents(s)
      if (c) setAllClasses(c)
    })
  }, [])

  async function handleStudentChange(studentId: string) {
    setForm(f => ({ ...f, student_id: studentId, from_class_id: '', to_class_id: '' }))
    if (!studentId) return
    const { data } = await supabase
      .from('class_students')
      .select('class_id, class:classes(id, name, hall:halls(name))')
      .eq('student_id', studentId)
    setStudentClasses((data || []).map((d: any) => d.class))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('student_transfers').insert({
      student_id: form.student_id,
      from_class_id: form.from_class_id,
      to_class_id: form.to_class_id,
      notes: form.notes || null,
      status: 'pending',
      request_date: new Date().toISOString().split('T')[0],
    })
    router.push('/dashboard/transfers')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:border-rose-500/60 text-sm"

  return (
    <div className="p-8 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/transfers" className="text-white/30 hover:text-white/60"><ArrowRight size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">طلب تحويل جديد</h1>
          <p className="text-white/40 text-sm mt-0.5">تحويل طالبة من فصل إلى فصل آخر</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">الطالبة *</label>
            <select required value={form.student_id} onChange={e => handleStudentChange(e.target.value)} className={inputClass}>
              <option value="" className="bg-[#1a1a2e]">اختر الطالبة</option>
              {students.map(s => <option key={s.id} value={s.id} className="bg-[#1a1a2e]">{s.name_ar}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-white/60 text-sm mb-2">من فصل *</label>
              <select required value={form.from_class_id} onChange={e => setForm(f => ({ ...f, from_class_id: e.target.value }))} className={inputClass} disabled={!form.student_id}>
                <option value="" className="bg-[#1a1a2e]">اختر الفصل الحالي</option>
                {studentClasses.map((c: any) => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name} — {c.hall?.name}</option>)}
              </select>
            </div>
            <ArrowLeftRight size={18} className="text-white/20 mt-6 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-white/60 text-sm mb-2">إلى فصل *</label>
              <select required value={form.to_class_id} onChange={e => setForm(f => ({ ...f, to_class_id: e.target.value }))} className={inputClass}>
                <option value="" className="bg-[#1a1a2e]">اختر الفصل الجديد</option>
                {allClasses.filter(c => c.id !== form.from_class_id).map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name} — {c.hall?.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">سبب التحويل</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} placeholder="اذكر السبب (اختياري)..."
              className={inputClass + ' resize-none'} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50">
            <Save size={16} />
            {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
          </button>
          <Link href="/dashboard/transfers" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-xl transition-all">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
