import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Star, MapPin, CalendarDays, Users, Wallet, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import EventCardActions from './EventCardActions'
import { TYPE_COLORS, typeLabel, todayISO, daysUntil, countdown, dateParts, collectedFor } from './eventUi'

export default async function EventsPage() {
  const locale  = await getLocale()
  const isRtl   = locale === 'ar'
  const t       = await getTranslations('events')
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*, enrollments:event_enrollments(id, payment_status, payment:payments(amount_paid))')
    .order('date', { ascending: false })

  const today = todayISO()
  const rows = (events || []).map((event: any) => {
    const enrolled  = event.enrollments?.length || 0
    const paid      = event.enrollments?.filter((e: any) => e.payment_status === 'paid').length || 0
    const collected = collectedFor(event.enrollments)
    const expected  = enrolled * (Number(event.price) || 0)
    return { event, enrolled, paid, collected, expected, days: daysUntil(event.date, today) }
  })
  // Upcoming: soonest first. Past: most recent first.
  const upcoming = rows.filter(r => r.days >= 0).sort((a, b) => a.days - b.days)
  const past     = rows.filter(r => r.days < 0)

  const totalEnrolled  = rows.reduce((s, r) => s + r.enrolled, 0)
  const totalCollected = rows.reduce((s, r) => s + r.collected, 0)
  const outstanding    = upcoming.reduce((s, r) => s + Math.max(0, r.expected - r.collected), 0)

  const L = isRtl ? {
    upcoming: 'القادمة', past: 'السابقة', events: 'فعاليات قادمة', nextOn: 'الأقرب:',
    none: 'لا توجد فعاليات قادمة', enrollments: 'إجمالي التسجيلات', acrossAll: 'في كل الفعاليات',
    collected: 'المحصّل', outstanding: 'متبقي للتحصيل', onUpcoming: 'على الفعاليات القادمة',
    enrolled: 'مسجلة', paid: 'دفعت', of: 'من', perStudent: 'للطالبة', create: 'إنشاء أول فعالية',
  } : {
    upcoming: 'Upcoming', past: 'Past', events: 'Upcoming events', nextOn: 'Next:',
    none: 'Nothing scheduled', enrollments: 'Total enrollments', acrossAll: 'Across all events',
    collected: 'Collected', outstanding: 'Outstanding', onUpcoming: 'On upcoming events',
    enrolled: t('enrolled'), paid: 'paid', of: 'of', perStudent: t('perStudent'), create: 'Create your first event',
  }

  const next = upcoming[0]

  function EventCard({ r, isPast }: { r: typeof rows[number]; isPast: boolean }) {
    const { event, enrolled, paid, collected, expected, days } = r
    const typeColor = TYPE_COLORS[event.type] || '#8e5fd9'
    const dp   = dateParts(event.date, isRtl)
    const when = countdown(days, isRtl)
    const pct  = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0

    return (
      <article className={`ev-card${isPast ? ' past' : ''}`}>
        <div className="ev-date" aria-hidden>
          <small style={{ background: typeColor }}>{dp.month}</small>
          <b>{dp.day}</b>
        </div>

        <div className="ev-main">
          <div className="ev-title">
            <Link href={`/dashboard/events/${event.id}`} className="ev-link">{event.name}</Link>
            <span className="ev-tag" style={{ color: typeColor, background: typeColor + '18' }}>
              {typeLabel(event.type, isRtl)}
            </span>
            <span className={`ev-when ${when.tone}`}>{when.label}</span>
          </div>
          <div className="ev-meta">
            <span><CalendarDays size={12} />{dp.day} {dp.month} {dp.year}</span>
            {event.venue && <span><MapPin size={12} />{event.venue}</span>}
            <span>{formatCurrency(event.price)} / {L.perStudent}</span>
          </div>
        </div>

        <div className="ev-stats">
          <div className="ev-stat">
            <b>{enrolled}</b>
            <small>{L.enrolled}</small>
          </div>
          <div className="ev-money" title={`${paid}/${enrolled} ${L.paid}`}>
            <div className="ev-money-row">
              <b>{formatCurrency(collected)}</b>
              <span>{L.of} {formatCurrency(expected)}</span>
            </div>
            <div className="ev-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="ev-actions" style={{ flexShrink: 0, minWidth: 160 }}>
          <EventCardActions id={event.id} name={event.name} isRtl={isRtl} />
        </div>
      </article>
    )
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="dh">
        {/* Header */}
        <div className="dh-head">
          <div>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className="dh-actions">
            <Link href="/dashboard/events/new" className="dh-btn primary">
              <Plus size={15} />
              {t('create')}
            </Link>
          </div>
        </div>

        {/* KPIs */}
        {rows.length > 0 && (
          <div className="dh-stats">
            <div className="dh-stat static">
              <div className="dh-stat-top">{L.events}<i style={{ background: '#d4667a18', color: '#d4667a' }}><CalendarDays size={15} /></i></div>
              <b>{upcoming.length}</b>
              <small>{next ? `${L.nextOn} ${next.event.name} · ${countdown(next.days, isRtl).label}` : L.none}</small>
            </div>
            <div className="dh-stat static">
              <div className="dh-stat-top">{L.enrollments}<i style={{ background: '#4a90d918', color: '#4a90d9' }}><Users size={15} /></i></div>
              <b>{totalEnrolled}</b>
              <small>{L.acrossAll}</small>
            </div>
            <div className="dh-stat static">
              <div className="dh-stat-top">{L.collected}<i style={{ background: '#3dab7e18', color: '#3dab7e' }}><Wallet size={15} /></i></div>
              <b>{formatCurrency(totalCollected)}</b>
              <small>{L.acrossAll}</small>
            </div>
            <div className="dh-stat static">
              <div className="dh-stat-top">{L.outstanding}<i style={{ background: '#e8960a18', color: '#e8960a' }}><AlertCircle size={15} /></i></div>
              <b style={{ color: outstanding > 0 ? '#c27c00' : undefined }}>{formatCurrency(outstanding)}</b>
              <small>{L.onUpcoming}</small>
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="ev-section">
            <h2 className="ev-section-title">{L.upcoming}<span>{upcoming.length}</span></h2>
            <div className="ev-list">
              {upcoming.map(r => <EventCard key={r.event.id} r={r} isPast={false} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="ev-section">
            <h2 className="ev-section-title">{L.past}<span>{past.length}</span></h2>
            <div className="ev-list">
              {past.map(r => <EventCard key={r.event.id} r={r} isPast />)}
            </div>
          </section>
        )}

        {rows.length === 0 && (
          <div className="ev-empty">
            <Star size={36} style={{ margin: '0 auto 12px', opacity: 0.25, display: 'block' }} color="var(--txt2)" />
            <p style={{ margin: '0 0 14px' }}>{t('noEvents')}</p>
            <Link href="/dashboard/events/new" className="dh-btn primary"><Plus size={15} />{L.create}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
