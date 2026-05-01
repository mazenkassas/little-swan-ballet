import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Star, MapPin, Users } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'

const TYPE_COLORS: Record<string, string> = {
  recital:     '#d4667a',
  tv_show:     '#4a90d9',
  workshop:    '#8e5fd9',
  competition: '#e8960a',
}

export default async function EventsPage() {
  const locale  = await getLocale()
  const isRtl   = locale === 'ar'
  const t       = await getTranslations('events')
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*, enrollments:event_enrollments(id, payment_status)')
    .order('date', { ascending: false })

  const eventTypeLabels: Record<string, string> = {
    recital:     t('types.recital'),
    tv_show:     t('types.tv_show'),
    workshop:    t('types.workshop'),
    competition: t('types.competition'),
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{t('subtitle')}</p>
          <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{t('title')}</h1>
        </div>
        <Link
          href="/dashboard/events/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#d4667a', color: '#fff',
            padding: '8px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          <Plus size={15} />
          {t('create')}
        </Link>
      </div>

      {/* Events list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events?.map((event: any) => {
          const totalEnrolled = event.enrollments?.length || 0
          const paid          = event.enrollments?.filter((e: any) => e.payment_status === 'paid').length || 0
          const totalRevenue  = paid * event.price
          const typeColor     = TYPE_COLORS[event.type] || '#8e5fd9'

          return (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '14px 18px',
                textDecoration: 'none',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: typeColor + '18', border: `1px solid ${typeColor}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Star size={18} color={typeColor} />
              </div>

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{event.name}</p>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: typeColor,
                    background: typeColor + '18', border: `1px solid ${typeColor}28`,
                    borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap',
                  }}>
                    {eventTypeLabels[event.type] || event.type}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{formatDate(event.date)}</span>
                  {event.venue && (
                    <span style={{ fontSize: 12, color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} />
                      {event.venue}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--txt1)' }}>{totalEnrolled}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>
                    {isRtl ? 'مسجلة' : t('enrolled')}
                  </p>
                </div>
                <div style={{ textAlign: isRtl ? 'start' : 'end' }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#3dab7e' }}>{formatCurrency(totalRevenue)}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>
                    {formatCurrency(event.price)} / {isRtl ? 'طالبة' : t('perStudent')}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}

        {(!events || events.length === 0) && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '64px 24px',
            textAlign: 'center', color: 'var(--txt2)', fontSize: 13,
          }}>
            <Star size={36} style={{ margin: '0 auto 12px', opacity: 0.25, display: 'block' }} color="var(--txt2)" />
            <p style={{ margin: 0 }}>{t('noEvents')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
