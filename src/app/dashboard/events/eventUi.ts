// Shared helpers for the events screens (list + detail).

export const TYPE_COLORS: Record<string, string> = {
  recital: '#d4667a', tv_show: '#4a90d9', workshop: '#8e5fd9', competition: '#e8960a',
  annual_performance: '#d4667a', event: '#3dab7e',
}

export const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  recital:            { en: 'Recital',            ar: 'عرض' },
  tv_show:            { en: 'TV Show',            ar: 'عرض تلفزيوني' },
  workshop:           { en: 'Workshop',           ar: 'ورشة' },
  competition:        { en: 'Competition',        ar: 'مسابقة' },
  annual_performance: { en: 'Annual Performance', ar: 'عرض سنوي' },
  event:              { en: 'Event',              ar: 'فعالية' },
}

export function typeLabel(type: string, isRtl: boolean): string {
  return TYPE_LABELS[type]?.[isRtl ? 'ar' : 'en'] || type
}

/** Today's date (YYYY-MM-DD) in the academy's timezone. */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date())
}

/** Whole days from today until `date` (YYYY-MM-DD). Negative = in the past. */
export function daysUntil(date: string, today = todayISO()): number {
  const toUtc = (d: string) => {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number)
    return Date.UTC(y, (m || 1) - 1, day || 1)
  }
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000)
}

/** Short relative label + tone for an event date. */
export function countdown(days: number, isRtl: boolean): { label: string; tone: 'now' | 'soon' | 'later' | 'past' } {
  if (days === 0) return { label: isRtl ? 'اليوم' : 'Today', tone: 'now' }
  if (days === 1) return { label: isRtl ? 'غداً' : 'Tomorrow', tone: 'soon' }
  if (days > 1)   return { label: isRtl ? `بعد ${days} يوم` : `In ${days} days`, tone: days <= 14 ? 'soon' : 'later' }
  const ago = -days
  if (ago === 1) return { label: isRtl ? 'أمس' : 'Yesterday', tone: 'past' }
  return { label: isRtl ? `منذ ${ago} يوم` : `${ago} days ago`, tone: 'past' }
}

/** Day number + short month for the calendar tile. */
export function dateParts(date: string, isRtl: boolean): { day: string; month: string; year: string } {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  const month = new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', { month: 'short', timeZone: 'UTC' }).format(dt)
  return { day: String(d || ''), month, year: String(y || '') }
}

/** Money actually collected for a list of enrollments (sums linked payments). */
export function collectedFor(enrollments: any[] | null | undefined): number {
  return (enrollments || []).reduce((sum, e) => {
    const p = Array.isArray(e.payment) ? e.payment[0] : e.payment
    return sum + (Number(p?.amount_paid) || 0)
  }, 0)
}
