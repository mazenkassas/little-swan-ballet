import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Clock, AlertTriangle } from 'lucide-react'

const ROLE_LABEL: Record<string, { en: string; ar: string }> = {
  super_admin: { en: 'Super Admin', ar: 'مشرف عام' },
  admin:       { en: 'Admin',       ar: 'مدير' },
  staff:       { en: 'Staff',       ar: 'موظف' },
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = await params
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const { data: member } = await supabase.from('staff').select('*').eq('id', id).single()
  if (!member) notFound()

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: attendance } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('staff_id', id)
    .gte('login_time', `${monthStart}T00:00:00`)
    .lte('login_time', `${monthEnd}T23:59:59`)
    .order('login_time', { ascending: false })

  const totalHours   = attendance?.reduce((s, a) => s + (a.hours_on_shift || 0), 0) || 0
  const flaggedCount = attendance?.filter(a => a.location_status === 'invalid').length || 0

  const role        = ROLE_LABEL[member.role] || { en: member.role, ar: member.role }
  const displayName = isRtl ? (member.name || member.name_en) : (member.name_en || member.name)
  const secondName  = isRtl ? member.name_en : member.name
  const initial     = (displayName || '').charAt(0).toUpperCase()
  const isSuperAdmin = member.role === 'super_admin'
  const logSub = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric' })

  const L = isRtl ? {
    back:        'رجوع',
    hoursMonth:  'ساعات العمل هذا الشهر',
    salary:      'الراتب الشهري',
    flagged:     'تسجيلات مشكوكة',
    log:         'سجل الحضور',
    logSub,
    date:        'التاريخ',
    checkIn:     'تسجيل دخول',
    checkOut:    'تسجيل خروج',
    hours:       'ساعات العمل',
    noLog:       'لا يوجد سجل حضور لهذا الشهر',
    total:       'إجمالي الشهر',
    locActive:   'في الدوام',
    egp:         'ج.م',
  } : {
    back:        'Back',
    hoursMonth:  'Working Hours This Month',
    salary:      'Monthly Salary',
    flagged:     'Flagged Check-ins',
    log:         'Attendance Log',
    logSub,
    date:        'Date',
    checkIn:     'Check In',
    checkOut:    'Check Out',
    hours:       'Working Hours',
    noLog:       'No attendance records this month',
    total:       'Month Total',
    locActive:   'In Progress',
    egp:         'EGP',
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '18px 20px',
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short' })
  }

  function fmtTime(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/dashboard/staff" style={{
          background: '#d4667a', borderRadius: 8, padding: '7px 16px',
          color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {L.back}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 17, flexShrink: 0,
            background: '#7c5cdb18', border: '1px solid #7c5cdb28',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#7c5cdb',
          }}>
            {initial}
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 14, fontWeight: 700 }}>{displayName}</p>
            <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>
              {isRtl ? role.ar : role.en}
              {secondName ? ` • ${secondName}` : ''}
              {member.email ? ` • ${member.email}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: isSuperAdmin ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>

          <div style={{ ...card, borderTop: '3px solid #7c5cdb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Clock size={14} color="#7c5cdb" />
              <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.hoursMonth}</span>
            </div>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#7c5cdb' }}>
              {totalHours.toFixed(1)}
              <span style={{ fontSize: 13, fontWeight: 500, marginInlineStart: 4 }}>h</span>
            </p>
          </div>

          {!isSuperAdmin && (
            <div style={{ ...card, borderTop: '3px solid #3dab7e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.salary}</span>
              </div>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#3dab7e' }}>
                {member.monthly_salary ?? '—'}
                <span style={{ fontSize: 13, fontWeight: 500, marginInlineStart: 4 }}>{L.egp}</span>
              </p>
            </div>
          )}

          <div style={{ ...card, borderTop: `3px solid ${flaggedCount > 0 ? '#e8960a' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <AlertTriangle size={14} color={flaggedCount > 0 ? '#e8960a' : 'var(--txt2)'} />
              <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.flagged}</span>
            </div>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: flaggedCount > 0 ? '#e8960a' : 'var(--txt2)' }}>
              {flaggedCount}
            </p>
          </div>
        </div>

        {/* Attendance log */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 700 }}>{L.log} — {L.logSub}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                {[L.date, L.checkIn, L.checkOut, L.hours].map(col => (
                  <th key={col} style={{
                    textAlign: isRtl ? 'right' : 'left',
                    padding: '10px 16px', fontSize: 11,
                    fontWeight: 600, color: 'var(--txt2)', whiteSpace: 'nowrap',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendance?.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--txt2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {fmtDate(a.login_time)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--txt1)', fontSize: 12, fontWeight: 500 }}>
                    {fmtTime(a.login_time) || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    {a.logout_time ? (
                      <span style={{ color: 'var(--txt1)', fontWeight: 500 }}>{fmtTime(a.logout_time)}</span>
                    ) : (
                      <span style={{
                        background: '#e8960a18', color: '#e8960a',
                        border: '1px solid #e8960a28',
                        borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                      }}>{L.locActive}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#7c5cdb' }}>
                    {a.hours_on_shift != null ? `${a.hours_on_shift}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!attendance || attendance.length === 0) && (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--txt2)', fontSize: 13 }}>
              {L.noLog}
            </div>
          )}

          {attendance && attendance.length > 0 && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)',
              background: 'var(--bg-page)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.total}</span>
              <span style={{ color: '#7c5cdb', fontSize: 14, fontWeight: 700 }}>
                {totalHours.toFixed(1)}h
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
