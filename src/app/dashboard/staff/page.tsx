import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import StaffCardActions from './StaffCardActions'
import { cairoMonthRange, cairoToday, fmtDuration } from '@/lib/staffClock'

export default async function StaffPage() {
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()
  const [curStart, curEnd] = cairoMonthRange(cairoToday().slice(0, 7))

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .order('name')

  const activeCount   = staff?.filter((m: any) => m.is_active).length || 0
  const inactiveCount = (staff?.length || 0) - activeCount

  const { data: allAttendance } = await supabase
    .from('staff_attendance')
    .select('staff_id, hours_on_shift, location_status')
    .gte('login_time', curStart.toISOString())
    .lt('login_time', curEnd.toISOString())
    .not('hours_on_shift', 'is', null)

  const staffStats: Record<string, { hours: number; flagged: number }> = {}
  allAttendance?.forEach(a => {
    if (!staffStats[a.staff_id]) staffStats[a.staff_id] = { hours: 0, flagged: 0 }
    staffStats[a.staff_id].hours += a.hours_on_shift || 0
    if (a.location_status === 'invalid' || a.location_status === 'denied') staffStats[a.staff_id].flagged++
  })


  const ROLE_LABEL: Record<string, { en: string; ar: string }> = {
    super_admin: { en: 'Super Admin', ar: 'مشرف عام' },
    admin:       { en: 'Admin',       ar: 'مدير' },
    staff:       { en: 'Staff',       ar: 'موظف' },
  }

  const L = isRtl ? {
    title: 'الموظفون',
    sub: `${activeCount} نشط • ${inactiveCount} غير نشط`,
    add: 'إضافة موظف',
    hoursMonth: 'ساعات الشهر',
    noStaff: 'لا يوجد موظفون',
  } : {
    title: 'Staff',
    sub: `${activeCount} active • ${inactiveCount} inactive`,
    add: 'Add Staff',
    hoursMonth: 'Hours This Month',
    noStaff: 'No staff members',
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
            <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{L.title}</h1>
          </div>
          <Link href="/dashboard/staff/new" style={{
            background: '#d4667a', borderRadius: 8, padding: '7px 14px',
            color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            <Plus size={14} />
            {L.add}
          </Link>
        </div>
      </div>

      {/* ── Staff cards ── */}
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
                        <span style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{fmtDuration(stats.hours * 3600000, isRtl)}</span>
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
    </div>
  )
}
