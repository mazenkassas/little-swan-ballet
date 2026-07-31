import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { getLocale } from 'next-intl/server'
import StaffCardActions from './StaffCardActions'

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params   = await searchParams
  const tab      = params.tab === 'log' ? 'log' : 'staff'
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .order('name')

  const activeCount   = staff?.filter((m: any) => m.is_active).length || 0
  const inactiveCount = (staff?.length || 0) - activeCount

  const { data: allAttendance } = await supabase
    .from('staff_attendance')
    .select('staff_id, hours_on_shift, location_status')
    .gte('login_time', `${monthStart}T00:00:00`)
    .lte('login_time', `${monthEnd}T23:59:59`)
    .not('hours_on_shift', 'is', null)

  const staffStats: Record<string, { hours: number; flagged: number }> = {}
  allAttendance?.forEach(a => {
    if (!staffStats[a.staff_id]) staffStats[a.staff_id] = { hours: 0, flagged: 0 }
    staffStats[a.staff_id].hours += a.hours_on_shift || 0
    if (a.location_status === 'invalid') staffStats[a.staff_id].flagged++
  })

  const { data: monthLog } = await supabase
    .from('staff_attendance')
    .select('*, staff:staff(name, name_en, role)')
    .gte('login_time', `${monthStart}T00:00:00`)
    .lte('login_time', `${monthEnd}T23:59:59`)
    .order('login_time', { ascending: false })

  const ROLE_LABEL: Record<string, { en: string; ar: string }> = {
    super_admin: { en: 'Super Admin', ar: 'مشرف عام' },
    admin:       { en: 'Admin',       ar: 'مدير' },
    staff:       { en: 'Staff',       ar: 'موظف' },
  }

  const L = isRtl ? {
    title: 'الموظفون',
    sub: `${activeCount} نشط • ${inactiveCount} غير نشط`,
    add: 'إضافة موظف',
    tabStaff: 'الموظفون',
    tabLog: 'سجل الشهر',
    hoursMonth: 'ساعات الشهر',
    noStaff: 'لا يوجد موظفون',
    col: { staff: 'الموظف', checkIn: 'تسجيل دخول', checkOut: 'تسجيل خروج', hours: 'الساعات', location: 'الموقع' },
    active: 'جارٍ',
    inProgress: 'في الدوام',
    locationValid: 'داخل النطاق', locationInvalid: 'خارج النطاق',
    noLog: 'لا توجد سجلات هذا الشهر',
  } : {
    title: 'Staff',
    sub: `${activeCount} active • ${inactiveCount} inactive`,
    add: 'Add Staff',
    tabStaff: 'Staff',
    tabLog: "Month's Log",
    hoursMonth: 'Hours This Month',
    noStaff: 'No staff members',
    col: { staff: 'Staff', checkIn: 'Check In', checkOut: 'Check Out', hours: 'Hours', location: 'Location' },
    active: 'Active',
    inProgress: 'In Progress',
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
          {tab === 'staff' && (
            <Link href="/dashboard/staff/new" style={{
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
            { key: 'staff', label: L.tabStaff, href: '/dashboard/staff' },
            { key: 'log',   label: L.tabLog,   href: '/dashboard/staff?tab=log' },
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

      {/* ── Staff Tab ── */}
      {tab === 'staff' && (
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {staff?.map((member: any) => {
              const stats        = staffStats[member.id] || { hours: 0, flagged: 0 }
              const displayName  = isRtl ? (member.name || member.name_en) : (member.name_en || member.name)
              const initial      = (displayName || '').charAt(0)
              const role         = ROLE_LABEL[member.role] || { en: member.role, ar: member.role }
              const isSuperAdmin = member.role === 'super_admin'
              return (
                <div key={member.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderTop: '3px solid #7c5cdb',
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                      background: '#7c5cdb18', border: '1px solid #7c5cdb28',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#7c5cdb',
                    }}>
                      {initial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 700 }}>{displayName}</p>
                      <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>
                        {isRtl ? role.ar : role.en}
                        {stats.flagged > 0 && (
                          <span style={{ marginInlineStart: 8, color: '#e8960a', fontWeight: 600 }}>⚠ {stats.flagged}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Hours (not for super_admin) */}
                  {!isSuperAdmin && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.hoursMonth}</span>
                        <span style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{stats.hours.toFixed(1)}h</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <StaffCardActions
                      id={member.id}
                      displayName={displayName || member.id}
                      isActive={member.is_active}
                      isSuperAdmin={isSuperAdmin}
                      isRtl={isRtl}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {(!staff || staff.length === 0) && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--txt2)', fontSize: 13 }}>{L.noStaff}</div>
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
                  {[L.col.staff, L.col.checkIn, L.col.checkOut, L.col.hours, L.col.location].map(col => (
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
                  const checkInStr      = fmtDateTime(log.login_time)
                  const checkOutStr     = fmtTime(log.logout_time)
                  const isLocationValid = log.location_status === 'valid'
                  const role            = ROLE_LABEL[log.staff?.role] || { en: log.staff?.role, ar: log.staff?.role }
                  const displayName     = isRtl ? (log.staff?.name || log.staff?.name_en) : (log.staff?.name_en || log.staff?.name)
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                            background: '#7c5cdb18', border: '1px solid #7c5cdb28',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: '#7c5cdb',
                          }}>
                            {(displayName || '').charAt(0)}
                          </div>
                          <div>
                            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{displayName}</p>
                            <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{isRtl ? role.ar : role.en}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--txt1)', fontSize: 12, fontWeight: 500 }}>{checkInStr}</td>
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
                        {log.hours_on_shift != null ? (
                          <span style={{ color: 'var(--txt1)', fontWeight: 600 }}>{Number(log.hours_on_shift).toFixed(1)}h</span>
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
                          background: isLocationValid ? '#3dab7e18' : '#e0404018',
                          color: isLocationValid ? '#3dab7e' : '#e04040',
                          border: `1px solid ${isLocationValid ? '#3dab7e28' : '#e0404028'}`,
                          borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                        }}>
                          {isLocationValid ? L.locationValid : L.locationInvalid}
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
