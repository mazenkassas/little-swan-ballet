'use client'
import { useState, useTransition, useMemo } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { transferStudent } from './actions'

interface Props {
  studentId: string
  studentName: string
  isRtl: boolean
}

export default function StudentTransferButton({ studentId, studentName, isRtl }: Props) {
  const [open, setOpen]                     = useState(false)
  const [grades, setGrades]                 = useState<any[]>([])
  const [terms, setTerms]                   = useState<any[]>([])
  const [allClasses, setAllClasses]         = useState<any[]>([])
  const [currentClasses, setCurrentClasses] = useState<any[]>([])

  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedTerm, setSelectedTerm]   = useState('')
  const [fromClassId, setFromClassId]     = useState('')
  const [toClassId, setToClassId]         = useState('')
  const [notes, setNotes]                 = useState('')
  const [err, setErr]                     = useState('')
  const [submitted, setSubmitted]         = useState(false)
  const [pending, startTransition]        = useTransition()

  const L = isRtl ? {
    btn: 'نقل', title: 'نقل الطالبة',
    sub: (n: string) => `نقل ${n} إلى مجموعة أخرى`,
    from: 'من مجموعة', fromDef: 'اختر المجموعة الحالية',
    grade: 'المستوى', gradeDef: 'اختر المستوي',
    term: 'الفصل', termDef: 'اختر الفصل',
    toClass: 'المجموعة الجديدة', toClassDef: 'اختر المجموعه',
    notes: 'ملاحظات (اختياري)', notesPlaceholder: 'سبب النقل…',
    confirm: 'تأكيد', cancel: 'إلغاء',
    sameClass: 'اختر مجموعة مختلفة',
    requiredFrom: 'اختر المجموعة الحالية',
    requiredGrade: 'اختر المستوى',
    requiredTerm: 'اختر الفصل الدراسي',
    requiredTo: 'اختر المجموعة الجديدة',
    noClasses: 'لا توجد مجموعات بهذه المعايير',
  } : {
    btn: 'Transfer', title: 'Transfer Student',
    sub: (n: string) => `Move ${n} to another group`,
    from: 'From Group', fromDef: 'Select current group',
    grade: 'Grade', gradeDef: 'Select grade',
    term: 'Term', termDef: 'Select term',
    toClass: 'To Group', toClassDef: 'Select group',
    notes: 'Notes (optional)', notesPlaceholder: 'Reason for transfer…',
    confirm: 'Confirm', cancel: 'Cancel',
    sameClass: 'Choose a different group',
    requiredFrom: 'Select the current group',
    requiredGrade: 'Select a grade',
    requiredTerm: 'Select a term',
    requiredTo: 'Select the new group',
    noClasses: 'No groups match this filter',
  }

  async function openModal() {
    const supabase = createClient()
    const [{ data: g }, { data: t }, { data: cls }, { data: enrolled }] = await Promise.all([
      supabase.from('grades').select('id, name').order('order_num'),
      supabase.from('terms').select('id, name').order('order_num'),
      supabase.from('classes').select('id, name, grade_id, term_id').eq('is_active', true).order('name'),
      supabase.from('class_students').select('class_id, class:classes(id, name)').eq('student_id', studentId),
    ])
    setGrades(g || [])
    setTerms(t || [])
    setAllClasses(cls || [])
    setCurrentClasses(enrolled || [])
    setSelectedGrade('')
    setSelectedTerm('')
    setFromClassId(enrolled?.length === 1 ? enrolled[0].class_id : '')
    setToClassId('')
    setNotes('')
    setErr('')
    setSubmitted(false)
    setOpen(true)
  }

  const filteredClasses = useMemo(() => {
    return allClasses.filter(c => {
      const matchGrade = !selectedGrade || c.grade_id === selectedGrade
      const matchTerm  = !selectedTerm  || c.term_id  === selectedTerm
      return matchGrade && matchTerm
    })
  }, [allClasses, selectedGrade, selectedTerm])

  function handleTransfer() {
    setSubmitted(true)
    if (currentClasses.length > 0 && !fromClassId) { setErr(L.requiredFrom);  return }
    if (!selectedGrade)                             { setErr(L.requiredGrade); return }
    if (!selectedTerm)                              { setErr(L.requiredTerm);  return }
    if (!toClassId)                                 { setErr(L.requiredTo);    return }
    if (fromClassId && fromClassId === toClassId)   { setErr(L.sameClass);     return }
    setErr('')
    startTransition(async () => {
      const r = await transferStudent(studentId, fromClassId || null, toClassId, notes)
      if (r.error) { setErr(r.error); return }
      setOpen(false)
    })
  }

  function sel(invalid: boolean): React.CSSProperties {
    return {
      width: '100%', padding: '8px 10px', borderRadius: 8,
      border: `1px solid ${submitted && invalid ? '#e04040' : 'var(--border)'}`,
      background: 'var(--surface)', color: 'var(--txt1)',
      fontSize: 13, outline: 'none', fontFamily: 'inherit',
      direction: isRtl ? 'rtl' : 'ltr',
    }
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4,
  }
  const req: React.CSSProperties = { color: '#e04040', marginInlineStart: 2 }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={openModal}
        onKeyDown={e => e.key === 'Enter' && openModal()}
        style={{
          backgroundColor: '#7c3aed', borderRadius: 8, padding: '4px 10px', color: '#fff',
          fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {L.btn}
      </span>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{
            background: 'var(--bg-popup)', border: '1px solid var(--border)',
            borderRadius: 18, width: '100%', maxWidth: 460,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            direction: isRtl ? 'rtl' : 'ltr',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, marginBottom: 12,
                background: '#11111118', border: '1px solid #33333330',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ArrowLeftRight size={18} color="var(--txt1)" />
              </div>
              <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: 'var(--txt1)' }}>{L.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)' }}>{L.sub(studentName)}</p>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* From (only if currently enrolled) */}
              {currentClasses.length > 0 && (
                <div>
                  <label style={lbl}>{L.from}<span style={req}>*</span></label>
                  <select value={fromClassId} onChange={e => setFromClassId(e.target.value)} style={sel(!fromClassId)}>
                    <option value="">{L.fromDef}</option>
                    {currentClasses.map((e: any) => (
                      <option key={e.class_id} value={e.class_id}>{e.class?.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grade + Term filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>{L.grade}<span style={req}>*</span></label>
                  <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setToClassId('') }} style={sel(!selectedGrade)}>
                    <option value="">{L.gradeDef}</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{L.term}<span style={req}>*</span></label>
                  <select value={selectedTerm} onChange={e => { setSelectedTerm(e.target.value); setToClassId('') }} style={sel(!selectedTerm)}>
                    <option value="">{L.termDef}</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Target class */}
              <div>
                <label style={lbl}>{L.toClass}<span style={req}>*</span></label>
                <select value={toClassId} onChange={e => setToClassId(e.target.value)} style={sel(!toClassId)}>
                  <option value="">{filteredClasses.length === 0 ? L.noClasses : L.toClassDef}</option>
                  {filteredClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={lbl}>{L.notes}</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={L.notesPlaceholder}
                  rows={2}
                  style={{ ...sel(false), resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {err && <p style={{ margin: 0, fontSize: 12, color: '#e04040' }}>⚠ {err}</p>}
            </div>

            {/* Footer */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end',
              flexDirection: isRtl ? 'row-reverse' : 'row' }}>
              <button
                onClick={handleTransfer}
                disabled={pending}
                style={{
                  backgroundColor: '#7c3aed', backgroundImage: 'none',
                  border: 'none', borderRadius: 10,
                  padding: '9px 20px', color: '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: pending ? 'not-allowed' : 'pointer',
                  opacity: pending ? 0.6 : 1, fontFamily: 'inherit',
                }}
              >
                {pending ? '…' : L.confirm}
              </button>
              <button onClick={() => setOpen(false)} style={{
                background: 'var(--bg-page)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '9px 18px', color: 'var(--txt2)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {L.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
