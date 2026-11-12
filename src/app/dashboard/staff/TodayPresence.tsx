// Super-admin view: who is present today and whether they are within their working hours.
import { createAdminClient } from '@/lib/supabase/admin'
import { DeviceBadge, LocationBadge } from '@/components/PresenceBadges'
import {
  GRACE_MIN, cairoDayRange, cairoInstant, cairoToday, fmtCairoTime, fmtDuration,
  isLive, sessionEnd, weekDay, type ClockSession,
} from '@/lib/staffClock'

type Badge = { label: string; color: string }

const C = { green: '#3dab7e', orange: '#e8960a', red: '#e04040', grey: '#8a8a9a', purple: '#7c5cdb' }

export default async function TodayPresence({ date, isRtl }: { date: string; isRtl: boolean }) {
  const admin = createAdminClient()
  const [dayStart, dayEnd] = cairoDayRange(date)
  const now = Date.now()
  const today = cairoToday()
  const isToday = date === today

  const [{ data: staff }, { data: sessions }] = await Promise.all([
    admin.from('staff')
      .select('id, name, name_en, role, shift_start, shift_end, work_days')
      .in('role', ['admin', 'staff'])
      .eq('is_active', true)
      .order('name'),
    admin.from('staff_attendance')
      .select('staff_id, login_time, logout_time, last_seen, location_status, login_distance_m, login_device, notes')
      .gte('login_time', dayStart.toISOString())
      .lt('login_time', dayEnd.toISOString())
      .order('login_time'),
  ])

  const L = isRtl ? {
    present: 'حاضر', late: 'متأخر', absent: 'غائب', online: 'متصل الآن',
    col: { staff: 'الموظف', shift: 'الدوام', in: 'دخول', out: 'خروج', time: 'مدة التواجد', location: 'الموقع', device: 'الجهاز', status: 'الحالة' },
    onTime: 'في الموعد', lateBy: (m: number) => `متأخر ${m} د`, leftEarly: (m: number) => `خرج مبكرًا ${m} د`,
    absentS: 'غائب', dayOff: 'إجازة', notYet: 'لم يبدأ بعد', extra: 'يوم إضافي', noShift: 'لا يوجد دوام',
    onlineNow: 'متصل الآن', sessions: (n: number) => `${n} جلسات`, go: 'عرض',
    empty: 'لا يوجد مديرون أو موظفون نشطون', role: { admin: 'مدير', staff: 'موظف' } as Record<string, string>,
  } : {
    present: 'Present', late: 'Late', absent: 'Absent', online: 'Online now',
    col: { staff: 'Staff', shift: 'Shift', in: 'Clock In', out: 'Clock Out', time: 'Online Time', location: 'Location', device: 'Device', status: 'Status' },
    onTime: 'On time', lateBy: (m: number) => `Late ${m}m`, leftEarly: (m: number) => `Left early ${m}m`,
    absentS: 'Absent', dayOff: 'Day off', notYet: 'Not yet', extra: 'Extra day', noShift: 'No shift set',
    onlineNow: 'Online now', sessions: (n: number) => `${n} sessions`, go: 'Show',
    empty: 'No active admins or staff', role: { admin: 'Admin', staff: 'Staff' } as Record<string, string>,
  }

  type Row = ClockSession & {
    location_status: string | null; login_distance_m: number | null; login_device: string | null; notes: string | null
  }
  const byStaff: Record<string, Row[]> = {}
  sessions?.forEach(s => { (byStaff[s.staff_id] ||= []).push(s) })

  const dow = weekDay(date)
  let present = 0, late = 0, absent = 0, online = 0

  const rows = (staff ?? []).map(m => {
    const list = byStaff[m.id] ?? []
    const hasShift = !!(m.shift_start && m.shift_end)
    const workDay = (m.work_days ?? [0, 1, 2, 3, 4, 6]).includes(dow)
    const shiftStart = hasShift ? cairoInstant(date, m.shift_start).getTime() : null
    const shiftEnd = hasShift ? cairoInstant(date, m.shift_end).getTime() : null
    const badges: Badge[] = []

    if (list.length === 0) {
      if (!workDay) badges.push({ label: L.dayOff, color: C.grey })
      else if (date > today || (isToday && shiftStart != null && now < shiftStart + GRACE_MIN * 60000))
        badges.push({ label: L.notYet, color: C.grey })
      else { badges.push({ label: L.absentS, color: C.red }); absent++ }
      return { m, list, hasShift, badges, firstIn: null, lastOut: null, live: false, total: 0 }
    }

    present++
    const firstIn = new Date(list[0].login_time).getTime()
    const live = list.some(s => isLive(s, now))
    const lastOut = Math.max(...list.map(s => sessionEnd(s, now)))
    const total = list.reduce((sum, s) => sum + (sessionEnd(s, now) - new Date(s.login_time).getTime()), 0)

    if (live) { badges.push({ label: L.onlineNow, color: C.green }); online++ }
    if (!workDay) badges.push({ label: L.extra, color: C.purple })
    else if (shiftStart != null && shiftEnd != null) {
      const lateMin = Math.round((firstIn - shiftStart) / 60000)
      if (lateMin > GRACE_MIN) { badges.push({ label: L.lateBy(lateMin), color: C.orange }); late++ }
      else badges.push({ label: L.onTime, color: C.green })
      if (!live && lastOut < shiftEnd) {
        badges.push({ label: L.leftEarly(Math.round((shiftEnd - lastOut) / 60000)), color: C.orange })
      }
    } else badges.push({ label: L.noShift, color: C.grey })

    return { m, list, hasShift, badges, firstIn, lastOut, live, total }
  })

  const card = (label: string, value: number, color: string) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11, fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', color, fontSize: 22, fontWeight: 700 }}>{value}</p>
    </div>
  )

  const pill = (b: Badge) => (
    <span key={b.label} style={{
      background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}28`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{b.label}</span>
  )

  const th: React.CSSProperties = {
    textAlign: isRtl ? 'right' : 'left', color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
    padding: '10px 14px', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = { padding: '11px 14px', fontSize: 12, color: 'var(--txt1)' }

  return (
    <div style={{ padding: '24px 28px' }}>
      <form style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input type="hidden" name="tab" value="today" />
        <input type="date" name="date" defaultValue={date} max={today} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 12px', fontSize: 13, color: 'var(--txt1)', colorScheme: 'light dark',
        }} />
        <button type="submit" style={{
          background: '#d4667a', border: 'none', borderRadius: 8, padding: '7px 16px',
          color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>{L.go}</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {card(L.present, present, C.green)}
        {card(L.late, late, C.orange)}
        {card(L.absent, absent, C.red)}
        {isToday && card(L.online, online, C.purple)}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
              {[L.col.staff, L.col.shift, L.col.in, L.col.out, L.col.time, L.col.location, L.col.device, L.col.status].map(c => <th key={c} style={th}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, list, hasShift, badges, firstIn, lastOut, live, total }) => {
              const name = isRtl ? (m.name || m.name_en) : (m.name_en || m.name)
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={td}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{name}</p>
                    <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{L.role[m.role] ?? m.role}</p>
                  </td>
                  <td style={{ ...td, color: 'var(--txt2)' }} dir="ltr">
                    {hasShift ? `${m.shift_start!.slice(0, 5)} – ${m.shift_end!.slice(0, 5)}` : '—'}
                  </td>
                  <td style={td} dir="ltr">{firstIn ? fmtCairoTime(firstIn) : '—'}</td>
                  <td style={td} dir="ltr">{live ? '—' : lastOut ? fmtCairoTime(lastOut) : '—'}</td>
                  <td style={td}>
                    <span dir="ltr" style={{ fontWeight: 600 }}>{list.length ? fmtDuration(total) : '—'}</span>
                    {list.length > 1 && <span style={{ color: 'var(--txt2)', fontSize: 11, marginInlineStart: 6 }}>({L.sessions(list.length)})</span>}
                  </td>
                  <td style={td}>
                    {list.length === 0 ? '—' : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {list.map((s, i) => (
                          <LocationBadge key={i} status={s.location_status} distance={s.login_distance_m}
                            note={s.notes} live={isLive(s, now)} isRtl={isRtl} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    {list.length === 0 ? '—' : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {list.map((s, i) => <DeviceBadge key={i} device={s.login_device} isRtl={isRtl} />)}
                      </div>
                    )}
                  </td>
                  <td style={td}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{badges.map(pill)}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txt2)', fontSize: 13 }}>{L.empty}</div>
        )}
      </div>
    </div>
  )
}
