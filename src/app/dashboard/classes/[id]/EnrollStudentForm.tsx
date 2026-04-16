'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EnrollStudentForm({ classId, students, currentCount, maxCapacity }: {
  classId: string; students: any[]; currentCount: number; maxCapacity: number
}) {
  const supabase = createClient()
  const router = useRouter()
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const isFull = currentCount >= maxCapacity

  async function enroll() {
    if (!studentId || isFull) return
    setLoading(true); setMsg('')
    const { error } = await supabase.from('class_students').insert({
      student_id: studentId,
      class_id: classId,
      enrolled_date: new Date().toISOString().split('T')[0],
    })
    if (error) { setMsg(error.message) }
    else { setStudentId(''); setMsg('تم التسجيل بنجاح ✓'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <UserPlus size={16} className="text-rose-400" />
        تسجيل طالبة جديدة
      </h2>
      {isFull ? (
        <div className="text-center py-8 text-amber-400/60 text-sm bg-amber-500/5 border border-amber-500/10 rounded-xl">
          الفصل ممتلئ ({currentCount}/{maxCapacity})
        </div>
      ) : (
        <div className="space-y-3">
          <select
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm focus:outline-none focus:border-rose-500/60"
          >
            <option value="" className="bg-[#1a1a2e]">اختر الطالبة...</option>
            {students.map(s => (
              <option key={s.id} value={s.id} className="bg-[#1a1a2e]">{s.name_ar}</option>
            ))}
          </select>
          <button
            onClick={enroll}
            disabled={!studentId || loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-lg shadow-rose-500/20 disabled:opacity-40"
          >
            <UserPlus size={15} />
            {loading ? 'جارٍ التسجيل...' : 'تسجيل'}
          </button>
          {msg && (
            <p className={`text-sm text-center ${msg.includes('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>
          )}
          <p className="text-white/20 text-xs text-center">{currentCount}/{maxCapacity} طالبة</p>
        </div>
      )}
    </div>
  )
}
