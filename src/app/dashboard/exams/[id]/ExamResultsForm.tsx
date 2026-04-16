'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, ArrowUp, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Result = 'pass' | 'fail' | 'pending'

export default function ExamResultsForm({
  exam, students, existingResults, nextLevel,
}: {
  exam: any; students: any[]; existingResults: any[]; nextLevel: any
}) {
  const supabase = createClient()
  const router = useRouter()

  const initial: Record<string, Result> = {}
  existingResults.forEach(r => { initial[r.student_id] = r.result })

  const [results, setResults] = useState<Record<string, Result>>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveResults() {
    setSaving(true)

    for (const [studentId, result] of Object.entries(results)) {
      if (result === 'pending') continue

      const existing = existingResults.find(r => r.student_id === studentId)

      if (existing) {
        await supabase.from('student_exams').update({ result }).eq('id', existing.id)
      } else {
        await supabase.from('student_exams').insert({
          student_id: studentId,
          exam_id: exam.id,
          result,
          promoted_to_level_id: result === 'pass' && nextLevel ? nextLevel.id : null,
        })
      }

      // Auto-promote on pass
      if (result === 'pass' && nextLevel) {
        await supabase.from('students').update({ level_id: nextLevel.id }).eq('id', studentId)
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const passed = Object.values(results).filter(r => r === 'pass').length
  const failed = Object.values(results).filter(r => r === 'fail').length

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Trophy size={18} className="text-emerald-400" />
          <div>
            <p className="text-emerald-400 font-bold text-xl">{passed}</p>
            <p className="text-white/40 text-xs">ناجح</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <div>
            <p className="text-red-400 font-bold text-xl">{failed}</p>
            <p className="text-white/40 text-xs">راسب</p>
          </div>
        </div>
        {nextLevel && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <ArrowUp size={16} className="text-violet-400" />
            <span className="text-violet-400 text-sm">الناجحون سيُرقَّون إلى: <strong>{nextLevel.name}</strong></span>
          </div>
        )}
      </div>

      {/* Results table */}
      <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {students.map(student => {
            const result = results[student.id] ?? 'pending'
            return (
              <div key={student.id} className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                result === 'pass' ? 'bg-emerald-500/5' :
                result === 'fail' ? 'bg-red-500/5' : ''
              }`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {student.name_ar[0]}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{student.name_ar}</p>
                  <p className="text-white/30 text-xs">{student.name_en}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(['pass', 'fail', 'pending'] as Result[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setResults(prev => ({ ...prev, [student.id]: r }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        result === r
                          ? r === 'pass' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : r === 'fail' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : 'bg-white/10 border-white/20 text-white/50'
                          : 'bg-white/3 border-white/8 text-white/25 hover:bg-white/6'
                      }`}
                    >
                      {r === 'pass' ? 'ناجح' : r === 'fail' ? 'راسب' : 'لم يُسجل'}
                    </button>
                  ))}
                </div>
                {result === 'pass' && nextLevel && (
                  <div className="flex items-center gap-1 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full">
                    <ArrowUp size={11} />
                    {nextLevel.name}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-6 py-4 border-t border-white/8 bg-white/3">
          <button
            onClick={saveResults}
            disabled={saving}
            className={`flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg ${
              saved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' :
              'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-rose-500/25'
            } disabled:opacity-40`}
          >
            <Save size={15} />
            {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ النتائج'}
          </button>
        </div>
      </div>
    </div>
  )
}
