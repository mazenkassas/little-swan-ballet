'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Edit, SnowflakeIcon, UserCheck, UserX, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import type { Student } from '@/lib/types'

export default function StudentActions({ student }: { student: Student }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function updateStatus(status: string) {
    setLoading(true)
    setOpen(false)
    await supabase.from('students').update({ status }).eq('id', student.id)

    if (status === 'frozen') {
      await supabase.from('freezes').insert({
        student_id: student.id,
        start_date: new Date().toISOString().split('T')[0],
        reason: 'تجميد يدوي',
        status: 'active',
      })
    } else if (student.status === 'frozen') {
      await supabase.from('freezes')
        .update({ status: 'ended', end_date: new Date().toISOString().split('T')[0] })
        .eq('student_id', student.id)
        .eq('status', 'active')
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-4 py-2.5 rounded-xl text-sm transition-all"
        disabled={loading}
      >
        <MoreHorizontal size={16} />
        {loading ? 'جارٍ...' : 'إجراءات'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
            <Link
              href={`/dashboard/students/${student.id}/edit`}
              className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/5 text-sm transition-colors"
              onClick={() => setOpen(false)}
            >
              <Edit size={15} className="text-white/40" />
              تعديل البيانات
            </Link>

            {student.status === 'active' && (
              <button
                onClick={() => updateStatus('frozen')}
                className="flex items-center gap-3 px-4 py-3 text-blue-400 hover:bg-blue-500/10 text-sm transition-colors w-full"
              >
                <SnowflakeIcon size={15} />
                تجميد الطالبة
              </button>
            )}

            {student.status === 'frozen' && (
              <button
                onClick={() => updateStatus('active')}
                className="flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-emerald-500/10 text-sm transition-colors w-full"
              >
                <UserCheck size={15} />
                إلغاء التجميد
              </button>
            )}

            {student.status === 'inactive' && (
              <button
                onClick={() => updateStatus('active')}
                className="flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-emerald-500/10 text-sm transition-colors w-full"
              >
                <UserCheck size={15} />
                إعادة تفعيل
              </button>
            )}

            {student.status === 'active' && (
              <button
                onClick={() => updateStatus('inactive')}
                className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 text-sm transition-colors w-full"
              >
                <UserX size={15} />
                تعطيل الحساب
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
