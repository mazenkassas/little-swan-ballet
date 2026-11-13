// Month's check-in log for staff and coaches (Attendance page).
// One simple list grouped by day: who · in → out · how long · where from.
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DeviceBadge, LocationBadge } from '@/components/PresenceBadges'
import { addMonths, cairoDateOf, cairoToday, fmtCairoDay, fmtCairoTime, fmtDuration } from '@/lib/staffClock'

export type ClockEntry = {
  id: string
  personId: string
  name: string
  /** Second line under the name: role, group, … */
  sub?: string | null
  inAt: string
  /** Clock-out instant; null while still live or when it was never recorded. */
  outAt: number | null
  /** live = still here now · open = never clocked out · done = finished */
  state: 'live' | 'open' | 'done'
  ms: number | null
  location: string | null
  distance: number | null
  note?: string | null
  device: string | null
}

const C = { green: '#3dab7e', orange: '#e8960a', accent: '#d4667a' }

export default function ClockLog({
  entries, people, month, person, basePath, query = {}, isRtl, liveLabel,
}: {
  entries: ClockEntry[]
  people: [string, string][]
  month: string
  person: string
  basePath: string
  /** Extra query params kept on every link (e.g. who=staff). */
  query?: Record<string, string>
  isRtl: boolean
  liveLabel: string
}) {
  const L = isRtl ? {
    everyone: 'الكل', show: 'عرض', thisMonth: 'هذا الشهر',
    summary: (n: number, t: string) => `${n} تسجيل · ${t} إجمالي`,
    noOut: 'لم يسجّل خروج', empty: 'لا توجد تسجيلات في هذا الشهر', today: 'اليوم',
  } : {
    everyone: 'Everyone', show: 'Show', thisMonth: 'This month',
    summary: (n: number, t: string) => `${n} check-in${n === 1 ? '' : 's'} · ${t} total`,
    noOut: 'No check-out', empty: 'No check-ins this month', today: 'Today',
  }

  const today = cairoToday()
  const thisMonth = today.slice(0, 7)
  const monthLabel = new Intl.DateTimeFormat(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB', {
    timeZone: 'UTC', month: 'long', year: 'numeric',
  }).format(new Date(month + '-15T12:00:00Z'))

  const href = (m: string) => {
    const q = new URLSearchParams({ ...query, tab: 'log' })
    if (m !== thisMonth) q.set('month', m)
    if (person) q.set('person', person)
    return `${basePath}?${q}`
  }

  // Group by Cairo day, newest first (entries arrive newest first)
  const days: { date: string; items: ClockEntry[]; ms: number }[] = []
  for (const e of entries) {
    const d = cairoDateOf(e.inAt)
    let g = days[days.length - 1]
    if (!g || g.date !== d) { g = { date: d, items: [], ms: 0 }; days.push(g) }
    g.items.push(e)
    g.ms += e.ms ?? 0
  }
  const totalMs = entries.reduce((s, e) => s + (e.ms ?? 0), 0)

  const pill = (label: string, color: string) => (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}28`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{label}</span>
  )
  const navBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt1)', textDecoration: 'none',
  }
  const Prev = isRtl ? ChevronRight : ChevronLeft
  const Next = isRtl ? ChevronLeft : ChevronRight

  return (
    <div className="clocklog" style={{ padding: '24px 28px' }}>
      {/* Toolbar: month ‹ › and person filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={href(addMonths(month, -1))} style={navBtn} aria-label="previous month"><Prev size={16} /></Link>
          <span style={{ minWidth: 130, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{monthLabel}</span>
          {month < thisMonth
            ? <Link href={href(addMonths(month, 1))} style={navBtn} aria-label="next month"><Next size={16} /></Link>
            : <span style={{ ...navBtn, opacity: 0.35 }}><Next size={16} /></span>}
          {month !== thisMonth && (
            <Link href={href(thisMonth)} style={{ fontSize: 12, color: C.accent, textDecoration: 'none', fontWeight: 600, marginInlineStart: 4 }}>
              {L.thisMonth}
            </Link>
          )}
        </div>
        <form method="get" action={basePath} style={{ display: 'flex', gap: 8, marginInlineStart: 'auto' }}>
          {Object.entries(query).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input type="hidden" name="tab" value="log" />
          {month !== thisMonth && <input type="hidden" name="month" value={month} />}
          <div style={{ position: 'relative' }}>
            <select name="person" defaultValue={person} className="clocklog-select" aria-label={L.everyone}>
              <option value="">{L.everyone}</option>
              {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <ChevronDown size={14} style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineEnd: 10,
              color: 'var(--txt2)', pointerEvents: 'none',
            }} />
          </div>
          <button type="submit" style={{
            height: 34, background: C.accent, border: 'none', borderRadius: 8, padding: '0 16px',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{L.show}</button>
        </form>
      </div>

      {entries.length > 0 && (
        <p style={{ margin: '0 2px 12px', fontSize: 12, color: 'var(--txt2)' }}>
          {L.summary(entries.length, fmtDuration(totalMs, isRtl))}
        </p>
      )}

      {days.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
          textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13,
        }}>{L.empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {days.map(day => (
            <section key={day.date} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                padding: '10px 16px', background: 'var(--bg-page)', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
                  {day.date === today ? `${L.today} · ` : ''}{fmtCairoDay(day.date, isRtl)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>{fmtDuration(day.ms, isRtl)}</span>
              </div>
              {day.items.map(e => (
                <div key={e.id} className="clocklog-row">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{e.name}</p>
                    {e.sub && <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>{e.sub}</p>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--txt1)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{fmtCairoTime(e.inAt, isRtl)}</span>
                    <span style={{ color: 'var(--txt2)' }}>{isRtl ? '←' : '→'}</span>
                    {e.state === 'live' ? pill(liveLabel, C.green)
                      : e.outAt != null ? <span style={{ fontWeight: 600 }}>{fmtCairoTime(e.outAt, isRtl)}</span>
                      : pill(L.noOut, C.orange)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
                    {e.ms != null ? fmtDuration(e.ms, isRtl) : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <LocationBadge status={e.location} distance={e.distance} note={e.note} live={e.state === 'live'} isRtl={isRtl} />
                    <DeviceBadge device={e.device} isRtl={isRtl} />
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <style>{`
        .clocklog-row {
          display: grid; grid-template-columns: minmax(140px, 1.3fr) minmax(170px, 1.2fr) 90px minmax(180px, 1.4fr);
          gap: 12px; align-items: center; padding: 11px 16px; border-bottom: 1px solid var(--border);
        }
        .clocklog-row:last-child { border-bottom: none; }
        .clocklog-select {
          height: 34px; min-width: 180px; border-radius: 8px; border: 1px solid var(--border);
          background: var(--bg-popup, var(--bg-card)); color: var(--txt1); font-size: 13px; font-weight: 600;
          padding-block: 0; padding-inline: 12px 32px; font-family: inherit; cursor: pointer;
          appearance: none; -webkit-appearance: none; color-scheme: light dark; outline: none;
        }
        .clocklog-select:focus { border-color: ${C.accent}; }
        .clocklog-select option { background: var(--bg-popup, var(--bg-card)); color: var(--txt1); font-weight: 500; }
        @media (max-width: 760px) {
          .clocklog { padding: 16px !important; }
          .clocklog-row { grid-template-columns: 1fr auto; row-gap: 6px; }
        }
      `}</style>
    </div>
  )
}
