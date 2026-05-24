'use client'

import { useState, useTransition } from 'react'
import { confirmAttendanceRecord } from '../actions'

type AttRecord = {
  id: string
  status: string
  coach_status: string | null
  session: { id: string; date: string; class: { name: string } | null } | null
  student: { name_ar: string | null; name_en: string | null } | null
}

function StatusBadge({ status, isRtl }: { status: string | null; isRtl: boolean }) {
  if (!status) {
    return (
      <span style={{ background: '#e8960a18', color: '#e8960a', border: '1px solid #e8960a28', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {isRtl ? 'بانتظار التأكيد' : 'Pending'}
      </span>
    )
  }
  const map: Record<string, { bg: string; color: string; label: string }> = {
    present: { bg: '#3dab7e18', color: '#3dab7e', label: isRtl ? 'حاضرة' : 'Present' },
    absent:  { bg: '#e0404018', color: '#e04040', label: isRtl ? 'غائبة'  : 'Absent'  },
    make_up: { bg: '#8e5fd918', color: '#8e5fd9', label: isRtl ? 'تعويض'  : 'Make-up' },
  }
  const m = map[status] || { bg: 'var(--bg2)', color: 'var(--txt2)', label: status }
  return (
    <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}28`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

const TH_STYLE: React.CSSProperties = {
  color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
  padding: '10px 14px', borderBottom: '1px solid var(--border)',
  background: 'var(--bg-page)', whiteSpace: 'nowrap',
}
const TD_STYLE: React.CSSProperties = {
  padding: '10px 14px', borderBottom: '1px solid var(--border)',
  fontSize: 12, verticalAlign: 'middle',
}

export default function AttendanceConfirm({
  attendance,
  isRtl,
}: {
  attendance: AttRecord[]
  isRtl: boolean
}) {
  const [_, startTransition] = useTransition()
  const [data, setData] = useState<AttRecord[]>(attendance)
  const [inFlight, setInFlight] = useState<string | null>(null)

  const pending_   = data.filter(a => !a.coach_status)
  const confirmed_ = data.filter(a => !!a.coach_status)

  function handleConfirm(id: string, newStatus: string) {
    setInFlight(id)
    startTransition(async () => {
      const result = await confirmAttendanceRecord(id, newStatus)
      if (!result?.error) {
        setData(prev => prev.map(a => a.id === id ? { ...a, coach_status: newStatus } : a))
      }
      setInFlight(null)
    })
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short' })
  }

  function studentName(s: AttRecord['student']) {
    if (!s) return '—'
    return isRtl ? (s.name_ar || s.name_en || '—') : (s.name_en || s.name_ar || '—')
  }

  function initials(s: AttRecord['student']) {
    const n = studentName(s)
    return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  const headerCells = [
    isRtl ? 'الطالبة'      : 'Student',
    isRtl ? 'المجموعة'     : 'Class',
    isRtl ? 'التاريخ'      : 'Date',
    isRtl ? 'تسجيل الموظف' : 'Staff Entry',
    isRtl ? 'تأكيدي'       : 'My Confirmation',
  ]

  function renderTable(rows: AttRecord[], showActions: boolean) {
    return (
      <div className="tbl-outer" style={{ marginBottom: 24 }}>
        <div className="tbl-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                {[...headerCells, ...(showActions ? [''] : [])].map((h, i) => (
                  <th key={i} style={{ ...TH_STYLE, textAlign: isRtl ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(a => {
                const isWorking = inFlight === a.id
                const sName     = studentName(a.student)
                const className = a.session?.class?.name || '—'
                return (
                  <tr key={a.id}>
                    <td style={{ ...TD_STYLE, fontWeight: 600, color: 'var(--txt1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: '#4a90d918', border: '1px solid #4a90d928',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: '#4a90d9', flexShrink: 0,
                        }}>
                          {initials(a.student)}
                        </div>
                        {sName}
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, color: 'var(--txt2)' }}>{className}</td>
                    <td style={{ ...TD_STYLE, color: 'var(--txt2)', whiteSpace: 'nowrap' }}>{fmtDate(a.session?.date ?? null)}</td>
                    <td style={TD_STYLE}><StatusBadge status={a.status} isRtl={isRtl} /></td>
                    <td style={TD_STYLE}><StatusBadge status={a.coach_status ?? null} isRtl={isRtl} /></td>
                    {showActions && (
                      <td style={TD_STYLE}>
                        {!a.coach_status && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleConfirm(a.id, a.status)}
                              disabled={isWorking}
                              style={{
                                background: '#4a90d9', color: '#fff', border: 'none',
                                borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 600,
                                cursor: isWorking ? 'wait' : 'pointer', opacity: isWorking ? 0.6 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isRtl ? 'موافق ✓' : 'Confirm ✓'}
                            </button>
                            {a.status !== 'absent' && (
                              <button
                                onClick={() => handleConfirm(a.id, 'absent')}
                                disabled={isWorking}
                                style={{
                                  background: 'transparent', color: 'var(--txt2)', border: '1px solid var(--border)',
                                  borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 600,
                                  cursor: isWorking ? 'wait' : 'pointer', opacity: isWorking ? 0.6 : 1,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isRtl ? 'غائبة' : 'Correct'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="page-body" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>

      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--txt2)' }}>
          {isRtl ? 'راجع ووثّق حضور طالباتك' : 'Cross-validate with staff entry'}
        </p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--txt1)', letterSpacing: -0.4 }}>
          {isRtl ? 'تأكيد الحضور' : 'Confirm Attendance'}
        </h1>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#eef5fd', border: '1px solid #4a90d930', borderRadius: 10,
        padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 15 }}>ℹ️</span>
        <p style={{ color: '#4a90d9', fontSize: 12, fontWeight: 500, margin: 0 }}>
          {isRtl
            ? 'راجع وأكد حضور الطالبات الذي سجّله الموظفون. أي خلاف سيُعلّم للمراجعة الإدارية.'
            : 'Confirm or correct the staff-marked attendance for your classes. Discrepancies are flagged for Admin review.'}
        </p>
      </div>

      {data.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '40px 20px', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--txt2)', fontSize: 14 }}>
            {isRtl ? 'لا توجد سجلات حضور بعد' : 'No attendance records yet'}
          </p>
        </div>
      ) : (
        <>
          {pending_.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isRtl ? `بانتظار تأكيدك — ${pending_.length}` : `Awaiting Your Confirmation — ${pending_.length}`}
              </p>
              {renderTable(pending_, true)}
            </div>
          )}
          {confirmed_.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isRtl ? `تم التأكيد — ${confirmed_.length}` : `Confirmed — ${confirmed_.length}`}
              </p>
              {renderTable(confirmed_, false)}
            </div>
          )}
        </>
      )}

    </div>
  )
}
