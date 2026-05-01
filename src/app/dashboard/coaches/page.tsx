import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { getLocale } from 'next-intl/server'
import CoachCardActions from './CoachCardActions'

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params   = await searchParams
  const tab      = params.tab === 'log' ? 'log' : 'coaches'
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: coaches } = await supabase
    .from('coaches')
    .select('*')
    .order('name_ar')

  const activeCount   = coaches?.filter((c: any) => c.is_active).length || 0
  const inactiveCount = (coaches?.length || 0) - activeCount

  const { data: attendance } = await supabase
    .from('coach_attendance')
    .select('coach_id, hours_worked, location_status')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)
    .not('hours_worked', 'is', null)

  const coachStats: Record<string, { hours: number; flagged: number }> = {}
  attendance?.forEach(a => {
    if (!coachStats[a.coach_id]) coachStats[a.coach_id] = { hours: 0, flagged: 0 }
    coachStats[a.coach_id].hours += a.hours_worked || 0
    if (a.location_status === 'invalid') coachStats[a.coach_id].flagged++
  })

  const { data: monthLog } = await supabase
    .from('coach_attendance')
    .select('*, coach:coaches(name_ar, name_en), session:sessions(*, class:classes(name))')
    .gte('check_in_time', `${monthStart}T00:00:00`)
    .lte('check_in_time', `${monthEnd}T23:59:59`)
    .order('check_in_time', { ascending: false })

  const L = isRtl ? {
    title: 'المدربات',
    sub: `${activeCount} نشط • ${inactiveCount} غير نشط`,
    add: 'إضافة مدربة',
    tabCoaches: 'المدربات',
    tabLog: 'سجل الشهر',
    hoursMonth: 'ساعات الشهر',
    payroll: 'الراتب المتوقع',
    ratePerHour: 'ج.م / ساعة',
    noCoaches: 'لا توجد مدربات',
    col: { coach: 'المدربة', group: 'المجموعة', checkIn: 'تسجيل دخول', checkOut: 'تسجيل خروج', hours: 'الساعات', location: 'الموقع' },
    active: 'جارٍ', inProgress: 'في الحصة',
    locationValid: 'داخل النطاق', locationInvalid: 'خارج النطاق',
    noLog: 'لا توجد سجلات هذا الشهر',
  } : {
    title: 'Coaches',
    sub: `${activeCount} active • ${inactiveCount} inactive`,
    add: 'Add Coach',
    tabCoaches: 'Coaches',
    tabLog: "Month's Log",
    hoursMonth: 'Hours This Month',
    payroll: 'Payroll',
    ratePerHour: 'EGP/hr',
    noCoaches: 'No coaches',
    col: { coach: 'Coach', group: 'Group', checkIn: 'Check In', checkOut: 'Check Out', hours: 'Hours', location: 'Location' },
    active: 'Active', inProgress: 'In Progress',
    locationValid: 'Valid ✓', locationInvalid: 'Invalid ⚠',
    noLog: 'No check-ins this month',
  }

  function fmtTime(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  function fmtDateTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(isRtl ? 'ar-EG' : 'en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header + Tabs */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
            <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{L.title}</h1>
          </div>
          {tab === 'coaches' && (
            <Link href="/dashboard/coaches/new" style={{
              background: '#d4667a', borderRadius: 8, padding: '7px 14px',
              color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              <Plus size={14} />
              {L.add}
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            { key: 'coaches', label: L.tabCoaches, href: '/dashboard/coaches' },
            { key: 'log',     label: L.tabLog,     href: '/dashboard/coaches?tab=log' },
          ].map(t => (
            <Link key={t.key} href={t.href} style={{
              padding: '10px 18px', fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#d4667a' : 'var(--txt2)',
              textDecoration: 'none',
              borderBottom: tab === t.key ? '2px solid #d4667a' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}>
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Coaches Tab ── */}
      {tab === 'coaches' && (
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {coaches?.map((coach: any) => {
              const stats       = coachStats[coach.id] || { hours: 0, flagged: 0 }
              const payroll     = stats.hours * (coach.hourly_rate || 0)
              const displayName = isRtl ? (coach.name_ar || coach.name_en) : (coach.name_en || coach.name_ar)
              const initial     = (displayName || '').charAt(0)
              return (
                <div key={coach.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderTop: '3px solid #4a90d9',
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                      background: '#4a90d918', border: '1px solid #4a90d928',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#4a90d9',
                    }}>
                      {initial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 700 }}>{displayName}</p>
                      <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>
                        {coach.hourly_rate} {L.ratePerHour}
                        {stats.flagged > 0 && (
                          <span style={{ marginInlineStart: 8, color: '#e8960a', fontWeight: 600 }}>⚠ {stats.flagged}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.hoursMonth}</span>
                      <span style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>
                        {stats.hours.toFixed(1)} {isRtl ? 'س' : 'h'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.payroll}</span>
                      <span style={{ color: '#3dab7e', fontSize: 13, fontWeight: 700 }}>
                        {payroll.toFixed(0)} {isRtl ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <CoachCardActions
                      id={coach.id}
                      displayName={displayName || coach.id}
                      isActive={coach.is_active}
                      isRtl={isRtl}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {(!coaches || coaches.length === 0) && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--txt2)', fontSize: 13 }}>{L.noCoaches}</div>
          )}
        </div>
      )}

      {/* ── Today's Log Tab ── */}
      {tab === 'log' && (
        <div style={{ padding: '24px 28px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                  {[L.col.coach, L.col.group, L.col.checkIn, L.col.checkOut, L.col.hours, L.col.location].map(col => (
                    <th key={col} style={{
                      textAlign: isRtl ? 'right' : 'left', color: 'var(--txt2)',
                      fontSize: 11, fontWeight: 600, padding: '10px 14px', whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthLog?.map((log: any) => {
                  const checkInStr  = fmtDateTime(log.check_in_time)
                  const checkOutStr = fmtTime(log.check_out_time)
                  const coachName   = isRtl ? (log.coach?.name_ar || log.coach?.name_en) : (log.coach?.name_en || log.coach?.name_ar)
                  const groupName   = log.session?.class?.name || '—'
                  const isValid     = log.location_status === 'valid'
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                            background: '#4a90d918', border: '1px solid #4a90d928',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: '#4a90d9',
                          }}>
                            {(coachName || '').charAt(0)}
                          </div>
                          <span style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{coachName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--txt2)', fontSize: 12 }}>{groupName}</td>
                      <td style={{ padding: '11px 14px', color: 'var(--txt1)', fontSize: 12, fontWeight: 500 }}>{checkInStr || '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12 }}>
                        {checkOutStr ? (
                          <span style={{ color: 'var(--txt1)', fontWeight: 500 }}>{checkOutStr}</span>
                        ) : (
                          <span style={{
                            background: '#3dab7e18', color: '#3dab7e',
                            border: '1px solid #3dab7e28',
                            borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                          }}>{L.active}</span>
                        )}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12 }}>
                        {log.hours_worked != null ? (
                          <span style={{ color: 'var(--txt1)', fontWeight: 600 }}>
                            {Number(log.hours_worked).toFixed(1)} {isRtl ? 'س' : 'h'}
                          </span>
                        ) : (
                          <span style={{
                            background: '#e8960a18', color: '#e8960a',
                            border: '1px solid #e8960a28',
                            borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                          }}>{L.inProgress}</span>
                        )}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          background: isValid ? '#3dab7e18' : '#e0404018',
                          color: isValid ? '#3dab7e' : '#e04040',
                          border: `1px solid ${isValid ? '#3dab7e28' : '#e0404028'}`,
                          borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                        }}>
                          {isValid ? L.locationValid : L.locationInvalid}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(!monthLog || monthLog.length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txt2)', fontSize: 13 }}>
                {L.noLog}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
