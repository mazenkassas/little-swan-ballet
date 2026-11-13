// A session is only real when its group exists, is active and meets on that weekday.
// Old bugs left stray rows (e.g. a Saturday group with a session on Friday); every
// screen that lists sessions filters them out with this, so they never show anywhere.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

type Cls = { is_active?: boolean | null; days_of_week?: string[] | null } | null | undefined

const one = <T,>(v: T | T[] | null | undefined): T | null | undefined => (Array.isArray(v) ? v[0] : v)

/** Weekday name ('friday') of a 'YYYY-MM-DD' date. */
export function weekdayOf(date: string): string {
  return WEEKDAYS[new Date(date.slice(0, 10) + 'T00:00:00Z').getUTCDay()]
}

/** True when the group is active and meets on this date's weekday. */
export function classMeetsOn(cls: Cls | Cls[], date: string): boolean {
  const c = one(cls)
  if (!c || c.is_active === false) return false
  const day = weekdayOf(date)
  return (c.days_of_week || []).some(d => String(d).trim().toLowerCase() === day)
}

/** Keeps only sessions of registered groups on their real days. */
export function onlyRealSessions<T extends { date?: string | null; class?: unknown }>(sessions: T[] | null | undefined, date?: string): T[] {
  return (sessions || []).filter(s => {
    const d = s.date || date
    return !!d && classMeetsOn(s.class as Cls | Cls[], d)
  })
}
