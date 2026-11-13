import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import CoachCardActions from './CoachCardActions'
import { cairoMonthRange, cairoToday, fmtDuration } from '@/lib/staffClock'

export default async function CoachesPage() {
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()
  const [curStart, curEnd] = cairoMonthRange(cairoToday().slice(0, 7))

  const { data: coaches } = await supabase
    .from('coaches')
    .select('*')
    .order('name_ar')

  const activeCount   = coaches?.filter((c: any) => c.is_active).length || 0
  const inactiveCount = (coaches?.length || 0) - activeCount

  const { data: attendance } = await supabase
    .from('coach_attendance')
    .select('coach_id, hours_worked, location_status')
    .gte('check_in_time', curStart.toISOString())
    .lt('check_in_time', curEnd.toISOString())
    .not('hours_worked', 'is', null)

  const coachStats: Record<string, { hours: number; flagged: number }> = {}
  attendance?.forEach(a => {
    if (!coachStats[a.coach_id]) coachStats[a.coach_id] = { hours: 0, flagged: 0 }
    coachStats[a.coach_id].hours += a.hours_worked || 0
    if (a.location_status === 'invalid' || a.location_status === 'denied') coachStats[a.coach_id].flagged++
  })


  const L = isRtl ? {
    title: 'المدربات',
    sub: `${activeCount} نشط • ${inactiveCount} غير نشط`,
    add: 'إضافة مدربة',
    hoursMonth: 'ساعات الشهر',
    payroll: 'الراتب المتوقع',
    ratePerHour: 'ج.م / ساعة',
    noCoaches: 'لا توجد مدربات',
  } : {
    title: 'Coaches',
    sub: `${activeCount} active • ${inactiveCount} inactive`,
    add: 'Add Coach',
    hoursMonth: 'Hours This Month',
    payroll: 'Payroll',
    ratePerHour: 'EGP/hr',
    noCoaches: 'No coaches',
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
            <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{L.title}</h1>
          </div>
          <Link href="/dashboard/coaches/new" style={{
            background: '#d4667a', borderRadius: 8, padding: '7px 14px',
            color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            <Plus size={14} />
            {L.add}
          </Link>
        </div>
      </div>

      {/* ── Coach cards ── */}
      <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {coaches?.map((coach: any) => {
              const stats       = coachStats[coach.id] || { hours: 0, flagged: 0 }
              const payroll     = stats.hours * (coach.hourly_rate || 0)
              const displayName = isRtl ? (coach.name_ar || coach.name_en) : (coach.name_en || coach.name_ar)
              const initial     = (displayName || '').charAt(0)
              return (
                <div key={coach.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderTop: '3px solid #4a90d9',
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                      background: '#4a90d918', border: '1px solid #4a90d928',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#4a90d9',
                    }}>
                      {initial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 700 }}>{displayName}</p>
                      <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>
                        {coach.hourly_rate} {L.ratePerHour}
                        {stats.flagged > 0 && (
                          <span style={{ marginInlineStart: 8, color: '#e8960a', fontWeight: 600 }}>⚠ {stats.flagged}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.hoursMonth}</span>
                      <span style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>
                        {fmtDuration(stats.hours * 3600000, isRtl)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{L.payroll}</span>
                      <span style={{ color: '#3dab7e', fontSize: 13, fontWeight: 700 }}>
                        {payroll.toFixed(0)} {isRtl ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <CoachCardActions
                      id={coach.id}
                      displayName={displayName || coach.id}
                      isActive={coach.is_active}
                      isRtl={isRtl}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {(!coaches || coaches.length === 0) && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--txt2)', fontSize: 13 }}>{L.noCoaches}</div>
          )}
      </div>
    </div>
  )
}
