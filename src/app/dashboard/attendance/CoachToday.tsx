// Today's coach presence: each coach's classes for the day, check-in / check-out, and whether she was on time.
// Coaches have no fixed shift, so "on time" is measured against the start of her first class that day.
import { createClient } from '@/lib/supabase/server'
import { DeviceBadge, LocationBadge } from '@/components/PresenceBadges'
import { GRACE_MIN, cairoDayRange, cairoInstant, cairoToday, fmtCairoTime, fmtClock, fmtDuration } from '@/lib/staffClock'
import { onlyRealSessions } from '@/lib/sessionFilter'

type Badge = { label: string; color: string }
type Slot = { label: string; start: string | null; end: string | null; kind: 'class' | 'private' }

const C = { green: '#3dab7e', orange: '#e8960a', red: '#e04040', grey: '#8a8a9a', purple: '#7c5cdb', blue: '#4a90d9' }
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

export default async function CoachToday({ isRtl }: { isRtl: boolean }) {
  const supabase = await createClient()
  // Today only (Cairo time)
  const today = cairoToday()
  const date = today
  const [dayStart, dayEnd] = cairoDayRange(date)
  const now = Date.now()
  const isToday = true

  const [{ data: coaches }, { data: sessions }, { data: privates }, { data: checkins }] = await Promise.all([
    supabase.from('coaches').select('id, name_ar, name_en').eq('is_active', true).order('name_ar'),
    supabase.from('sessions')
      .select('id, status, coach_id, class:classes(name, start_time, end_time, default_coach_id, is_active, days_of_week)')
      .eq('date', date),
    supabase.from('private_sessions').select('coach_id, start_time, end_time').eq('date', date),
    supabase.from('coach_attendance')
      .select('coach_id, check_in_time, check_out_time, hours_worked, location_status, check_in_distance_m, check_in_device, notes')
      .gte('check_in_time', dayStart.toISOString())
      .lt('check_in_time', dayEnd.toISOString())
      .order('check_in_time'),
  ])

  const L = isRtl ? {
    present: 'حاضرة', late: 'متأخرة', absent: 'غائبة', inClass: 'في الحصة الآن',
    col: { coach: 'المدربة', classes: 'حصص اليوم', inOut: 'دخول ← خروج', time: 'الساعات', from: 'مكان التسجيل', status: 'الحالة' },
    now: 'الآن',
    onTime: 'في الموعد', lateBy: (m: number) => `متأخرة ${m} د`, absentS: 'غائبة', notYet: 'لم تبدأ بعد',
    noClasses: 'لا توجد حصص', extra: 'بدون حصص مجدولة', inClassNow: 'في الحصة الآن', privateS: 'برايفت',
    checkins: (n: number) => `على ${n} مرات`, today: 'اليوم', empty: 'لا توجد مدربات لديها حصص أو تسجيل حضور اليوم', cancelled: 'ملغاة',
  } : {
    present: 'Present', late: 'Late', absent: 'Absent', inClass: 'In class now',
    col: { coach: 'Coach', classes: "Today's classes", inOut: 'In → Out', time: 'Hours', from: 'Checked in from', status: 'Status' },
    now: 'Now',
    onTime: 'On time', lateBy: (m: number) => `Late ${m}m`, absentS: 'Absent', notYet: 'Not yet',
    noClasses: 'No classes', extra: 'No classes scheduled', inClassNow: 'In class now', privateS: 'Private',
    checkins: (n: number) => `over ${n} check-ins`, today: 'Today', empty: 'No coaches have classes or check-ins today', cancelled: 'cancelled',
  }

  // Each coach's schedule for the day: her classes (session coach, or the class's default coach) and private sessions
  const slots: Record<string, Slot[]> = {}
  for (const s of onlyRealSessions(sessions, date)) {
    const cls = one(s.class)
    const coachId = s.coach_id || cls?.default_coach_id
    if (!coachId || s.status === 'cancelled') continue
    ;(slots[coachId] ||= []).push({ label: cls?.name || '—', start: cls?.start_time ?? null, end: cls?.end_time ?? null, kind: 'class' })
  }
  for (const p of privates ?? []) {
    if (!p.coach_id) continue
    ;(slots[p.coach_id] ||= []).push({ label: L.privateS, start: p.start_time ?? null, end: p.end_time ?? null, kind: 'private' })
  }
  for (const k of Object.keys(slots)) slots[k].sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))

  type Row = NonNullable<typeof checkins>[number]
  const byCoach: Record<string, Row[]> = {}
  checkins?.forEach(c => { (byCoach[c.coach_id] ||= []).push(c) })

  let present = 0, late = 0, absent = 0, inClass = 0

  const rows = (coaches ?? []).map(c => {
    const list = byCoach[c.id] ?? []
    const sched = slots[c.id] ?? []
    const firstStart = sched.find(s => s.start)?.start
    const startMs = firstStart ? cairoInstant(date, firstStart).getTime() : null
    const badges: Badge[] = []

    if (list.length === 0) {
      if (sched.length === 0) badges.push({ label: L.noClasses, color: C.grey })
      else if (date > today || (isToday && startMs != null && now < startMs + GRACE_MIN * 60000))
        badges.push({ label: L.notYet, color: C.grey })
      else { badges.push({ label: L.absentS, color: C.red }); absent++ }
      return { c, list, sched, badges, firstIn: null as number | null, lastOut: null as number | null, open: false, total: 0 }
    }

    present++
    const firstIn = new Date(list[0].check_in_time).getTime()
    const open = isToday && list.some(x => !x.check_out_time)
    const outs = list.filter(x => x.check_out_time).map(x => new Date(x.check_out_time!).getTime())
    const lastOut = outs.length ? Math.max(...outs) : null
    const total = list.reduce((sum, x) => {
      const end = x.check_out_time ? new Date(x.check_out_time).getTime() : (open ? now : new Date(x.check_in_time).getTime())
      return sum + Math.max(0, end - new Date(x.check_in_time).getTime())
    }, 0)

    if (open) { badges.push({ label: L.inClassNow, color: C.green }); inClass++ }
    if (sched.length === 0) badges.push({ label: L.extra, color: C.purple })
    else if (startMs != null) {
      const lateMin = Math.round((firstIn - startMs) / 60000)
      if (lateMin > GRACE_MIN) { badges.push({ label: L.lateBy(lateMin), color: C.orange }); late++ }
      else badges.push({ label: L.onTime, color: C.green })
    }
    return { c, list, sched, badges, firstIn, lastOut, open, total }
  })
    // Only coaches with classes or check-ins today, in order of their first class
    .filter(r => r.sched.length > 0 || r.list.length > 0)
    .sort((a, b) => String(a.sched[0]?.start || '99').localeCompare(String(b.sched[0]?.start || '99')))

  const dateLabel = new Intl.DateTimeFormat(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB', {
    timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())

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
  const td: React.CSSProperties = { padding: '11px 14px', fontSize: 12, color: 'var(--txt1)', verticalAlign: 'top' }

  return (
    <div style={{ padding: '24px 28px' }}>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--txt2)' }}>
        <b style={{ color: 'var(--txt1)' }}>{L.today}</b> · {dateLabel}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {card(L.present, present, C.green)}
        {card(L.late, late, C.orange)}
        {card(L.absent, absent, C.red)}
        {isToday && card(L.inClass, inClass, C.purple)}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
              {[L.col.coach, L.col.classes, L.col.inOut, L.col.time, L.col.from, L.col.status].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, list, sched, badges, firstIn, lastOut, open, total }) => {
              const name = isRtl ? (c.name_ar || c.name_en) : (c.name_en || c.name_ar)
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={td}><p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{name}</p></td>
                  <td style={td}>
                    {sched.length === 0 ? <span style={{ color: 'var(--txt2)' }}>—</span> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {sched.map((s, i) => (
                          <span key={i} style={{
                            fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap',
                            color: s.kind === 'private' ? C.blue : '#c9506a',
                            background: s.kind === 'private' ? '#4a90d912' : '#d4667a12',
                            border: `1px solid ${s.kind === 'private' ? '#4a90d926' : '#d4667a26'}`,
                          }}>
                            {s.label}
                            {s.start && <span style={{ fontWeight: 500, opacity: 0.85 }}> · {fmtClock(s.start, isRtl)}{s.end ? ` – ${fmtClock(s.end, isRtl)}` : ''}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {firstIn ? (
                      <>
                        <b>{fmtCairoTime(firstIn, isRtl)}</b>
                        <span style={{ color: 'var(--txt2)', margin: '0 6px' }}>{isRtl ? '←' : '→'}</span>
                        {open ? <span style={{ color: C.green, fontWeight: 600 }}>{L.now}</span> : <b>{lastOut ? fmtCairoTime(lastOut, isRtl) : '—'}</b>}
                      </>
                    ) : '—'}
                  </td>
                  <td style={td}>
                    <span style={{ fontWeight: 700 }}>{list.length ? fmtDuration(total, isRtl) : '—'}</span>
                    {list.length > 1 && <span style={{ display: 'block', color: 'var(--txt2)', fontSize: 11 }}>{L.checkins(list.length)}</span>}
                  </td>
                  <td style={td}>
                    {list.length === 0 ? '—' : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {list.map((x, i) => (
                          <div key={i} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <LocationBadge status={x.location_status} distance={x.check_in_distance_m}
                              note={x.notes} live={isToday && !x.check_out_time} isRtl={isRtl} />
                            <DeviceBadge device={x.check_in_device} isRtl={isRtl} />
                          </div>
                        ))}
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
