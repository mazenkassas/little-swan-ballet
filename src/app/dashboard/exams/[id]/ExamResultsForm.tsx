'use client'

import { useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, ArrowLeftRight, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { transferStudent } from '../../students/actions'
import { compareClassNames } from '@/lib/classOrder'

type Result = 'pass' | 'fail' | 'evaluation' | 'special_committee' | 'transferred'
type ClassRow = {
  id: string; name: string; days_of_week: string[] | null; start_time: string | null; end_time: string | null
  grade: { name: string } | { name: string }[] | null; term: { name: string } | { name: string }[] | null
}

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

function hour12(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`
}
/** "Grade 3 · Term 2 · Thu · 6 PM – 8 PM" built from the class fields (falls back to the class name).
 *  Kept in English in both languages: grade and term names are English, and mixing scripts scrambles the order. */
function classLabel(c: ClassRow, _isRtl: boolean) {
  const grade = one(c.grade)?.name, term = one(c.term)?.name
  const days = (c.days_of_week || []).map(d => {
    const k = String(d).trim().toLowerCase().slice(0, 3)
    return k.charAt(0).toUpperCase() + k.slice(1)
  }).join(', ')
  const time = c.start_time ? `${hour12(c.start_time)}${c.end_time ? ' – ' + hour12(c.end_time) : ''}` : ''
  const parts = [grade, term, days, time].filter(Boolean)
  return parts.length >= 2 ? parts.join(' · ') : c.name
}

function sortGroupKey(name: string) {
  const lower = name.toLowerCase()
  if (lower.startsWith('preballet 1')) return '0'
  if (lower.startsWith('preballet 2')) return '1'
  if (lower.startsWith('preballet'))   return '0' + lower
  return '9' + lower
}

export default function ExamResultsForm({
  exam, students, existingResults, classesByStudent, allClasses, isGrouped, isRtl,
}: {
  exam: any
  students: any[]
  existingResults: any[]
  classesByStudent: Record<string, ClassRow[]>
  allClasses: ClassRow[]
  isGrouped: boolean
  isRtl: boolean
}) {
  const supabase = createClient()
  const router   = useRouter()

  const L = isRtl ? {
    pass: 'ناجح', fail: 'راسب', evaluation: 'تقييم', committee: 'لجنة خاصة', transferred: 'منقول',
    notes: 'ملاحظات…', noClass: 'غير مسجلة في مجموعة', save: 'حفظ النتائج', saving: 'جارٍ الحفظ…', saved: 'تم الحفظ ✓',
    student: 'الطالبة', result: 'النتيجة', pending: 'لم يُسجل', other: 'أخرى', none: 'لا توجد طالبات في هذا المستوى',
    needsDb: 'نتيجة "تقييم" و"لجنة خاصة" و"منقول" تحتاج تحديث قاعدة البيانات أولاً (supabase/add_exam_result_types.sql).',
    saveErr: 'تعذر حفظ بعض النتائج:',
    tTitle: 'نقل الطالبة', tSub: (n: string) => `اختر المجموعة الجديدة لـ ${n}`, tFrom: 'من مجموعة', tSearch: 'ابحث عن مجموعة…',
    tConfirm: 'نقل', tCancel: 'إلغاء', tPick: 'اختر مجموعة', tSame: 'هذه مجموعتها الحالية', tCurrent: 'الحالية',
    tNote: (e: string) => `منقولة من امتحان: ${e}`, tNoMatch: 'لا توجد مجموعات مطابقة',
  } : {
    pass: 'Pass', fail: 'Fail', evaluation: 'Evaluation', committee: 'Special Committee', transferred: 'Transferred',
    notes: 'Notes…', noClass: 'Not enrolled in a class', save: 'Save Results', saving: 'Saving…', saved: 'Saved ✓',
    student: 'Student', result: 'Result', pending: 'Pending', other: 'Other', none: 'No students found',
    needsDb: 'Evaluation, Special Committee and Transferred need a database update first (supabase/add_exam_result_types.sql).',
    saveErr: 'Some results could not be saved:',
    tTitle: 'Transfer student', tSub: (n: string) => `Choose the new class for ${n}`, tFrom: 'From class', tSearch: 'Search classes…',
    tConfirm: 'Transfer', tCancel: 'Cancel', tPick: 'Choose a class', tSame: 'This is her current class', tCurrent: 'current',
    tNote: (e: string) => `Transferred from exam: ${e}`, tNoMatch: 'No classes match',
  }

  const RESULTS: { key: Result; label: string; color: string }[] = [
    { key: 'pass',              label: L.pass,       color: '#3dab7e' },
    { key: 'fail',              label: L.fail,       color: '#e04040' },
    { key: 'evaluation',        label: L.evaluation, color: '#4a90d9' },
    { key: 'special_committee', label: L.committee,  color: '#8B6EC8' },
  ]

  const existingBy = useMemo(() => new Map(existingResults.map(r => [r.student_id, r])), [existingResults])
  const [results, setResults] = useState<Record<string, Result | ''>>(() =>
    Object.fromEntries(existingResults.map(r => [r.student_id, r.result === 'pending' ? '' : r.result])))
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(existingResults.map(r => [r.student_id, r.notes || ''])))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')
  const [transferFor, setTransferFor] = useState<any | null>(null)

  function dbError(e: { code?: string; message: string }) {
    return e.code === '23514' ? L.needsDb : `${L.saveErr} ${e.message}`
  }

  async function saveResults() {
    setSaving(true); setError('')
    // Only rows whose result or note changed
    const rows = students.flatMap(s => {
      const prev = existingBy.get(s.id)
      const result = results[s.id] || ''
      const note = (notes[s.id] || '').trim()
      const prevResult = prev && prev.result !== 'pending' ? prev.result : ''
      if (result === prevResult && note === (prev?.notes || '')) return []
      if (!prev && !result && !note) return []
      return [{ student_id: s.id, exam_id: exam.id, result: result || 'pending', notes: note || null }]
    })
    if (rows.length) {
      const { error: err } = await supabase.from('student_exams').upsert(rows, { onConflict: 'student_id,exam_id' })
      if (err) { setError(dbError(err)); setSaving(false); return }
    }
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  function changeResult(studentId: string, result: Result) {
    // Pressing the selected result again clears it
    setResults(prev => ({ ...prev, [studentId]: prev[studentId] === result ? '' : result }))
    setSaved(false)
  }
  function changeNote(studentId: string, value: string) {
    setNotes(prev => ({ ...prev, [studentId]: value }))
    setSaved(false)
  }

  if (students.length === 0) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: 'var(--txt2)', fontSize: 13 }}>
        {L.none}
      </div>
    )
  }

  const listProps = {
    results, notes, classesByStudent, RESULTS, L, isRtl,
    onResultChange: changeResult, onNoteChange: changeNote, onTransfer: (s: any) => setTransferFor(s),
  }
  const errorBox = error && (
    <p role="alert" style={{ margin: 0, padding: '10px 14px', borderRadius: 10, background: '#e0404012', border: '1px solid #e0404040', color: '#e04040', fontSize: 12.5, fontWeight: 600 }}>{error}</p>
  )
  const modal = transferFor && (
    <TransferModal
      student={transferFor}
      current={classesByStudent[transferFor.id] || []}
      allClasses={allClasses}
      L={L}
      isRtl={isRtl}
      onClose={() => setTransferFor(null)}
      onDone={async (toClassId, fromClassId) => {
        const r = await transferStudent(transferFor.id, fromClassId, toClassId, L.tNote(exam.name))
        if (r.error) return r.error
        // Record the exam outcome as "Transferred" (keeps any note already typed)
        const { error: err } = await supabase.from('student_exams').upsert(
          [{ student_id: transferFor.id, exam_id: exam.id, result: 'transferred', notes: (notes[transferFor.id] || '').trim() || null }],
          { onConflict: 'student_id,exam_id' })
        setTransferFor(null)
        if (err) setError(dbError(err))
        else setResults(prev => ({ ...prev, [transferFor.id]: 'transferred' }))
        router.refresh()
        return null
      }}
    />
  )

  // ── Group students by grade + term when multiple levels ──
  if (isGrouped) {
    const groupMap = new Map<string, { label: string; sortKey: string; students: any[] }>()
    for (const s of students) {
      const gradeName = s.grade?.name ?? (isRtl ? 'غير محدد' : 'Unknown')
      const termName  = s.term?.name  ?? ''
      const label     = termName ? `${gradeName} ${termName}` : gradeName
      const key       = `${s.grade?.id ?? 'none'}__${s.term?.id ?? 'none'}`
      if (!groupMap.has(key)) groupMap.set(key, { label, sortKey: sortGroupKey(label), students: [] })
      groupMap.get(key)!.students.push(s)
    }
    const groups = [...groupMap.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map(group => {
          const count = (k: Result) => group.students.filter(s => results[s.id] === k).length
          const pass = count('pass'), fail = count('fail')
          const other = group.students.filter(s => results[s.id] && results[s.id] !== 'pass' && results[s.id] !== 'fail').length
          const pending = group.students.length - pass - fail - other
          return (
            <div key={group.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>{group.label}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Count n={pass} label={L.pass} color="#3dab7e" />
                  <Count n={fail} label={L.fail} color="#e04040" />
                  {other > 0 && <Count n={other} label={L.other} color="#8B6EC8" />}
                  <Count n={pending} label={L.pending} color="var(--txt2)" muted />
                </div>
              </div>
              <StudentList students={group.students} {...listProps} />
            </div>
          )
        })}
        {errorBox}
        <SaveBar saving={saving} saved={saved} L={L} isRtl={isRtl} onSave={saveResults} />
        {modal}
      </div>
    )
  }

  // ── Flat list for a specific level ──
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{L.student}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{L.result}</span>
      </div>
      <StudentList students={students} {...listProps} />
      {error && <div style={{ padding: '12px 20px 0' }}>{errorBox}</div>}
      <SaveBar saving={saving} saved={saved} L={L} isRtl={isRtl} onSave={saveResults} />
      {modal}
    </div>
  )
}

function Count({ n, label, color, muted }: { n: number; label: string; color: string; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '4px 12px',
      background: muted ? 'var(--bg-card)' : color + '18', border: `1px solid ${muted ? 'var(--border)' : color + '30'}`,
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color }}>{n}</span>
      <span style={{ fontSize: 11, color, opacity: 0.8 }}>{label}</span>
    </div>
  )
}

function StudentList({ students, results, notes, classesByStudent, RESULTS, L, isRtl, onResultChange, onNoteChange, onTransfer }: {
  students: any[]
  results: Record<string, Result | ''>
  notes: Record<string, string>
  classesByStudent: Record<string, ClassRow[]>
  RESULTS: { key: Result; label: string; color: string }[]
  L: Record<string, any>
  isRtl: boolean
  onResultChange: (studentId: string, result: Result) => void
  onNoteChange: (studentId: string, value: string) => void
  onTransfer: (student: any) => void
}) {
  return (
    <div>
      {students.map((student, idx) => {
        const result      = results[student.id] || ''
        const displayName = isRtl ? student.name_ar : (student.name_en || student.name_ar)
        const initials    = (student.name_ar || '').slice(0, 1)
        const rowColor    = result === 'transferred' ? '#e8960a' : RESULTS.find(r => r.key === result)?.color
        const classes     = classesByStudent[student.id] || []
        const moved       = result === 'transferred'

        return (
          <div key={student.id} style={{
            padding: '12px 20px',
            borderBottom: idx < students.length - 1 ? '1px solid var(--border)' : 'none',
            background: rowColor ? rowColor + '08' : 'transparent', transition: 'background 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: '#d4667a18', border: '1px solid #d4667a30',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#d4667a',
              }}>
                {initials}
              </div>

              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{displayName}</p>
                {student.name_en && student.name_ar && (
                  <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '1px 0 0' }}>{isRtl ? student.name_en : student.name_ar}</p>
                )}
                {/* Her class(es): grade · term · day · time */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                  {classes.length === 0
                    ? <span style={{ fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic' }}>{L.noClass}</span>
                    : classes.map(c => (
                      <span key={c.id} dir="ltr" style={{ fontSize: 11, fontWeight: 600, color: '#c9506a', background: '#d4667a12', border: '1px solid #d4667a26', borderRadius: 6, padding: '2px 8px' }}>
                        {classLabel(c, isRtl)}
                      </span>
                    ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {RESULTS.map(r => {
                  const active = result === r.key
                  return (
                    <button key={r.key} type="button" aria-pressed={active} onClick={() => onResultChange(student.id, r.key)} style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                      background: active ? r.color + '22' : 'var(--bg-page)',
                      border: `1px solid ${active ? r.color + '55' : 'var(--border)'}`,
                      color: active ? r.color : 'var(--txt2)',
                    }}>
                      {r.label}
                    </button>
                  )
                })}
                <button type="button" onClick={() => onTransfer(student)} aria-pressed={moved} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  background: moved ? '#e8960a22' : 'var(--bg-page)',
                  border: `1px solid ${moved ? '#e8960a55' : 'var(--border)'}`,
                  color: moved ? '#c27c00' : 'var(--txt2)',
                }}>
                  <ArrowLeftRight size={12} />{L.transferred}
                </button>
              </div>
            </div>

            <input
              value={notes[student.id] || ''}
              onChange={e => onNoteChange(student.id, e.target.value)}
              placeholder={L.notes}
              aria-label={L.notes}
              dir="auto"
              style={{
                display: 'block', width: '100%', marginTop: 8, height: 32, padding: '0 10px',
                borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--txt1)', fontSize: 12, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function TransferModal({ student, current, allClasses, L, isRtl, onClose, onDone }: {
  student: any
  current: ClassRow[]
  allClasses: ClassRow[]
  L: Record<string, any>
  isRtl: boolean
  onClose: () => void
  onDone: (toClassId: string, fromClassId: string | null) => Promise<string | null>
}) {
  const [q, setQ] = useState('')
  const [to, setTo] = useState('')
  const [from, setFrom] = useState(current[0]?.id || '')
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()
  const name = isRtl ? student.name_ar : (student.name_en || student.name_ar)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return allClasses
      .map(c => ({ c, label: classLabel(c, isRtl) }))
      .filter(x => !s || x.label.toLowerCase().includes(s) || x.c.name.toLowerCase().includes(s))
      .sort((a, b) => compareClassNames(a.c.name, b.c.name))
  }, [allClasses, q, isRtl])

  function confirm() {
    if (!to) { setErr(L.tPick); return }
    if (from && from === to) { setErr(L.tSame); return }
    setErr('')
    start(async () => {
      const e = await onDone(to, from || null)
      if (e) setErr(e)
    })
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(30,12,20,.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-label={L.tTitle} style={{
        width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-popup)', border: '1px solid var(--border)', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,.35)', direction: isRtl ? 'rtl' : 'ltr', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 18px 10px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>{L.tTitle}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--txt2)' }}>{L.tSub(name)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={L.tCancel} style={{ background: 'none', border: 0, color: 'var(--txt2)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        {current.length > 1 && (
          <label style={{ display: 'block', padding: '0 18px 10px', fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>
            {L.tFrom}
            <select value={from} onChange={e => setFrom(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--txt1)', fontSize: 12.5, padding: '0 8px', fontFamily: 'inherit' }}>
              {current.map(c => <option key={c.id} value={c.id}>{classLabel(c, isRtl)}</option>)}
            </select>
          </label>
        )}

        <div style={{ padding: '0 18px 10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--txt2)' }}>
            <Search size={14} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={L.tSearch} aria-label={L.tSearch} autoFocus
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', color: 'var(--txt1)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
        </div>

        <div role="listbox" aria-label={L.tPick} style={{ overflowY: 'auto', padding: '0 10px', flex: 1 }}>
          {list.length === 0 && <p style={{ textAlign: 'center', color: 'var(--txt2)', fontSize: 12.5, padding: 20 }}>{L.tNoMatch}</p>}
          {list.map(({ c, label }) => {
            const isCurrent = current.some(x => x.id === c.id)
            const on = to === c.id
            return (
              <button key={c.id} type="button" role="option" aria-selected={on} onClick={() => { setTo(c.id); setErr('') }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'start', margin: '2px 0',
                padding: '9px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
                background: on ? '#d4667a1c' : 'transparent', border: `1px solid ${on ? '#d4667a66' : 'transparent'}`,
                color: 'var(--txt1)', fontWeight: on ? 700 : 500,
              }}>
                <span dir="ltr" style={{ flex: 1, textAlign: isRtl ? 'right' : 'left' }}>{label}</span>
                {isCurrent && <span style={{ fontSize: 10.5, color: 'var(--txt2)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px' }}>{L.tCurrent}</span>}
              </button>
            )
          })}
        </div>

        {err && <p role="alert" style={{ margin: '8px 18px 0', fontSize: 12, fontWeight: 600, color: '#e04040' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, padding: 14, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <button type="button" onClick={confirm} disabled={pending} style={{ flex: 1, height: 38, borderRadius: 10, border: 0, background: '#d4667a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: pending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: pending ? .6 : 1 }}>
            {pending ? '…' : L.tConfirm}
          </button>
          <button type="button" onClick={onClose} style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--txt1)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {L.tCancel}
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveBar({ saving, saved, L, isRtl, onSave }: {
  saving: boolean; saved: boolean; L: Record<string, any>; isRtl: boolean; onSave: () => void
}) {
  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
      <button onClick={onSave} disabled={saving || saved} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
        cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        border: 'none', transition: 'all 0.15s', opacity: saving ? 0.5 : 1,
        background: saved ? '#3dab7e22' : '#d4667a',
        color: saved ? '#3dab7e' : '#fff',
        outline: saved ? '1px solid #3dab7e44' : 'none',
      }}>
        <Save size={14} />
        {saving ? L.saving : saved ? L.saved : L.save}
      </button>
    </div>
  )
}
