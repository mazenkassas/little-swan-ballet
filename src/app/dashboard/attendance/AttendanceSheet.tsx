'use client'

import { Users } from 'lucide-react'

export default function AttendanceSheet({
  session,
  students,
  existingAttendance,
  isRtl,
}: {
  session: any
  students: any[]
  existingAttendance: any[]
  isRtl: boolean
}) {
  function fmt12h(time: string) {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    const h12 = h % 12 || 12
    const s = h < 12 ? 'AM' : 'PM'
    return m === 0 ? `${h12} ${s}` : `${h12}:${String(m).padStart(2, '0')} ${s}`
  }

  const gradeName = session.class?.grade?.name || ''
  const termName  = session.class?.term?.name  || ''
  const timeStr   = session.class?.start_time
    ? `${fmt12h(session.class.start_time)} – ${fmt12h(session.class.end_time)}`
    : ''
  const coachName = isRtl ? session.coach?.name_ar : session.coach?.name_en

  const L = isRtl ? {
    students: 'الطالبات',
    noStudents: 'لا توجد طالبات مسجلات في هذه المجموعة',
    noSub: 'بدون اشتراك',
    sessions: (r: number, t: number) => `${r} / ${t} حصة متبقية`,
    payRequired: 'مطلوب الدفع',
    noCoach: 'بدون مدربة',
  } : {
    students: 'Students',
    noStudents: 'No students enrolled in this group',
    noSub: 'No subscription',
    sessions: (r: number, t: number) => `${r} / ${t} sessions left`,
    payRequired: 'Payment Required',
    noCoach: 'No coach',
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden', direction: isRtl ? 'rtl' : 'ltr',
    }}>

      {/* Session header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-page)',
      }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>
          {[gradeName, termName].filter(Boolean).join(' · ')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 6 }}>
          {timeStr && (
            <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 700 }}>{timeStr}</span>
          )}
          {session.hall?.name && (
            <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 700 }}>{session.hall.name}</span>
          )}
          {coachName && (
            <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 700 }}>{coachName}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 700 }}>
            {isRtl
              ? new Date(session.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
              : new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Users size={13} style={{ color: 'var(--txt2)' }} />
          <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>
            {students.length} {L.students}
          </span>
        </div>
      </div>

      {/* Student list */}
      <div>
        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13, opacity: 0.5 }}>
            {L.noStudents}
          </div>
        ) : students.map((student, idx) => {
          const name     = isRtl || !student.name_en ? student.name_ar : student.name_en
          const initial  = (student.name_en || student.name_ar || '').charAt(0).toUpperCase()
          const sub      = student.subscriptions?.find((s: any) => s.status === 'active')
          const needsPay = sub && sub.remaining_sessions === 0
          const subText  = sub ? L.sessions(sub.remaining_sessions, sub.total_sessions) : L.noSub

          return (
            <div
              key={student.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px',
                borderBottom: idx < students.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: '#d4667a18', border: '1px solid #d4667a28',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#d4667a',
              }}>
                {initial}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>{name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)' }}>{subText}</p>
              </div>

              {/* Payment badge */}
              {needsPay && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: '#f5a62318', color: '#f5a623',
                  border: '1px solid #f5a62330', whiteSpace: 'nowrap',
                }}>
                  {L.payRequired}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
