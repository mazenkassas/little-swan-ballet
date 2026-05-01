'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

type Coach   = { id: string; name_ar: string; name_en?: string | null }
type Student = { id: string; name_ar: string; name_en?: string | null }
type SavedSession = {
  id: string
  coach:   { name_ar: string; name_en?: string | null } | null
  student: { name_ar: string; name_en?: string | null } | null
  duration_hours: number
}
type NewRow = { coach_id: string; student_id: string; duration_hours: string }

const DURATIONS = ['0.5', '1', '1.5', '2', '2.5', '3']

export default function DailyPrivateSection({
  coaches, students, sessions, date, locale,
}: {
  coaches: Coach[]
  students: Student[]
  sessions: SavedSession[]
  date: string
  locale: string
}) {
  const supabase = createClient()
  const router   = useRouter()
  const isRtl    = locale === 'ar'

  const [rows,   setRows]   = useState<NewRow[]>([])
  const [saving, setSaving] = useState<number | null>(null)

  function addRow()  { setRows(r => [...r, { coach_id: '', student_id: '', duration_hours: '1' }]) }
  function removeRow(i: number) { setRows(r => r.filter((_, j) => j !== i)) }
  function update(i: number, field: string, value: string) {
    setRows(r => r.map((row, j) => j === i ? { ...row, [field]: value } : row))
  }

  function name(s: { name_ar: string; name_en?: string | null } | null) {
    if (!s) return '—'
    return locale === 'en' && s.name_en ? s.name_en : s.name_ar
  }

  async function saveRow(i: number) {
    const row = rows[i]
    if (!row.coach_id || !row.student_id) return
    setSaving(i)
    await supabase.from('private_sessions').insert({
      student_id: row.student_id, coach_id: row.coach_id,
      date, duration_hours: parseFloat(row.duration_hours), fee: 0,
    })
    await supabase.from('coach_attendance').insert({
      coach_id: row.coach_id, hours_worked: parseFloat(row.duration_hours),
      location_status: 'valid', notes: `Private — ${date}`,
    })
    setSaving(null)
    removeRow(i)
    router.refresh()
  }

  const th: React.CSSProperties = {
    background: 'var(--bg-page)', color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
    padding: '8px 10px', textAlign: isRtl ? 'right' : 'left',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '8px 10px', fontSize: 12, borderBottom: '1px solid var(--border)',
    color: 'var(--txt1)', verticalAlign: 'middle',
  }
  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--txt1)',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

      {/* Section header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#8e5fd918', border: '1px solid #8e5fd928', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            🎯
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
            {isRtl ? 'البرايفيت' : 'Private Sessions'}
          </p>
        </div>
        {sessions.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#8e5fd9', background: '#8e5fd918', border: '1px solid #8e5fd928', borderRadius: 20, padding: '2px 10px' }}>
            {sessions.length}
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 28 }}>#</th>
              <th style={th}>{isRtl ? 'المدربة' : 'Coach'}</th>
              <th style={th}>{isRtl ? 'الطالبة' : 'Student'}</th>
              <th style={{ ...th, width: 90, textAlign: 'center' }}>{isRtl ? 'المدة' : 'Duration'}</th>
              <th style={{ ...th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 1 ? 'var(--bg-page)' : 'transparent' }}>
                <td style={{ ...td, textAlign: 'center', color: 'var(--txt2)', fontSize: 11 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{name(s.coach)}</td>
                <td style={{ ...td, fontWeight: 600 }}>{name(s.student)}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8e5fd9', background: '#8e5fd918', border: '1px solid #8e5fd928', borderRadius: 20, padding: '2px 8px' }}>
                    {s.duration_hours}{isRtl ? 'س' : 'h'}
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'center' }} />
              </tr>
            ))}

            {rows.map((row, i) => (
              <tr key={`new-${i}`} style={{ background: '#8e5fd908' }}>
                <td style={{ ...td, textAlign: 'center', color: 'var(--txt2)', fontSize: 11 }}>{sessions.length + i + 1}</td>
                <td style={td}>
                  <select value={row.coach_id} onChange={e => update(i, 'coach_id', e.target.value)} style={inp}>
                    <option value="">{isRtl ? '— اختاري —' : '— select —'}</option>
                    {coaches.map(c => <option key={c.id} value={c.id}>{name(c)}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={row.student_id} onChange={e => update(i, 'student_id', e.target.value)} style={inp}>
                    <option value="">{isRtl ? '— اختاري —' : '— select —'}</option>
                    {students.map(s => <option key={s.id} value={s.id}>{name(s)}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={row.duration_hours} onChange={e => update(i, 'duration_hours', e.target.value)} style={inp}>
                    {DURATIONS.map(d => <option key={d} value={d}>{d}{isRtl ? 'س' : 'h'}</option>)}
                  </select>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    <button onClick={() => saveRow(i)} disabled={saving === i || !row.coach_id || !row.student_id}
                      style={{ background: '#8e5fd9', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: (!row.coach_id || !row.student_id) ? 0.4 : 1 }}>
                      {saving === i ? '…' : '✓'}
                    </button>
                    <button onClick={() => removeRow(i)}
                      style={{ background: 'none', border: 'none', color: '#e04040', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                </td>
              </tr>
            ))}

            {sessions.length === 0 && rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...td, textAlign: 'center', padding: '24px', color: 'var(--txt2)' }}>
                  {isRtl ? 'لا توجد جلسات برايفيت اليوم' : 'No private sessions today'}
                </td>
              </tr>
            )}

            <tr>
              <td colSpan={5} style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <button onClick={addRow} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#8e5fd9', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Plus size={13} />
                  {isRtl ? 'إضافة جلسة' : 'Add Session'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
