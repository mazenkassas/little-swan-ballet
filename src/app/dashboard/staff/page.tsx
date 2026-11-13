import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import StaffCardActions from './StaffCardActions'
import TodayPresence from './TodayPresence'
import ClockLog, { type ClockEntry } from '@/components/ClockLog'
import { cairoMonthRange, cairoToday, fmtDuration, isLive, sessionEnd, type ClockSession } from '@/lib/staffClock'

type StaffName = { name?: string | null; name_en?: string | null }
type StaffLogRow = ClockSession & {
  id: string; staff_id: string; hours_on_shift: number | null
  location_status: string | null; login_distance_m: number | null; notes: string | null; login_device: string | null
  staff: (StaffName & { role?: string | null }) | null
}

/** Month's log rows → ClockLog entries (admins and staff only; super admins don't clock in). */
function toLogEntries(
  rows: StaffLogRow[],
  nameOf: (s: StaffName | null) => string,
  roleOf: (role: string | null | undefined) => string | null,
  now = Date.now(),
): ClockEntry[] {
  return rows
    .filter(log => log.staff?.role !== 'super_admin')
    .map(log => {
      const live = isLive(log, now)
      const end  = sessionEnd(log, now)
      return {
        id: log.id, personId: log.staff_id, name: nameOf(log.staff), sub: roleOf(log.staff?.role),
        inAt: log.login_time,
        outAt: live ? null : end,
        state: live ? 'live' : 'done',
        ms: log.hours_on_shift != null && !live ? Number(log.hours_on_shift) * 3600000 : end - new Date(log.login_time).getTime(),
        location: log.location_status, distance: log.login_distance_m, note: log.notes, device: log.login_device,
      }
    })
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; month?: string; person?: string }>
}) {
  const params   = await searchParams
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  // The Today (clock-in) tab is for super admins only
  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewer } = user?.email
    ? await supabase.from('staff').select('role').ilike('email', user.email.trim().replace(/[\\%_]/g, '\\$&')).maybeSingle()
    : { data: null }
  const canSeeToday = viewer?.role === 'super_admin'
  const tab = params.tab === 'log' ? 'log' : params.tab === 'today' && canSeeToday ? 'today' : 'staff'
  const todayDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : cairoToday()
  const thisMonth = cairoToday().slice(0, 7)
  const logMonth  = params.month && /^\d{4}-\d{2}$/.test(params.month) && params.month <= thisMonth ? params.month : thisMonth
  const logPerson = params.person && /^[0-9a-f-]{36}$/i.test(params.person) ? params.person : ''
  const [curStart, curEnd] = cairoMonthRange(thisMonth)

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
    tabStaff: 'الموظفون',
    tabLog: 'سجل الشهر',
    tabToday: 'الحضور اليوم',
    hoursMonth: 'ساعات الشهر',
    noStaff: 'لا يوجد موظفون',
    stillHere: 'موجود الآن',
  } : {
    title: 'Staff',
    sub: `${activeCount} active • ${inactiveCount} inactive`,
    add: 'Add Staff',
    tabStaff: 'Staff',
    tabLog: "Month's Log",
    tabToday: 'Today',
    hoursMonth: 'Hours This Month',
    noStaff: 'No staff members',
    stillHere: 'Still here',
  }

  // ── Month's log (admins and staff only; super admins don't clock in) ──
  const nameOf = (s: StaffName | null | undefined) =>
    (isRtl ? (s?.name || s?.name_en) : (s?.name_en || s?.name)) || '—'
  const logPeople: [string, string][] = ((staff ?? []) as (StaffName & { id: string; role: string })[])
    .filter(m => m.role === 'admin' || m.role === 'staff')
    .map(m => [m.id, nameOf(m)])
  let logEntries: ClockEntry[] = []
  if (tab === 'log') {
    const [mStart, mEnd] = cairoMonthRange(logMonth)
    let q = supabase
      .from('staff_attendance')
      .select('*, staff:staff(name, name_en, role)')
      .gte('login_time', mStart.toISOString())
      .lt('login_time', mEnd.toISOString())
      .order('login_time', { ascending: false })
    if (logPerson) q = q.eq('staff_id', logPerson)
    const { data: monthLog } = await q
    logEntries = toLogEntries((monthLog ?? []) as StaffLogRow[], nameOf, role => {
      const r = ROLE_LABEL[role ?? '']
      return r ? (isRtl ? r.ar : r.en) : null
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
            ...(canSeeToday ? [{ key: 'today', label: L.tabToday, href: '/dashboard/staff?tab=today' }] : []),
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
      )}

      {/* ── Today (clock-in presence) Tab ── */}
      {tab === 'today' && <TodayPresence date={todayDate} isRtl={isRtl} />}

      {/* ── Month's Log Tab ── */}
      {tab === 'log' && (
        <ClockLog
          entries={logEntries}
          people={logPeople}
          month={logMonth}
          person={logPerson}
          basePath="/dashboard/staff"
          isRtl={isRtl}
          liveLabel={L.stillHere}
        />
      )}
    </div>
  )
}
