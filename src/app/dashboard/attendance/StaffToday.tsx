// Super-admin view: the staff who logged in on a day — when they came, when they left, how long, and on time or not.
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LocationBadge } from '@/components/PresenceBadges'
import {
  GRACE_MIN, addDays, cairoDayRange, cairoInstant, cairoToday, fmtCairoDay, fmtCairoTime, fmtDuration,
  isLive, sessionEnd, weekDay, type ClockSession,
} from '@/lib/staffClock'

type Badge = { label: string; color: string }

const C = { green: '#3dab7e', orange: '#e8960a', red: '#e04040', grey: '#8a8a9a', purple: '#7c5cdb' }

export default async function StaffToday({ date, isRtl }: { date: string; isRtl: boolean }) {
  const admin = createAdminClient()
  const [dayStart, dayEnd] = cairoDayRange(date)
  const now = Date.now()
  const today = cairoToday()
  const isToday = date === today

  const [{ data: staff }, { data: sessions }] = await Promise.all([
    admin.from('staff')
      .select('id, name, name_en, role, shift_start, shift_end, work_days')
      .in('role', ['admin', 'staff'])
      .order('name'),
    admin.from('staff_attendance')
      .select('staff_id, login_time, logout_time, last_seen, location_status, login_distance_m, login_device, notes')
      .gte('login_time', dayStart.toISOString())
      .lt('login_time', dayEnd.toISOString())
      .order('login_time'),
  ])

  const L = isRtl ? {
    loggedIn: 'سجّلوا الدخول', here: 'موجودون الآن', late: 'متأخرون',
    col: { staff: 'الموظف', in: 'وقت الدخول', out: 'وقت الخروج', time: 'المدة', place: 'المكان', status: 'الحالة' },
    today: 'اليوم', backToday: 'العودة لليوم', stillHere: 'ما زال موجودًا',
    onTime: 'في الموعد', lateBy: (m: number) => `متأخر ${m} دقيقة`, leftEarly: (m: number) => `خرج مبكرًا ${m} دقيقة`,
    extra: 'يوم إضافي', go: 'عرض', times: (n: number) => `${n} مرات دخول`,
    empty: 'لم يسجّل أي موظف الدخول في هذا اليوم', role: { admin: 'مدير', staff: 'موظف' } as Record<string, string>,
  } : {
    loggedIn: 'Logged in', here: 'Here now', late: 'Late',
    col: { staff: 'Staff', in: 'Logged in', out: 'Logged out', time: 'Time', place: 'Place', status: 'Status' },
    today: 'Today', backToday: 'Back to today', stillHere: 'Still here',
    onTime: 'On time', lateBy: (m: number) => `Late ${m} min`, leftEarly: (m: number) => `Left early ${m} min`,
    extra: 'Extra day', go: 'Show', times: (n: number) => `${n} logins`,
    empty: 'No staff logged in on this day', role: { admin: 'Admin', staff: 'Staff' } as Record<string, string>,
  }

  type Row = ClockSession & {
    location_status: string | null; login_distance_m: number | null; login_device: string | null; notes: string | null
  }
  const byStaff: Record<string, Row[]> = {}
  sessions?.forEach(s => { (byStaff[s.staff_id] ||= []).push(s) })

  const dow = weekDay(date)
  let here = 0, late = 0

  // Only staff who logged in on this day, earliest first
  const rows = (staff ?? [])
    .filter(m => (byStaff[m.id] ?? []).length > 0)
    .map(m => {
      const list = byStaff[m.id]
      const firstIn = new Date(list[0].login_time).getTime()
      const live = list.some(s => isLive(s, now))
      const lastOut = Math.max(...list.map(s => sessionEnd(s, now)))
      const total = list.reduce((sum, s) => sum + (sessionEnd(s, now) - new Date(s.login_time).getTime()), 0)
      const workDay = (m.work_days ?? [0, 1, 2, 3, 4, 6]).includes(dow)
      const shiftStart = m.shift_start ? cairoInstant(date, m.shift_start).getTime() : null
      const shiftEnd = m.shift_end ? cairoInstant(date, m.shift_end).getTime() : null

      const badges: Badge[] = []
      if (!workDay) badges.push({ label: L.extra, color: C.purple })
      else if (shiftStart != null) {
        const lateMin = Math.round((firstIn - shiftStart) / 60000)
        if (lateMin > GRACE_MIN) { badges.push({ label: L.lateBy(lateMin), color: C.orange }); late++ }
        else badges.push({ label: L.onTime, color: C.green })
        if (!live && shiftEnd != null && lastOut < shiftEnd) {
          badges.push({ label: L.leftEarly(Math.round((shiftEnd - lastOut) / 60000)), color: C.orange })
        }
      }
      if (live) here++
      // Where they logged in from: the first login of the day
      const first = list[0]
      return { m, list, badges, firstIn, lastOut, live, total, first }
    })
    .sort((a, b) => a.firstIn - b.firstIn)

  const card = (label: string, value: number, color: string) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 12, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', color, fontSize: 24, fontWeight: 700 }}>{value}</p>
    </div>
  )

  const pill = (b: Badge) => (
    <span key={b.label} style={{
      background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}28`,
      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{b.label}</span>
  )

  const th: React.CSSProperties = {
    textAlign: isRtl ? 'right' : 'left', color: 'var(--txt2)', fontSize: 12, fontWeight: 600,
    padding: '12px 16px', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: 'var(--txt1)', whiteSpace: 'nowrap' }

  const prevDay = addDays(date, -1)
  const nextDay = addDays(date, 1)
  const dayHref = (d: string) => `/dashboard/attendance?who=staff&tab=today${d === today ? '' : `&date=${d}`}`
  const navBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt1)', textDecoration: 'none',
  }
  const Prev = isRtl ? ChevronRight : ChevronLeft
  const Next = isRtl ? ChevronLeft : ChevronRight

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Day picker: ‹ day › */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Link href={dayHref(prevDay)} style={navBtn} aria-label="previous day"><Prev size={16} /></Link>
        <span style={{ minWidth: 190, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>
          {isToday ? `${L.today} · ` : ''}{fmtCairoDay(date, isRtl, true)}
        </span>
        {nextDay <= today
          ? <Link href={dayHref(nextDay)} style={navBtn} aria-label="next day"><Next size={16} /></Link>
          : <span style={{ ...navBtn, opacity: 0.35 }}><Next size={16} /></span>}
        {!isToday && (
          <Link href={dayHref(today)} style={{ fontSize: 12, color: '#d4667a', textDecoration: 'none', fontWeight: 600, marginInlineStart: 4 }}>
            {L.backToday}
          </Link>
        )}
        <form style={{ display: 'flex', gap: 8, marginInlineStart: 'auto' }}>
          <input type="hidden" name="who" value="staff" />
          <input type="hidden" name="tab" value="today" />
          <input type="date" name="date" defaultValue={date} max={today} style={{
            height: 34, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '0 10px', fontSize: 13, color: 'var(--txt1)', colorScheme: 'light dark', fontFamily: 'inherit',
          }} />
          <button type="submit" style={{
            height: 34, background: '#d4667a', border: 'none', borderRadius: 8, padding: '0 16px',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{L.go}</button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {card(L.loggedIn, rows.length, C.green)}
        {isToday && card(L.here, here, C.purple)}
        {card(L.late, late, C.orange)}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--txt2)', fontSize: 14 }}>{L.empty}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                {[L.col.staff, L.col.in, L.col.out, L.col.time, L.col.place, L.col.status].map(c => <th key={c} style={th}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, list, badges, firstIn, lastOut, live, total, first }) => {
                const name = isRtl ? (m.name || m.name_en) : (m.name_en || m.name)
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span title={live ? L.stillHere : ''} style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: live ? C.green : 'var(--border)' }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{name}</p>
                          <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{L.role[m.role] ?? m.role}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{fmtCairoTime(firstIn, isRtl)}</td>
                    <td style={td}>
                      {live
                        ? <span style={{ color: C.green, fontWeight: 700 }}>{L.stillHere}</span>
                        : <b>{fmtCairoTime(lastOut, isRtl)}</b>}
                    </td>
                    <td style={td}>
                      <b>{fmtDuration(total, isRtl)}</b>
                      {list.length > 1 && <span style={{ display: 'block', color: 'var(--txt2)', fontSize: 11 }}>{L.times(list.length)}</span>}
                    </td>
                    <td style={td}>
                      <LocationBadge status={first.location_status} distance={first.login_distance_m}
                        note={first.notes} live={isLive(first, now)} isRtl={isRtl} />
                    </td>
                    <td style={td}>
                      {badges.length ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{badges.map(pill)}</div> : <span style={{ color: 'var(--txt2)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
