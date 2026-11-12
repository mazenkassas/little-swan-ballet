import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Users, MapPin, CalendarDays, Wallet, AlertCircle, CheckCircle2, Clock, ArrowLeft, ArrowRight, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getLocale } from 'next-intl/server'
import EventEnrollForm from './EventEnrollForm'
import EventDetailActions from './EventDetailActions'
import EnrolledList, { type EnrolledRow } from './EnrolledList'
import { TYPE_COLORS, typeLabel, todayISO, daysUntil, countdown, dateParts, collectedFor } from '../eventUi'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = await params
  const locale    = await getLocale()
  const isRtl     = locale === 'ar'
  const supabase  = await createClient()

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: enrollments } = await supabase
    .from('event_enrollments')
    .select('*, student:students(name_ar, name_en, class_students(class:classes(id, name, is_active))), payment:payments(amount_paid, payment_method)')
    .eq('event_id', id)
    .order('id')

  const enrolledIds = enrollments?.map(e => e.student_id) || []
  let available: any[] = []
  if (enrolledIds.length === 0) {
    const { data } = await supabase.from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar')
    available = data || []
  } else {
    const { data } = await supabase.from('students').select('id, name_ar, name_en').eq('status', 'active').not('id', 'in', `(${enrolledIds.join(',')})`).order('name_ar')
    available = data || []
  }

  const price      = Number(event.price) || 0
  const enrolled   = enrollments?.length || 0
  const paidCount  = enrollments?.filter(e => e.payment_status === 'paid').length || 0
  const collected  = collectedFor(enrollments)
  const expected   = enrolled * price
  const remaining  = Math.max(0, expected - collected)
  const pct        = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0
  const typeColor  = TYPE_COLORS[event.type] || '#8e5fd9'

  const today      = todayISO()
  const days       = daysUntil(event.date, today)
  const when       = countdown(days, isRtl)
  const dp         = dateParts(event.date, isRtl)
  const deadline   = event.payment_deadline ? dateParts(event.payment_deadline, isRtl) : null
  const deadlineDays = event.payment_deadline ? daysUntil(event.payment_deadline, today) : null
  const deadlinePassed = deadlineDays != null && deadlineDays < 0 && remaining > 0

  const L = isRtl ? {
    back: 'كل الفعاليات', enrolledTitle: 'الطالبات المسجلات', perStudent: 'للطالبة',
    enrolled: 'المسجلات', paidOf: 'دفعت بالكامل', collected: 'المحصّل', of: 'من',
    remaining: 'المتبقي', deadline: 'آخر موعد للدفع', deadlinePassed: 'انتهى موعد الدفع',
    progress: 'نسبة التحصيل', allPaid: 'تم التحصيل بالكامل', notPaid: 'لم تكمل الدفع',
  } : {
    back: 'All events', enrolledTitle: 'Enrolled Students', perStudent: '/ student',
    enrolled: 'Enrolled', paidOf: 'paid in full', collected: 'Collected', of: 'of',
    remaining: 'Remaining', deadline: 'Payment deadline', deadlinePassed: 'Deadline passed',
    progress: 'Collection progress', allPaid: 'Fully collected', notPaid: 'not fully paid',
  }

  const rows: EnrolledRow[] = (enrollments || []).map((e: any) => {
    const name    = isRtl || !e.student?.name_en ? e.student?.name_ar : e.student?.name_en
    const altName = isRtl ? e.student?.name_en : (e.student?.name_en ? e.student?.name_ar : null)
    const pay     = Array.isArray(e.payment) ? e.payment[0] : e.payment
    // Her current (active) classes, e.g. "Grade 3 · Term 2 · Thu · 6 PM – 8 PM"
    const classes = (e.student?.class_students || [])
      .map((cs: any) => (Array.isArray(cs.class) ? cs.class[0] : cs.class))
      .filter((c: any) => c && c.is_active !== false)
      .map((c: any) => ({ id: c.id, name: c.name }))
    return {
      id: e.id, name: name || '—', altName: altName || null,
      initial: (e.student?.name_ar || name || '?')[0],
      classes, status: e.payment_status,
      amountPaid: Number(pay?.amount_paid) || 0,
      method: pay?.payment_method || null,
    }
  }).sort((a, b) => a.name.localeCompare(b.name, isRtl ? 'ar' : 'en'))

  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  return (
    <div style={{ padding: '20px 28px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="dh">
        <Link href="/dashboard/events" className="ev-back"><BackIcon size={14} />{L.back}</Link>

        {/* Event header */}
        <header className="ev-hero">
          <div className="ev-date" aria-hidden>
            <small style={{ background: typeColor }}>{dp.month}</small>
            <b>{dp.day}</b>
          </div>
          <div className="ev-main">
            <div className="ev-title">
              <h1>{event.name}</h1>
              <span className="ev-tag" style={{ color: typeColor, background: typeColor + '18' }}>{typeLabel(event.type, isRtl)}</span>
              <span className={`ev-when ${when.tone}`}>{when.label}</span>
            </div>
            <div className="ev-meta">
              <span><CalendarDays size={12} />{dp.day} {dp.month} {dp.year}</span>
              {event.venue && <span><MapPin size={12} />{event.venue}</span>}
              <span><Tag size={12} />{formatCurrency(price)} {L.perStudent}</span>
              {deadline && (
                <span style={{ color: deadlinePassed ? '#e04040' : undefined, fontWeight: deadlinePassed ? 600 : undefined }}>
                  <Clock size={12} />{L.deadline}: {deadline.day} {deadline.month}
                  {deadlinePassed && ` · ${L.deadlinePassed}`}
                </span>
              )}
            </div>
          </div>
          <div className="ev-head-actions">
            <EventDetailActions id={id} name={event.name} isRtl={isRtl} />
          </div>
        </header>

        {/* KPIs */}
        <div className="dh-stats">
          <div className="dh-stat static">
            <div className="dh-stat-top">{L.enrolled}<i style={{ background: '#4a90d918', color: '#4a90d9' }}><Users size={15} /></i></div>
            <b>{enrolled}</b>
            <small>{paidCount} {L.paidOf}</small>
          </div>
          <div className="dh-stat static">
            <div className="dh-stat-top">{L.collected}<i style={{ background: '#3dab7e18', color: '#3dab7e' }}><Wallet size={15} /></i></div>
            <b style={{ color: '#2f9a6d' }}>{formatCurrency(collected)}</b>
            <small>{L.of} {formatCurrency(expected)}</small>
          </div>
          <div className="dh-stat static">
            <div className="dh-stat-top">
              {L.remaining}
              <i style={{ background: remaining > 0 ? '#e8960a18' : '#3dab7e18', color: remaining > 0 ? '#e8960a' : '#3dab7e' }}>
                {remaining > 0 ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
              </i>
            </div>
            <b style={{ color: remaining > 0 ? '#c27c00' : undefined }}>{formatCurrency(remaining)}</b>
            <small>{remaining > 0 ? `${enrolled - paidCount} ${L.notPaid}` : L.allPaid}</small>
          </div>
          <div className="dh-stat static">
            <div className="dh-stat-top">{L.progress}</div>
            <b>{pct}%</b>
            <div className="ev-bar" style={{ marginTop: 8 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Enrolled list */}
        <section className="dh-card">
          <div className="dh-card-head">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Users size={15} color="#d4667a" />
              {L.enrolledTitle}
              <span className="dh-pill">{enrolled}</span>
            </h2>
            <EventEnrollForm eventId={id} eventPrice={price} students={available} isRtl={isRtl} />
          </div>
          <EnrolledList rows={rows} eventId={id} price={price} isRtl={isRtl} />
        </section>
      </div>
    </div>
  )
}
