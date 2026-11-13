// Staff & coaches attendance: who is in today, and the month's check-in log.
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import StaffToday from './StaffToday'
import CoachToday from './CoachToday'
import ClockLog, { type ClockEntry } from '@/components/ClockLog'
import { cairoDateOf, cairoMonthRange, cairoToday, isLive, sessionEnd, type ClockSession } from '@/lib/staffClock'

type StaffName = { name?: string | null; name_en?: string | null }
type StaffLogRow = ClockSession & {
  id: string; staff_id: string; hours_on_shift: number | null
  location_status: string | null; login_distance_m: number | null; notes: string | null; login_device: string | null
  staff: (StaffName & { role?: string | null }) | null
}

type CoachName = { name_ar?: string | null; name_en?: string | null }
type CoachLogRow = {
  id: string; coach_id: string; check_in_time: string; check_out_time: string | null; hours_worked: number | null
  location_status: string | null; check_in_distance_m: number | null; notes: string | null; check_in_device: string | null
  coach: CoachName | null
  session: { class: { name: string | null } | null } | null
}

const ROLE_LABEL: Record<string, { en: string; ar: string }> = {
  super_admin: { en: 'Super Admin', ar: 'مشرف عام' },
  admin:       { en: 'Admin',       ar: 'مدير' },
  staff:       { en: 'Staff',       ar: 'موظف' },
}

/** Staff log rows → ClockLog entries (admins and staff only; super admins don't clock in). */
function staffEntries(rows: StaffLogRow[], nameOf: (s: StaffName | null) => string, isRtl: boolean, now = Date.now()): ClockEntry[] {
  return rows
    .filter(log => log.staff?.role !== 'super_admin')
    .map(log => {
      const live = isLive(log, now)
      const end  = sessionEnd(log, now)
      const role = ROLE_LABEL[log.staff?.role ?? '']
      return {
        id: log.id, personId: log.staff_id, name: nameOf(log.staff), sub: role ? (isRtl ? role.ar : role.en) : null,
        inAt: log.login_time,
        outAt: live ? null : end,
        state: live ? 'live' : 'done',
        ms: log.hours_on_shift != null && !live ? Number(log.hours_on_shift) * 3600000 : end - new Date(log.login_time).getTime(),
        location: log.location_status, distance: log.login_distance_m, note: log.notes, device: log.login_device,
      }
    })
}

/** Coach log rows → ClockLog entries. */
function coachEntries(rows: CoachLogRow[], nameOf: (c: CoachName | null) => string, today: string, now = Date.now()): ClockEntry[] {
  return rows.map(log => {
    const inMs  = new Date(log.check_in_time).getTime()
    const outMs = log.check_out_time ? new Date(log.check_out_time).getTime() : null
    // No check-out yet: still in class if it's today, otherwise she forgot to check out
    const state = outMs != null ? 'done' : cairoDateOf(log.check_in_time) === today ? 'live' : 'open'
    const ms = log.hours_worked != null ? Number(log.hours_worked) * 3600000
      : outMs != null ? outMs - inMs : state === 'live' ? now - inMs : null
    return {
      id: log.id, personId: log.coach_id, name: nameOf(log.coach),
      sub: log.session?.class?.name ?? null,
      inAt: log.check_in_time, outAt: outMs, state, ms,
      location: log.location_status, distance: log.check_in_distance_m, note: log.notes, device: log.check_in_device,
    }
  })
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; tab?: string; date?: string; month?: string; person?: string }>
}) {
  const params   = await searchParams
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  // Staff "Today" (shift presence) is for super admins only
  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewer } = user?.email
    ? await supabase.from('staff').select('role').ilike('email', user.email.trim().replace(/[\\%_]/g, '\\$&')).maybeSingle()
    : { data: null }
  const canSeeStaffToday = viewer?.role === 'super_admin'

  const who = params.who === 'coaches' ? 'coaches' : 'staff'
  const todayAllowed = who === 'coaches' || canSeeStaffToday
  const tab = params.tab === 'log' || !todayAllowed ? 'log' : 'today'

  const today     = cairoToday()
  const todayDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today ? params.date : today
  const thisMonth = today.slice(0, 7)
  const logMonth  = params.month && /^\d{4}-\d{2}$/.test(params.month) && params.month <= thisMonth ? params.month : thisMonth
  const logPerson = params.person && /^[0-9a-f-]{36}$/i.test(params.person) ? params.person : ''

  const L = isRtl ? {
    title: 'الحضور',
    sub: 'حضور وانصراف الموظفين والمدربات',
    staff: 'الموظفون', coaches: 'المدربات',
    tabToday: 'الحضور اليوم', tabLog: 'سجل الشهر',
    stillHere: 'موجود الآن', inClassNow: 'في الحصة الآن',
  } : {
    title: 'Attendance',
    sub: 'Staff & coaches check-in / check-out',
    staff: 'Staff', coaches: 'Coaches',
    tabToday: 'Today', tabLog: "Month's Log",
    stillHere: 'Still here', inClassNow: 'In class now',
  }

  // ── Month's log ──
  let logEntries: ClockEntry[] = []
  let logPeople: [string, string][] = []
  if (tab === 'log') {
    if (who === 'staff') {
      const nameOf = (s: StaffName | null | undefined) =>
        (isRtl ? (s?.name || s?.name_en) : (s?.name_en || s?.name)) || '—'
      const { data: staff } = await supabase.from('staff').select('id, name, name_en, role').in('role', ['admin', 'staff']).order('name')
      logPeople = (staff ?? []).map(m => [m.id, nameOf(m)])
      const [mStart, mEnd] = cairoMonthRange(logMonth)
      let q = supabase
        .from('staff_attendance')
        .select('*, staff:staff(name, name_en, role)')
        .gte('login_time', mStart.toISOString())
        .lt('login_time', mEnd.toISOString())
        .order('login_time', { ascending: false })
      if (logPerson) q = q.eq('staff_id', logPerson)
      const { data } = await q
      logEntries = staffEntries((data ?? []) as StaffLogRow[], nameOf, isRtl)
    } else {
      const nameOf = (c: CoachName | null | undefined) =>
        (isRtl ? (c?.name_ar || c?.name_en) : (c?.name_en || c?.name_ar)) || '—'
      const { data: coaches } = await supabase.from('coaches').select('id, name_ar, name_en').order('name_ar')
      logPeople = (coaches ?? []).map(c => [c.id, nameOf(c)])
      const [mStart, mEnd] = cairoMonthRange(logMonth)
      let q = supabase
        .from('coach_attendance')
        .select('*, coach:coaches(name_ar, name_en), session:sessions(class:classes(name))')
        .gte('check_in_time', mStart.toISOString())
        .lt('check_in_time', mEnd.toISOString())
        .order('check_in_time', { ascending: false })
      if (logPerson) q = q.eq('coach_id', logPerson)
      const { data } = await q
      logEntries = coachEntries((data ?? []) as CoachLogRow[], nameOf, today)
    }
  }

  const href = (w: string, t: string) => `/dashboard/attendance?who=${w}&tab=${t}`

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header + Staff/Coaches switch + Tabs */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
            <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{L.title}</h1>
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {(['staff', 'coaches'] as const).map(w => (
              <Link key={w} href={href(w, tab === 'today' && (w === 'coaches' || canSeeStaffToday) ? 'today' : 'log')} style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                background: who === w ? '#d4667a' : 'transparent',
                color: who === w ? '#fff' : 'var(--txt2)',
              }}>
                {w === 'staff' ? L.staff : L.coaches}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            ...(todayAllowed ? [{ key: 'today', label: L.tabToday }] : []),
            { key: 'log', label: L.tabLog },
          ].map(t => (
            <Link key={t.key} href={href(who, t.key)} style={{
              padding: '10px 18px', fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#d4667a' : 'var(--txt2)',
              textDecoration: 'none',
              borderBottom: tab === t.key ? '2px solid #d4667a' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}>
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {tab === 'today' && who === 'staff'   && <StaffToday date={todayDate} isRtl={isRtl} />}
      {tab === 'today' && who === 'coaches' && <CoachToday isRtl={isRtl} />}

      {tab === 'log' && (
        <ClockLog
          entries={logEntries}
          people={logPeople}
          month={logMonth}
          person={logPerson}
          basePath="/dashboard/attendance"
          query={{ who }}
          isRtl={isRtl}
          liveLabel={who === 'staff' ? L.stillHere : L.inClassNow}
        />
      )}
    </div>
  )
}
