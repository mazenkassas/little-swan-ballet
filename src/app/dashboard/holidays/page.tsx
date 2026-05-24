import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { differenceInDays, parseISO } from 'date-fns'
import HolidayForm from './HolidayForm'
import DeleteHolidayButton from './DeleteHolidayButton'

export const dynamic = 'force-dynamic'

function statusOf(start: string, end: string, today: string) {
  if (end < today)   return 'past'
  if (start > today) return 'upcoming'
  return 'active'
}

export default async function HolidaysPage() {
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  const [{ data: holidays }, { data: students }] = await Promise.all([
    supabase.from('holidays').select('*').order('start_date', { ascending: false }),
    supabase.from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar'),
  ])

  const active   = (holidays || []).filter(h => statusOf(h.start_date, h.end_date, today) === 'active')
  const upcoming = (holidays || []).filter(h => statusOf(h.start_date, h.end_date, today) === 'upcoming')
  const past     = (holidays || []).filter(h => statusOf(h.start_date, h.end_date, today) === 'past')

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function dayCount(start: string, end: string) {
    return differenceInDays(parseISO(end), parseISO(start)) + 1
  }

  function daysUntil(start: string) {
    return differenceInDays(parseISO(start), parseISO(today))
  }

  function daysLeft(end: string) {
    return differenceInDays(parseISO(end), parseISO(today)) + 1
  }

  function HolidayCard({ h }: { h: any }) {
    const status = statusOf(h.start_date, h.end_date, today)
    const isSpecific = h.student_ids && h.student_ids.length > 0
    const specificStudents = isSpecific
      ? (students || []).filter((s: any) => h.student_ids.includes(s.id))
      : []

    const days = dayCount(h.start_date, h.end_date)

    const accent =
      status === 'active'   ? '#3dab7e' :
      status === 'upcoming' ? '#4a90d9' : 'var(--txt2)'

    const accentBg =
      status === 'active'   ? '#3dab7e12' :
      status === 'upcoming' ? '#4a90d912' : 'var(--bg-page)'

    const statusLabel =
      status === 'active'   ? (isRtl ? 'جارية الآن' : 'Active Now') :
      status === 'upcoming' ? (isRtl ? 'قادمة' : 'Upcoming') :
                              (isRtl ? 'منتهية' : 'Past')

    const statusIcon =
      status === 'active' ? '🟢' : status === 'upcoming' ? '📅' : '🗂'

    return (
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid ${status === 'active' ? '#3dab7e40' : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: status === 'active' ? '0 0 0 3px #3dab7e10' : 'none',
        transition: 'box-shadow 0.15s',
      }}>
        {/* Color bar */}
        <div style={{ height: 4, background: accent, opacity: status === 'past' ? 0.3 : 1 }} />

        <div style={{ padding: '14px 16px' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: accentBg, border: `1px solid ${accent}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              🎌
            </div>

            {/* Name + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)', lineHeight: 1.3 }}>
                {h.name}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                {/* Status badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: accentBg, color: accent, border: `1px solid ${accent}30`,
                }}>
                  {statusIcon} {statusLabel}
                </span>
                {/* Scope badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                  background: isSpecific ? '#d4667a15' : '#7c5cdb15',
                  color:      isSpecific ? '#d4667a'   : '#7c5cdb',
                  border:     `1px solid ${isSpecific ? '#d4667a30' : '#7c5cdb30'}`,
                }}>
                  {isSpecific
                    ? (isRtl ? `👤 ${specificStudents.length} طالبة` : `👤 ${specificStudents.length} student(s)`)
                    : (isRtl ? '🌍 جميع الطالبات' : '🌍 All students')}
                </span>
                {/* Duration badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'var(--bg-page)', color: 'var(--txt2)', border: '1px solid var(--border)',
                }}>
                  🗓 {days} {isRtl ? (days === 1 ? 'يوم' : 'أيام') : (days === 1 ? 'day' : 'days')}
                </span>
              </div>
            </div>

            <DeleteHolidayButton id={h.id} name={h.name} isRtl={isRtl} />
          </div>

          {/* Date range row */}
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 10,
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)' }}>
              <span style={{ fontWeight: 600, color: 'var(--txt1)' }}>{fmtDate(h.start_date)}</span>
              {' '}{isRtl ? '←' : '→'}{' '}
              <span style={{ fontWeight: 600, color: 'var(--txt1)' }}>{fmtDate(h.end_date)}</span>
            </p>
            {status === 'upcoming' && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4a90d9' }}>
                {isRtl
                  ? `تبدأ بعد ${daysUntil(h.start_date)} ${daysUntil(h.start_date) === 1 ? 'يوم' : 'أيام'}`
                  : `Starts in ${daysUntil(h.start_date)} ${daysUntil(h.start_date) === 1 ? 'day' : 'days'}`}
              </span>
            )}
            {status === 'active' && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#3dab7e' }}>
                {isRtl
                  ? `${daysLeft(h.end_date)} ${daysLeft(h.end_date) === 1 ? 'يوم متبقي' : 'أيام متبقية'}`
                  : `${daysLeft(h.end_date)} ${daysLeft(h.end_date) === 1 ? 'day left' : 'days left'}`}
              </span>
            )}
          </div>

          {/* Specific student chips */}
          {isSpecific && specificStudents.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
              {specificStudents.map((s: any) => (
                <span key={s.id} style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                  background: '#d4667a12', color: 'var(--txt1)', border: '1px solid var(--border)',
                }}>
                  {isRtl || !s.name_en ? s.name_ar : s.name_en}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const totalUpcoming = upcoming.length
  const anyActive     = active.length > 0

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>
          {isRtl ? 'إدارة إجازات الأكاديمية' : 'Academy holiday management'}
        </p>
        <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>
          {isRtl ? 'الإجازات' : 'Holidays'}
        </h1>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          {
            label: isRtl ? 'جارية الآن' : 'Active Now',
            value: active.length,
            color: '#3dab7e', bg: '#3dab7e12', icon: '🟢',
          },
          {
            label: isRtl ? 'قادمة' : 'Upcoming',
            value: upcoming.length,
            color: '#4a90d9', bg: '#4a90d912', icon: '📅',
          },
          {
            label: isRtl ? 'منتهية' : 'Past',
            value: past.length,
            color: 'var(--txt2)', bg: 'var(--bg-card)', icon: '📁',
          },
        ].map(stat => (
          <div key={stat.label} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 12,
            background: stat.bg, border: `1px solid ${stat.color}25`,
          }}>
            <span style={{ fontSize: 16 }}>{stat.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)', fontWeight: 600 }}>
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Active holiday alert */}
      {anyActive && (
        <div style={{
          background: '#3dab7e12', border: '1px solid #3dab7e40', borderRadius: 12,
          padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🟢</span>
          <p style={{ margin: 0, fontSize: 12, color: '#3dab7e', fontWeight: 600, lineHeight: 1.6 }}>
            {isRtl
              ? `إجازة نشطة الآن — حصص الطالبات لن تُخصم خلال هذه الفترة.`
              : `There is an active holiday — student sessions will not be deducted during this period.`}
          </p>
        </div>
      )}

      {/* Info banner */}
      {!anyActive && (
        <div style={{
          background: '#4a90d910', border: '1px solid #4a90d930', borderRadius: 12,
          padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)', lineHeight: 1.6 }}>
            {isRtl
              ? 'أيام الإجازة لا تُحتسب من رصيد حصص الطالبة. إذا حضرت طالبة حصة خلال إجازة رسمية، لا يتم خصم حصة من اشتراكها.'
              : 'Sessions that fall within a holiday period do not deduct from student subscriptions. Attendance can still be recorded, but no session is counted against the student\'s remaining balance.'}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Add form */}
        <HolidayForm isRtl={isRtl} students={students || []} />

        {/* Holiday list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Active now */}
          {active.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#3dab7e', display: 'flex', alignItems: 'center', gap: 6 }}>
                🟢 {isRtl ? 'جارية الآن' : 'Active Now'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.map(h => <HolidayCard key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#4a90d9', display: 'flex', alignItems: 'center', gap: 6 }}>
                📅 {isRtl ? `إجازات قادمة (${totalUpcoming})` : `Upcoming Holidays (${totalUpcoming})`}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(h => <HolidayCard key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                📁 {isRtl ? `إجازات سابقة (${past.length})` : `Past Holidays (${past.length})`}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {past.map(h => <HolidayCard key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {(holidays || []).length === 0 && (
            <div style={{
              textAlign: 'center', padding: '64px 0', color: 'var(--txt2)',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎌</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>
                {isRtl ? 'لا توجد إجازات مسجلة' : 'No holidays added yet'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>
                {isRtl ? 'أضف إجازتك الأولى من النموذج على اليسار' : 'Add your first holiday using the form on the left'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
