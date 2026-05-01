import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/utils'
import NewPrivateSessionForm from './NewPrivateSessionForm'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function PrivatePage() {
  const locale  = await getLocale()
  const isRtl   = locale === 'ar'
  const t       = await getTranslations('private')
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('private_sessions')
    .select('*, student:students(name_ar, name_en), coach:coaches(name_ar, name_en)')
    .order('date', { ascending: false })
    .limit(30)

  const { data: students } = await supabase
    .from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar')
  const { data: coaches } = await supabase
    .from('coaches').select('id, name_ar, name_en').eq('is_active', true).order('name_ar')

  const totalRevenue = sessions?.reduce((s, p) => s + p.fee, 0) || 0

  const L = isRtl ? {
    sub:    'جلسات التدريب الخاص',
    with:   'مع',
    hours:  'ساعة',
    noSessions: 'لا توجد جلسات مسجلة',
    total:  'إجمالي الإيرادات',
  } : {
    sub:    'One-on-one training sessions',
    with:   'with',
    hours:  'hr',
    noSessions: 'No sessions recorded yet',
    total:  'Total Revenue',
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
        <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{t('title')}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Form */}
        <NewPrivateSessionForm students={students || []} coaches={coaches || []} isRtl={isRtl} />

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
            const studentName = isRtl ? s.student?.name_ar : (s.student?.name_en || s.student?.name_ar)
            const coachName   = isRtl ? s.coach?.name_ar   : (s.coach?.name_en   || s.coach?.name_ar)
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 18px', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{studentName}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
                    {L.with} {coachName} · {s.duration_hours} {L.hours} · {formatDate(s.date)}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#3dab7e', flexShrink: 0 }}>
                  {formatCurrency(s.fee)}
                </span>
              </div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13 }}>
              {L.noSessions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
