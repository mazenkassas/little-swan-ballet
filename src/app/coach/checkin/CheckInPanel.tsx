'use client'

import { useState, useTransition } from 'react'
import { coachCheckIn, coachCheckOut } from '../actions'
import { MapPin } from 'lucide-react'

type Session = {
  id: string
  date: string
  class: { id: string; name: string; start_time: string | null; end_time: string | null; hall: { name: string } | null } | null
}
type Log = {
  id: string
  session_id: string | null
  check_in_time: string
  check_out_time: string | null
  hours_worked: number | null
  location_status: string | null
}
type HistoryRow = Log & {
  session: { date: string; class: { name: string } | null } | null
}

export default function CheckInPanel({
  todaySessions,
  todayLogs,
  history,
  isRtl,
}: {
  todaySessions: Session[]
  todayLogs: Log[]
  history: HistoryRow[]
  isRtl: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function getGps(): Promise<{ lat: number | null; lng: number | null }> {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve({ lat: null, lng: null })
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 10000 },
      )
    })
  }

  function handleCheckIn(sessionId: string | null) {
    startTransition(async () => {
      setFlash(null)
      const { lat, lng } = await getGps()
      const result = await coachCheckIn(sessionId, lat, lng)
      setFlash(result?.error
        ? { type: 'err', msg: result.error }
        : { type: 'ok', msg: isRtl ? 'تم تسجيل الدخول ✓' : 'Checked in successfully ✓' })
    })
  }

  function handleCheckOut(attendanceId: string) {
    startTransition(async () => {
      setFlash(null)
      const { lat, lng } = await getGps()
      const result = await coachCheckOut(attendanceId, lat, lng)
      setFlash(result?.error
        ? { type: 'err', msg: result.error }
        : { type: 'ok', msg: isRtl ? 'تم تسجيل الخروج ✓' : 'Checked out successfully ✓' })
    })
  }

  function fmtTime(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }
  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short' })
  }

  function getLogForSession(sessionId: string) {
    return todayLogs.find(l => l.session_id === sessionId) ?? null
  }
  const activeLog = todayLogs.find(l => l.check_in_time && !l.check_out_time) ?? null

  const btnStyle = (primary: boolean): React.CSSProperties => ({
    background: primary ? '#4a90d9' : 'transparent',
    color: primary ? '#fff' : 'var(--txt2)',
    border: primary ? 'none' : '1px solid var(--border)',
    borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 700,
    cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const,
  })

  return (
    <div className="page-body" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--txt2)' }}>
          {isRtl ? 'حضور الحصة بتوثيق GPS' : 'GPS-verified session attendance'}
        </p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--txt1)', letterSpacing: -0.4 }}>
          {isRtl ? 'تسجيل الدخول / الخروج' : 'Check In / Out'}
        </h1>
      </div>

      {/* GPS info banner */}
      <div style={{
        background: '#fff8e6', border: '1px solid #e8960a40', borderRadius: 10,
        padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <MapPin size={15} color="#e8960a" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: '#e8960a', fontSize: 12, fontWeight: 500, margin: 0 }}>
          {isRtl
            ? 'سيتم تسجيل موقعك GPS عند الدخول والخروج. لن يتم منعك حتى لو كنت خارج النطاق — الإدارة ستراجع السجلات المشكوك فيها.'
            : 'Your GPS location will be recorded on check-in and check-out. You will NOT be blocked even if outside range — admin reviews flagged entries.'}
        </p>
      </div>

      {/* Flash message */}
      {flash && (
        <div style={{
          background: flash.type === 'ok' ? '#edfaf4' : '#fff0f0',
          border: `1px solid ${flash.type === 'ok' ? '#3dab7e' : '#e04040'}40`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 14,
          color: flash.type === 'ok' ? '#3dab7e' : '#e04040',
          fontSize: 12, fontWeight: 600,
        }}>
          {flash.msg}
        </div>
      )}

      {/* Session cards */}
      {todaySessions.length > 0 ? (
        <div className="kpi-grid-2" style={{ marginBottom: 20 }}>
          {todaySessions.map(s => {
            const log       = getLogForSession(s.id)
            const className = s.class?.name || (isRtl ? 'حصة' : 'Session')
            const start     = s.class?.start_time?.slice(0, 5) ?? ''
            const end       = s.class?.end_time?.slice(0, 5) ?? ''
            const hall      = s.class?.hall?.name ?? ''

            return (
              <div key={s.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderTop: '3px solid #4a90d9',
                borderRadius: 14, padding: '18px 20px',
              }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
                  {className}
                </p>
                <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--txt2)' }}>
                  {start}{end ? `–${end}` : ''}{hall ? ` · ${hall}` : ''}
                </p>

                {log ? (
                  <div>
                    {[
                      { l: isRtl ? 'دخل' : 'Checked In', v: fmtTime(log.check_in_time) ?? '—' },
                      { l: isRtl ? 'خرج' : 'Checked Out', v: log.check_out_time ? fmtTime(log.check_out_time) ?? '—' : '—' },
                      { l: isRtl ? 'الساعات' : 'Hours', v: log.hours_worked != null ? `${log.hours_worked}${isRtl ? 'س' : 'h'}` : (isRtl ? 'جارٍ' : 'In progress') },
                    ].map(row => (
                      <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{row.l}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt1)' }}>{row.v}</span>
                      </div>
                    ))}
                    {!log.check_out_time && (
                      <button onClick={() => handleCheckOut(log.id)} disabled={pending} style={{ ...btnStyle(true), marginTop: 12, width: '100%', justifyContent: 'center' }}>
                        ✓ {isRtl ? 'تسجيل الخروج الآن' : 'Check Out Now'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 10px' }}>
                      {isRtl ? 'لم يتم تسجيل الدخول بعد' : 'Not yet checked in'}
                    </p>
                    <button onClick={() => handleCheckIn(s.id)} disabled={pending} style={{ ...btnStyle(true), width: '100%', justifyContent: 'center' }}>
                      <MapPin size={13} />
                      {isRtl ? 'تسجيل الدخول' : 'Check In'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px', marginBottom: 20,
        }}>
          <p style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>
            {isRtl ? 'لا توجد حصص مجدولة اليوم' : 'No sessions scheduled today'}
          </p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 14px' }}>
            {isRtl ? 'يمكنك تسجيل الدخول يدوياً إذا لزم الأمر' : 'You can still check in manually if needed'}
          </p>
          {activeLog ? (
            <button onClick={() => handleCheckOut(activeLog.id)} disabled={pending} style={btnStyle(true)}>
              ✓ {isRtl ? 'تسجيل الخروج الآن' : 'Check Out Now'}
            </button>
          ) : (
            <button onClick={() => handleCheckIn(null)} disabled={pending} style={btnStyle(true)}>
              <MapPin size={13} />
              {isRtl ? 'تسجيل دخول يدوي' : 'Manual Check In'}
            </button>
          )}
        </div>
      )}

      {/* History table */}
      <div className="tbl-outer">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
            {isRtl ? 'سجل الحضور' : 'Check-in History'}
          </p>
        </div>
        <div className="tbl-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                {[
                  isRtl ? 'المجموعة' : 'Class',
                  isRtl ? 'التاريخ' : 'Date',
                  isRtl ? 'دخل' : 'In',
                  isRtl ? 'خرج' : 'Out',
                  isRtl ? 'الساعات' : 'Hours',
                  'GPS',
                ].map(h => (
                  <th key={h} style={{
                    textAlign: isRtl ? 'right' : 'left',
                    color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-page)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--txt2)', fontSize: 13 }}>
                    {isRtl ? 'لا يوجد سجل بعد' : 'No history yet'}
                  </td>
                </tr>
              ) : history.map(l => {
                const className    = l.session?.class?.name || (isRtl ? 'يدوي' : 'Manual')
                const isFlagged    = l.location_status === 'invalid'
                const isActiveNow  = !l.check_out_time
                return (
                  <tr key={l.id}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--txt1)', borderBottom: '1px solid var(--border)' }}>
                      {className}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--txt2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {fmtDate(l.check_in_time)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--txt1)', borderBottom: '1px solid var(--border)' }}>
                      {fmtTime(l.check_in_time) ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      {isActiveNow ? (
                        <span style={{ background: '#e8960a18', color: '#e8960a', border: '1px solid #e8960a28', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                          {isRtl ? 'جارٍ' : 'Active'}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)' }}>
                          {fmtTime(l.check_out_time)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#4a90d9', borderBottom: '1px solid var(--border)' }}>
                      {l.hours_worked != null ? `${l.hours_worked}${isRtl ? 'س' : 'h'}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      {l.location_status === 'pending' ? (
                        <span style={{ background: 'var(--bg2)', color: 'var(--txt2)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                          {isRtl ? 'قيد المراجعة' : 'Pending'}
                        </span>
                      ) : isFlagged ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e8960a18', color: '#e8960a', border: '1px solid #e8960a28', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                          ⚠ {isRtl ? 'مشكوك' : 'Flagged'}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e28', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                          ✓ {isRtl ? 'صحيح' : 'Valid'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
