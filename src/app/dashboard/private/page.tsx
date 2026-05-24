import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/utils'
import NewPrivateSessionForm from './NewPrivateSessionForm'
import { getTranslations, getLocale } from 'next-intl/server'

function fmt12(time: string | null) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  const h12    = h % 12 || 12
  const suffix = h < 12 ? 'AM' : 'PM'
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export default async function PrivatePage() {
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const t        = await getTranslations('private')
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('private_sessions')
    .select('*, student:students(name_ar, name_en), coach:coaches(name_ar, name_en), hall:halls(name)')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(50)

  const { data: students } = await supabase
    .from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar')
  const { data: coaches } = await supabase
    .from('coaches').select('id, name_ar, name_en').eq('is_active', true).order('name_ar')
  const { data: halls } = await supabase
    .from('halls').select('id, name').order('name')

  const totalRevenue = sessions?.reduce((s, p) => s + (p.fee || 0), 0) || 0

  function name(s: any) {
    if (!s) return '—'
    return isRtl ? s.name_ar : (s.name_en || s.name_ar)
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>
          {isRtl ? 'جلسات التدريب الخاص' : 'One-on-one training sessions'}
        </p>
        <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{t('title')}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Form */}
        <NewPrivateSessionForm students={students || []} coaches={coaches || []} halls={halls || []} isRtl={isRtl} />

        {/* Sessions history */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{t('lastSessions')}</p>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#3dab7e' }}>{formatCurrency(totalRevenue)}</span>
          </div>

          {sessions && sessions.length > 0 ? sessions.map((s: any) => {
            const timeRange = (s.start_time && s.end_time)
              ? `${fmt12(s.start_time)} – ${fmt12(s.end_time)}`
              : s.duration_hours ? `${s.duration_hours} ${isRtl ? 'ساعة' : 'hr'}` : null
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 18px', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{name(s.student)}</p>
                    {s.attendance_status === 'present' && (
                      <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 7px', background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e28' }}>✓</span>
                    )}
                    {s.attendance_status === 'absent' && (
                      <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 7px', background: '#e0404018', color: '#e04040', border: '1px solid #e0404028' }}>✗</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>
                    {isRtl ? 'مع' : 'with'} {name(s.coach)}
                    {timeRange ? ` · ${timeRange}` : ''}
                    {s.hall?.name ? ` · ${s.hall.name}` : ''}
                    {' · '}{formatDate(s.date)}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#3dab7e' }}>
                    {formatCurrency(s.fee || 0)}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '1px 8px',
                    background: s.payment_method === 'instapay' ? '#4a90d918' : '#3dab7e18',
                    color:      s.payment_method === 'instapay' ? '#4a90d9'   : '#3dab7e',
                    border: `1px solid ${s.payment_method === 'instapay' ? '#4a90d928' : '#3dab7e28'}`,
                  }}>
                    {s.payment_method === 'instapay' ? (isRtl ? 'إنستاباي' : 'Instapay') : (isRtl ? 'كاش' : 'Cash')}
                  </span>
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13 }}>
              {isRtl ? 'لا توجد جلسات مسجلة' : 'No sessions recorded yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
