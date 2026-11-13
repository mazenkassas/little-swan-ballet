import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import CoachCardActions from './CoachCardActions'
import CoachTodayPresence from './CoachTodayPresence'
import ClockLog, { type ClockEntry } from '@/components/ClockLog'
import { cairoDateOf, cairoMonthRange, cairoToday, fmtDuration } from '@/lib/staffClock'

type CoachName = { name_ar?: string | null; name_en?: string | null }
type CoachLogRow = {
  id: string; coach_id: string; check_in_time: string; check_out_time: string | null; hours_worked: number | null
  location_status: string | null; check_in_distance_m: number | null; notes: string | null; check_in_device: string | null
  coach: CoachName | null
  session: { class: { name: string | null } | null } | null
}

/** Month's log rows → ClockLog entries. */
function toLogEntries(rows: CoachLogRow[], nameOf: (c: CoachName | null) => string, today: string, now = Date.now()): ClockEntry[] {
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

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string; person?: string }>
}) {
  const params   = await searchParams
  const tab      = params.tab === 'log' ? 'log' : params.tab === 'today' ? 'today' : 'coaches'
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()
  const today     = cairoToday()
  const thisMonth = today.slice(0, 7)
  const logMonth  = params.month && /^\d{4}-\d{2}$/.test(params.month) && params.month <= thisMonth ? params.month : thisMonth
  const logPerson = params.person && /^[0-9a-f-]{36}$/i.test(params.person) ? params.person : ''
  const [curStart, curEnd] = cairoMonthRange(thisMonth)

  const { data: coaches } = await supabase
    .from('coaches')
    .select('*')
    .order('name_ar')

  const activeCount   = coaches?.filter((c: any) => c.is_active).length || 0
  const inactiveCount = (coaches?.length || 0) - activeCount

  const { data: attendance } = await supabase
    .from('coach_attendance')
    .select('coach_id, hours_worked, location_status')
    .gte('check_in_time', curStart.toISOString())
    .lt('check_in_time', curEnd.toISOString())
    .not('hours_worked', 'is', null)

  const coachStats: Record<string, { hours: number; flagged: number }> = {}
  attendance?.forEach(a => {
    if (!coachStats[a.coach_id]) coachStats[a.coach_id] = { hours: 0, flagged: 0 }
    coachStats[a.coach_id].hours += a.hours_worked || 0
    if (a.location_status === 'invalid' || a.location_status === 'denied') coachStats[a.coach_id].flagged++
  })


  const L = isRtl ? {
    title: 'المدربات',
    sub: `${activeCount} نشط • ${inactiveCount} غير نشط`,
    add: 'إضافة مدربة',
    tabCoaches: 'المدربات',
    tabLog: 'سجل الشهر',
    tabToday: 'الحضور اليوم',
    hoursMonth: 'ساعات الشهر',
    payroll: 'الراتب المتوقع',
    ratePerHour: 'ج.م / ساعة',
    noCoaches: 'لا توجد مدربات',
    inClassNow: 'في الحصة الآن',
  } : {
    title: 'Coaches',
    sub: `${activeCount} active • ${inactiveCount} inactive`,
    add: 'Add Coach',
    tabCoaches: 'Coaches',
    tabLog: "Month's Log",
    tabToday: 'Today',
    hoursMonth: 'Hours This Month',
    payroll: 'Payroll',
    ratePerHour: 'EGP/hr',
    noCoaches: 'No coaches',
    inClassNow: 'In class now',
  }

  // ── Month's log ──────────────────────────────────────────────────────
  const nameOf = (c: CoachName | null | undefined) =>
    (isRtl ? (c?.name_ar || c?.name_en) : (c?.name_en || c?.name_ar)) || '—'
  const logPeople: [string, string][] = ((coaches ?? []) as (CoachName & { id: string })[]).map(c => [c.id, nameOf(c)])
  let logEntries: ClockEntry[] = []
  if (tab === 'log') {
    const [mStart, mEnd] = cairoMonthRange(logMonth)
    let q = supabase
      .from('coach_attendance')
      .select('*, coach:coaches(name_ar, name_en), session:sessions(class:classes(name))')
      .gte('check_in_time', mStart.toISOString())
      .lt('check_in_time', mEnd.toISOString())
      .order('check_in_time', { ascending: false })
    if (logPerson) q = q.eq('coach_id', logPerson)
    const { data: monthLog } = await q
    logEntries = toLogEntries((monthLog ?? []) as CoachLogRow[], nameOf, today)
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
            { key: 'today',   label: L.tabToday,   href: '/dashboard/coaches?tab=today' },
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

      {/* ── Today Tab ── */}
      {tab === 'today' && <CoachTodayPresence isRtl={isRtl} />}

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
                        {fmtDuration(stats.hours * 3600000, isRtl)}
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

      {/* ── Month's Log Tab ── */}
      {tab === 'log' && (
        <ClockLog
          entries={logEntries}
          people={logPeople}
          month={logMonth}
          person={logPerson}
          basePath="/dashboard/coaches"
          isRtl={isRtl}
          liveLabel={L.inClassNow}
        />
      )}
    </div>
  )
}
