// Shared helpers for the admin/staff clock-in system.
// Times are evaluated in the academy's time zone (Cairo).

export const TZ = 'Africa/Cairo'

/** A session with no heartbeat for this long counts as clocked out at its last_seen. */
export const STALE_MS = 10 * 60 * 1000

/** How often an open dashboard reports that the person is still there. */
export const PING_MS = 2 * 60 * 1000

/** Clocking in up to this many minutes after shift start still counts as on time. */
export const GRACE_MIN = 15

/** Days in display order (Egyptian week starts on Saturday). 0 = Sunday … 6 = Saturday. */
export const WEEK_DAYS = [
  { d: 6, en: 'Sat', ar: 'السبت' },
  { d: 0, en: 'Sun', ar: 'الأحد' },
  { d: 1, en: 'Mon', ar: 'الإثنين' },
  { d: 2, en: 'Tue', ar: 'الثلاثاء' },
  { d: 3, en: 'Wed', ar: 'الأربعاء' },
  { d: 4, en: 'Thu', ar: 'الخميس' },
  { d: 5, en: 'Fri', ar: 'الجمعة' },
]

export const DEFAULT_WORK_DAYS = [0, 1, 2, 3, 4, 6]

export type ClockSession = {
  login_time: string
  logout_time: string | null
  last_seen: string | null
}

/** Today's date in Cairo as 'YYYY-MM-DD'. */
export function cairoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

/** Cairo's offset from UTC in minutes at the given instant. */
function cairoOffsetMin(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at).map(x => [x.type, x.value]),
  )
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return Math.round((asUtc - at.getTime()) / 60000)
}

/** The instant of a Cairo wall-clock time ('HH:MM[:SS]', default midnight) on a 'YYYY-MM-DD' date. */
export function cairoInstant(date: string, time = '00:00'): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  return new Date(guess.getTime() - cairoOffsetMin(guess) * 60000)
}

/** [start, end) of a Cairo calendar day as Date instants. */
export function cairoDayRange(date: string): [Date, Date] {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  return [cairoInstant(date), cairoInstant(next)]
}

/** Day of week (0 = Sunday) of a 'YYYY-MM-DD' date. */
export function weekDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Whether a session with no clock-out is still live (heartbeat seen recently). */
export function isLive(s: ClockSession, now = Date.now()): boolean {
  if (s.logout_time) return false
  const seen = new Date(s.last_seen ?? s.login_time).getTime()
  return now - seen <= STALE_MS
}

/** When the session ended (or 'now' if it is still live). */
export function sessionEnd(s: ClockSession, now = Date.now()): number {
  if (s.logout_time) return new Date(s.logout_time).getTime()
  if (isLive(s, now)) return now
  return new Date(s.last_seen ?? s.login_time).getTime()
}

export function hoursBetween(startMs: number, endMs: number): number {
  return Math.max(0, Math.round(((endMs - startMs) / 3600000) * 100) / 100)
}

/** '7h 05m' style duration. */
export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** 'HH:MM' in Cairo time. */
export function fmtCairoTime(at: string | number | Date): string {
  return new Date(at).toLocaleTimeString('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
