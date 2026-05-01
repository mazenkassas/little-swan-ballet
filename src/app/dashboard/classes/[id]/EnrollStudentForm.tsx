'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EnrollStudentForm({ classId, students, enrolledIds, currentCount, maxCapacity }: {
  classId: string
  students: any[]
  enrolledIds: string[]
  currentCount: number
  maxCapacity: number
}) {
  const locale   = useLocale()
  const isRtl    = locale === 'ar'
  const supabase = createClient()
  const router   = useRouter()

  const [selected, setSelected] = useState<string[]>([])
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')

  const remaining = maxCapacity - currentCount
  const isFull    = remaining <= 0

  const totalActive = students.length

  const L = isRtl ? {
    title: 'تسجيل طالبة',
    placeholder: 'اختر الطالبات…',
    alreadyEnrolled: '(مسجلة)',
    enroll: 'تسجيل', enrolling: 'جارٍ التسجيل…',
    success: (n: number) => `تم تسجيل ${n} طالبة ✓`,
    full: `المجموعة ممتلئة (${currentCount}/${maxCapacity})`,
    capacity: `${currentCount}/${totalActive} طالبة نشطة`,
    selected: (n: number) => `${n} محددة`,
  } : {
    title: 'Enroll Students',
    placeholder: 'Select students…',
    alreadyEnrolled: '(enrolled)',
    enroll: 'Enroll', enrolling: 'Enrolling…',
    success: (n: number) => `${n} student${n > 1 ? 's' : ''} enrolled ✓`,
    full: `Group is full (${currentCount}/${maxCapacity})`,
    capacity: `${currentCount}/${totalActive} active students`,
    selected: (n: number) => `${n} selected`,
  }

  function toggleStudent(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setMsg('')
  }

  async function enroll() {
    if (!selected.length || isFull) return
    setLoading(true); setMsg('')

    const rows = selected.map(studentId => ({
      student_id:    studentId,
      class_id:      classId,
      enrolled_date: new Date().toISOString().split('T')[0],
    }))

    const { error } = await supabase.from('class_students').insert(rows)
    if (error) { setMsg(error.message) }
    else {
      const count = selected.length
      setSelected([])
      setMsg(L.success(count))
      router.refresh()
    }
    setLoading(false)
  }

  const unenrolledStudents = students.filter(s => !enrolledIds.includes(s.id))
  const allUnenrolledSelected =
    unenrolledStudents.length > 0 &&
    unenrolledStudents.every(s => selected.includes(s.id))

  function toggleAll() {
    if (allUnenrolledSelected) {
      setSelected([])
    } else {
      setSelected(unenrolledStudents.map(s => s.id))
    }
    setMsg('')
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, direction: isRtl ? 'rtl' : 'ltr',
    }}>
      <p style={{
        margin: '0 0 14px', color: 'var(--txt1)', fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <UserPlus size={15} style={{ color: '#d4667a', flexShrink: 0 }} />
        {L.title}
      </p>

      {isFull ? (
        <div style={{
          textAlign: 'center', padding: '20px 0',
          background: '#f5a62310', border: '1px solid #f5a62330',
          borderRadius: 10, color: '#f5a623', fontSize: 12,
        }}>
          {L.full}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Select-all row */}
          {unenrolledStudents.length > 0 && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              background: 'var(--bg-page)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--txt2)', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={allUnenrolledSelected}
                onChange={toggleAll}
                style={{ accentColor: '#d4667a', width: 14, height: 14, cursor: 'pointer' }}
              />
              {isRtl ? 'تحديد الكل' : 'Select all'}
              {selected.length > 0 && (
                <span style={{
                  marginInlineStart: 'auto', fontSize: 11,
                  background: '#d4667a22', color: '#d4667a',
                  padding: '1px 7px', borderRadius: 20, fontWeight: 600,
                }}>
                  {L.selected(selected.length)}
                </span>
              )}
            </label>
          )}

          {/* Scrollable student list */}
          <div style={{
            maxHeight: 220, overflowY: 'auto',
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg-page)',
          }}>
            {students.length === 0 && (
              <p style={{ margin: 0, padding: '12px', textAlign: 'center', color: 'var(--txt2)', fontSize: 12 }}>
                {isRtl ? 'لا توجد طالبات' : 'No students'}
              </p>
            )}
            {students.map((s, i) => {
              const name       = isRtl || !s.name_en ? s.name_ar : s.name_en
              const isEnrolled = enrolledIds.includes(s.id)
              const isChecked  = selected.includes(s.id)

              return (
                <label
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    cursor: isEnrolled ? 'default' : 'pointer',
                    opacity: isEnrolled ? 0.45 : 1,
                    background: isChecked ? '#d4667a10' : 'transparent',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isEnrolled}
                    onChange={() => !isEnrolled && toggleStudent(s.id)}
                    style={{ accentColor: '#d4667a', width: 14, height: 14, cursor: isEnrolled ? 'default' : 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--txt1)', flex: 1 }}>{name}</span>
                  {isEnrolled && (
                    <span style={{ fontSize: 10, color: '#d4667a', fontWeight: 600 }}>
                      {L.alreadyEnrolled}
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <button
            onClick={enroll}
            disabled={!selected.length || loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              backgroundColor: '#d4667a', backgroundImage: 'none',
              border: 'none', borderRadius: 8, padding: '10px', color: '#fff',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              cursor: !selected.length || loading ? 'not-allowed' : 'pointer',
              opacity: !selected.length || loading ? 0.5 : 1, transition: 'opacity 0.15s',
            }}
          >
            <UserPlus size={14} />
            {loading ? L.enrolling : L.enroll}
            {selected.length > 0 && !loading && ` (${selected.length})`}
          </button>

          {msg && (
            <p style={{
              margin: 0, textAlign: 'center', fontSize: 12,
              color: msg.includes('✓') ? '#3dab7e' : '#e04040',
            }}>
              {msg}
            </p>
          )}

          <p style={{ margin: 0, textAlign: 'center', color: 'var(--txt2)', fontSize: 11 }}>
            {L.capacity}
          </p>
        </div>
      )}
    </div>
  )
}
