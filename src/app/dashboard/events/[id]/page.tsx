import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, Users, MapPin } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getLocale } from 'next-intl/server'
import EventEnrollForm from './EventEnrollForm'
import EventDetailActions from './EventDetailActions'

const TYPE_COLORS: Record<string, string> = {
  recital: '#d4667a', tv_show: '#4a90d9', workshop: '#8e5fd9', competition: '#e8960a',
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = await params
  const locale    = await getLocale()
  const isRtl     = locale === 'ar'
  const supabase  = await createClient()

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: enrollments } = await supabase
    .from('event_enrollments')
    .select('*, student:students(name_ar, name_en), payment:payments(amount_paid, payment_method)')
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

  const totalPaid    = enrollments?.filter(e => e.payment_status === 'paid').length || 0
  const totalRevenue = totalPaid * event.price
  const typeColor    = TYPE_COLORS[event.type] || '#8e5fd9'

  const typeLabels: Record<string, Record<string, string>> = {
    recital:     { en: 'Recital',     ar: 'عرض' },
    tv_show:     { en: 'TV Show',     ar: 'تلفزيون' },
    workshop:    { en: 'Workshop',    ar: 'ورشة عمل' },
    competition: { en: 'Competition', ar: 'مسابقة' },
  }

  const payLabels: Record<string, Record<string, string>> = {
    paid:    { en: 'Paid',    ar: 'دفعت' },
    partial: { en: 'Partial', ar: 'جزئي' },
    unpaid:  { en: 'Unpaid',  ar: 'لم تدفع' },
  }
  const payColors: Record<string, string> = {
    paid: '#3dab7e', partial: '#e8960a', unpaid: '#e04040',
  }

  const L = isRtl ? {
    back: 'رجوع', enrolled: 'المسجلات', noStudents: 'لا توجد طالبات مسجلات',
    paid: 'دفعت', paidOf: 'دفعت من', perStudent: 'للطالبة', revenue: 'الإيرادات',
    remove: 'حذف',
  } : {
    back: 'Back', enrolled: 'Enrolled Students', noStudents: 'No students enrolled yet',
    paid: 'paid', paidOf: 'paid of', perStudent: '/ student', revenue: 'Revenue',
    remove: 'Remove',
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 28px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        <Link href="/dashboard/events" style={{
          background: '#d4667a', borderRadius: 8, padding: '7px 16px',
          color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {L.back}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
        <EventDetailActions id={id} name={event.name} isRtl={isRtl} />

        {/* Event icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: typeColor + '18', border: `1px solid ${typeColor}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Star size={17} color={typeColor} />
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 15, fontWeight: 700 }}>{event.name}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap',
              background: typeColor + '18', color: typeColor, border: `1px solid ${typeColor}28`,
            }}>
              {typeLabels[event.type]?.[isRtl ? 'ar' : 'en'] || event.type}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{formatDate(event.date)}</span>
            {event.venue && (
              <span style={{ color: 'var(--txt2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} />{event.venue}
              </span>
            )}
            <span style={{ color: 'var(--txt2)', fontSize: 12 }}>
              {formatCurrency(event.price)} {L.perStudent}
            </span>
          </div>
        </div>

        {/* KPI chips */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(74,144,217,0.1)', border: '1px solid rgba(74,144,217,0.2)', borderRadius: 10, padding: '6px 14px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#4a90d9' }}>{enrollments?.length || 0}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--txt2)' }}>
              <Users size={9} style={{ display: 'inline', marginInlineEnd: 3 }} />{isRtl ? 'مسجلة' : 'enrolled'}
            </p>
          </div>
          <div style={{ background: 'rgba(61,171,126,0.1)', border: '1px solid rgba(61,171,126,0.2)', borderRadius: 10, padding: '6px 14px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#3dab7e' }}>{formatCurrency(totalRevenue)}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--txt2)' }}>
              {totalPaid} {L.paid}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{
        padding: '24px 28px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* Enrolled list */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} color="#d4667a" />
            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>
              {isRtl ? `المسجلات (${enrollments?.length || 0})` : `${L.enrolled} (${enrollments?.length || 0})`}
            </p>
          </div>

          {enrollments && enrollments.length > 0 ? enrollments.map((e: any) => {
            const name    = isRtl || !e.student?.name_en ? e.student?.name_ar : e.student?.name_en
            const initial = (e.student?.name_ar || '?')[0]
            const pClr    = payColors[e.payment_status] || '#888'
            const pLbl    = payLabels[e.payment_status]?.[isRtl ? 'ar' : 'en'] || e.payment_status

            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                  background: '#d4667a18', border: '1px solid #d4667a28',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#d4667a',
                }}>
                  {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{name}</p>
                  {e.payment?.amount_paid != null && (
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>
                      {formatCurrency(e.payment.amount_paid)}
                      {e.payment.payment_method ? ` · ${e.payment.payment_method}` : ''}
                    </p>
                  )}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '3px 9px',
                  background: pClr + '15', color: pClr, border: `1px solid ${pClr}28`,
                  whiteSpace: 'nowrap',
                }}>
                  {pLbl}
                </span>
                <UnenrollButton enrollmentId={e.id} label={L.remove} />
              </div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13 }}>
              {L.noStudents}
            </div>
          )}
        </div>

        {/* Enroll form */}
        <EventEnrollForm
          eventId={id}
          eventPrice={event.price}
          students={available}
          isRtl={isRtl}
        />
      </div>
    </div>
  )
}

function UnenrollButton({ enrollmentId, label }: { enrollmentId: string; label: string }) {
  return (
    <form action={async () => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const { revalidatePath } = await import('next/cache')
      const supabase = await createClient()
      await supabase.from('event_enrollments').delete().eq('id', enrollmentId)
      revalidatePath('/dashboard/events/[id]', 'page')
    }}>
      <button type="submit" style={{
        background: 'transparent', border: '1px solid var(--border)',
        borderRadius: 6, padding: '3px 10px', color: 'var(--txt2)',
        fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>
        {label}
      </button>
    </form>
  )
}
