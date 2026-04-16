'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, RefreshCw, AlertCircle, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

type AttStatus = 'present' | 'absent' | 'make_up' | null

export default function AttendanceSheet({
  session,
  students,
  existingAttendance,
}: {
  session: any
  students: any[]
  existingAttendance: any[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const initial: Record<string, AttStatus> = {}
  existingAttendance.forEach(a => { initial[a.student_id] = a.status })

  const [attendance, setAttendance] = useState<Record<string, AttStatus>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function getActiveSubscription(student: any) {
    return student.subscriptions?.find((s: any) => s.status === 'active')
  }

  async function saveAttendance() {
    setSaving(true)
    const entries = Object.entries(attendance).filter(([, v]) => v !== null)

    for (const [studentId, status] of entries) {
      const existing = existingAttendance.find(a => a.student_id === studentId)

      if (existing) {
        await supabase.from('attendance').update({ status }).eq('id', existing.id)
      } else {
        await supabase.from('attendance').insert({
          session_id: session.id,
          student_id: studentId,
          status,
        })
      }

      // Update subscription
      if (status === 'present' || status === 'make_up') {
        const student = students.find(s => s.id === studentId)
        const sub = getActiveSubscription(student)
        if (sub && sub.remaining_sessions > 0) {
          const prevStatus = initial[studentId]
          // Only deduct if wasn't already counted
          if (prevStatus !== 'present' && prevStatus !== 'make_up') {
            await supabase.from('subscriptions')
              .update({ remaining_sessions: Math.max(0, sub.remaining_sessions - 1) })
              .eq('id', sub.id)
          }
        }
      } else if (status === 'absent') {
        const prevStatus = initial[studentId]
        if (prevStatus === 'present' || prevStatus === 'make_up') {
          const student = students.find(s => s.id === studentId)
          const sub = getActiveSubscription(student)
          if (sub) {
            await supabase.from('subscriptions')
              .update({ remaining_sessions: Math.min(sub.total_sessions, sub.remaining_sessions + 1) })
              .eq('id', sub.id)
          }
        }
      }
    }

    // Mark session completed
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length
  const makeupCount = Object.values(attendance).filter(v => v === 'make_up').length

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">{session.class?.name}</h2>
            <p className="text-white/40 text-sm mt-0.5">
              {session.hall?.name} • {session.date} • {session.coach?.name_ar || 'بدون مدربة'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-emerald-400">{presentCount} حاضرة</span>
            <span className="text-white/20">|</span>
            <span className="text-red-400">{absentCount} غائبة</span>
            <span className="text-white/20">|</span>
            <span className="text-blue-400">{makeupCount} تعويض</span>
          </div>
        </div>
      </div>

      {/* Student rows */}
      <div className="divide-y divide-white/5">
        {students.length === 0 ? (
          <div className="text-center py-12 text-white/20">
            <p>لا توجد طالبات مسجلات في هذا الفصل</p>
          </div>
        ) : students.map((student) => {
          const sub = getActiveSubscription(student)
          const currentStatus = attendance[student.id] ?? null
          const needsPayment = sub && sub.remaining_sessions === 0

          return (
            <div
              key={student.id}
              className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                currentStatus === 'present' ? 'bg-emerald-500/5' :
                currentStatus === 'absent' ? 'bg-red-500/5' :
                currentStatus === 'make_up' ? 'bg-blue-500/5' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {student.name_ar[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">{student.name_ar}</p>
                  {needsPayment && (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      مطلوب دفع
                    </span>
                  )}
                </div>
                <p className="text-white/30 text-xs">
                  {sub ? `${sub.remaining_sessions}/${sub.total_sessions} حصة` : 'بدون اشتراك'}
                </p>
              </div>

              {/* Attendance Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAttendance(a => ({ ...a, [student.id]: a[student.id] === 'present' ? null : 'present' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    currentStatus === 'present'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/3 border-white/10 text-white/30 hover:border-emerald-500/30 hover:text-emerald-400/70'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  حاضرة
                </button>
                <button
                  onClick={() => setAttendance(a => ({ ...a, [student.id]: a[student.id] === 'absent' ? null : 'absent' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    currentStatus === 'absent'
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-white/3 border-white/10 text-white/30 hover:border-red-500/30 hover:text-red-400/70'
                  }`}
                >
                  <XCircle size={13} />
                  غائبة
                </button>
                <button
                  onClick={() => setAttendance(a => ({ ...a, [student.id]: a[student.id] === 'make_up' ? null : 'make_up' }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    currentStatus === 'make_up'
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                      : 'bg-white/3 border-white/10 text-white/30 hover:border-blue-500/30 hover:text-blue-400/70'
                  }`}
                >
                  <RefreshCw size={13} />
                  تعويض
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Save Button */}
      <div className="px-6 py-4 border-t border-white/8 bg-white/3">
        <button
          onClick={saveAttendance}
          disabled={saving || Object.keys(attendance).length === 0}
          className={`flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg ${
            saved
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
              : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-rose-500/25'
          } disabled:opacity-40`}
        >
          <Save size={15} />
          {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ الحضور'}
        </button>
      </div>
    </div>
  )
}
