'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Result = 'pass' | 'fail' | 'pending'

function sortGroupKey(name: string) {
  const lower = name.toLowerCase()
  if (lower.startsWith('preballet 1')) return '0'
  if (lower.startsWith('preballet 2')) return '1'
  if (lower.startsWith('preballet'))   return '0' + lower
  return '9' + lower
}

export default function ExamResultsForm({
  exam, students, existingResults, isGrouped, isRtl,
}: {
  exam: any
  students: any[]
  existingResults: any[]
  isGrouped: boolean
  isRtl: boolean
}) {
  const supabase = createClient()
  const router   = useRouter()

  const initial: Record<string, Result> = {}
  existingResults.forEach(r => { initial[r.student_id] = r.result })

  const [results, setResults] = useState<Record<string, Result>>(initial)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  async function saveResults() {
    setSaving(true)
    for (const [studentId, result] of Object.entries(results)) {
      if (result === 'pending') continue
      const existing = existingResults.find(r => r.student_id === studentId)
      if (existing) {
        await supabase.from('student_exams').update({ result }).eq('id', existing.id)
      } else {
        await supabase.from('student_exams').insert({ student_id: studentId, exam_id: exam.id, result })
      }
    }
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  function changeResult(studentId: string, result: Result) {
    setResults(prev => ({ ...prev, [studentId]: result }))
    setSaved(false)
  }

  const RESULTS: { key: Result; label: string; color: string }[] = [
    { key: 'pass',    label: isRtl ? 'ناجح'     : 'Pass',         color: '#3dab7e' },
    { key: 'fail',    label: isRtl ? 'راسب'     : 'Fail',         color: '#e04040' },
    { key: 'pending', label: isRtl ? 'لم يُسجل' : 'Not recorded', color: '#888'    },
  ]

  if (students.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '48px 24px', textAlign: 'center',
        color: 'var(--txt2)', fontSize: 13,
      }}>
        {isRtl ? 'لا توجد طالبات في هذا المستوى' : 'No students found'}
      </div>
    )
  }

  // ── Group students by grade + term when multiple levels ──
  if (isGrouped) {
    // Build groups
    const groupMap = new Map<string, { label: string; sortKey: string; students: any[] }>()
    for (const s of students) {
      const gradeName = s.grade?.name ?? (isRtl ? 'غير محدد' : 'Unknown')
      const termName  = s.term?.name  ?? ''
      const label     = termName ? `${gradeName} ${termName}` : gradeName
      const key       = `${s.grade?.id ?? 'none'}__${s.term?.id ?? 'none'}`
      if (!groupMap.has(key)) {
        groupMap.set(key, { label, sortKey: sortGroupKey(label), students: [] })
      }
      groupMap.get(key)!.students.push(s)
    }

    const groups = [...groupMap.values()].sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    )

    const totalPassed  = existingResults.filter(r => r.result === 'pass').length
    const totalFailed  = existingResults.filter(r => r.result === 'fail').length

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map(group => {
          const groupPassed  = group.students.filter(s => results[s.id] === 'pass').length
          const groupFailed  = group.students.filter(s => results[s.id] === 'fail').length
          const groupPending = group.students.length - groupPassed - groupFailed

          return (
            <div key={group.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {/* Group header */}
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-page)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
                  {group.label}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#3dab7e18', border: '1px solid #3dab7e30',
                    borderRadius: 8, padding: '4px 12px',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#3dab7e' }}>{groupPassed}</span>
                    <span style={{ fontSize: 11, color: '#3dab7e', opacity: 0.8 }}>{isRtl ? 'ناجح' : 'Pass'}</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#e0404018', border: '1px solid #e0404030',
                    borderRadius: 8, padding: '4px 12px',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#e04040' }}>{groupFailed}</span>
                    <span style={{ fontSize: 11, color: '#e04040', opacity: 0.8 }}>{isRtl ? 'راسب' : 'Fail'}</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '4px 12px',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt2)' }}>{groupPending}</span>
                    <span style={{ fontSize: 11, color: 'var(--txt2)', opacity: 0.7 }}>{isRtl ? 'لم يُسجل' : 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Students in this group */}
              <StudentList
                students={group.students}
                results={results}
                onResultChange={changeResult}
                RESULTS={RESULTS}
                isRtl={isRtl}
              />
            </div>
          )
        })}

        <SaveBar saving={saving} saved={saved} isRtl={isRtl} onSave={saveResults} />
      </div>
    )
  }

  // ── Flat list for a specific level ──
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-page)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isRtl ? 'الطالبة' : 'Student'}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isRtl ? 'النتيجة' : 'Result'}
        </span>
      </div>

      <StudentList
        students={students}
        results={results}
        onResultChange={changeResult}
        RESULTS={RESULTS}
        isRtl={isRtl}
      />

      <SaveBar saving={saving} saved={saved} isRtl={isRtl} onSave={saveResults} />
    </div>
  )
}

function StudentList({ students, results, onResultChange, RESULTS, isRtl }: {
  students: any[]
  results: Record<string, Result>
  onResultChange: (studentId: string, result: Result) => void
  RESULTS: { key: Result; label: string; color: string }[]
  isRtl: boolean
}) {
  return (
    <div>
      {students.map((student, idx) => {
        const result      = results[student.id] ?? 'pending'
        const displayName = isRtl ? student.name_ar : (student.name_en || student.name_ar)
        const initials    = (student.name_ar || '').slice(0, 1)
        const rowBg       = result === 'pass' ? '#3dab7e08' : result === 'fail' ? '#e0404008' : 'transparent'

        return (
          <div
            key={student.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 20px',
              borderBottom: idx < students.length - 1 ? '1px solid var(--border)' : 'none',
              background: rowBg, transition: 'background 0.15s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: '#d4667a18', border: '1px solid #d4667a30',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#d4667a',
            }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>
                {displayName}
              </p>
              {student.name_en && student.name_ar && (
                <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '1px 0 0' }}>
                  {isRtl ? student.name_en : student.name_ar}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {RESULTS.map(r => {
                const active = result === r.key
                return (
                  <button
                    key={r.key}
                    onClick={() => onResultChange(student.id, r.key)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                      background: active ? r.color + '22' : 'var(--bg-page)',
                      border: `1px solid ${active ? r.color + '55' : 'var(--border)'}`,
                      color: active ? r.color : 'var(--txt2)',
                    }}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SaveBar({ saving, saved, isRtl, onSave }: {
  saving: boolean; saved: boolean; isRtl: boolean; onSave: () => void
}) {
  return (
    <div style={{
      padding: '14px 20px', borderTop: '1px solid var(--border)',
      background: 'var(--bg-page)', display: 'flex', justifyContent: isRtl ? 'flex-start' : 'flex-end',
    }}>
      <button
        onClick={onSave}
        disabled={saving || saved}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          border: 'none', transition: 'all 0.15s', opacity: saving ? 0.5 : 1,
          background: saved ? '#3dab7e22' : '#d4667a',
          color: saved ? '#3dab7e' : '#fff',
          outline: saved ? '1px solid #3dab7e44' : 'none',
        }}
      >
        <Save size={14} />
        {saving
          ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…')
          : saved
          ? (isRtl ? 'تم الحفظ ✓' : 'Saved ✓')
          : (isRtl ? 'حفظ النتائج' : 'Save Results')}
      </button>
    </div>
  )
}
