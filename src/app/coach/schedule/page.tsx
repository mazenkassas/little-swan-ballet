import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function CoachSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const isRtl = locale === 'ar'

  const { data: coach } = await supabase
    .from('coaches')
    .select('id, name_ar, name_en')
    .eq('email', user.email!)
    .eq('can_login', true)
    .maybeSingle()
  if (!coach) redirect('/login')

  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, days_of_week, start_time, end_time, max_capacity, hall:halls(name), level:levels(name), grade:grades(name), term:terms(name)')
    .eq('default_coach_id', coach.id)
    .eq('is_active', true)
    .order('start_time')

  const classIds = (classes || []).map((c: any) => c.id)

  const { data: enrollments } = await supabase
    .from('class_students')
    .select('class_id')
    .in('class_id', classIds.length ? classIds : ['00000000-0000-0000-0000-000000000000'])

  const enrolledMap: Record<string, number> = {}
  ;(enrollments || []).forEach((e: any) => {
    enrolledMap[e.class_id] = (enrolledMap[e.class_id] || 0) + 1
  })

  function fmtDays(days: unknown) {
    if (!days) return ''
    const arr = Array.isArray(days) ? days : []
    if (!isRtl) return arr.join(', ')
    const map: Record<string, string> = {
      Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
      Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
    }
    return arr.map((d: string) => map[d] || d).join(', ')
  }

  return (
    <div className="page-body" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>

      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--txt2)' }}>
          {isRtl ? 'جدولك الأسبوعي' : 'Your weekly timetable'}
        </p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--txt1)', letterSpacing: -0.4 }}>
          {isRtl ? 'جدولي' : 'My Schedule'}
        </h1>
      </div>

      {(classes || []).length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '40px 20px', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--txt2)', fontSize: 14 }}>
            {isRtl ? 'لا توجد مجموعات مخصصة لك' : 'No classes assigned to you'}
          </p>
        </div>
      ) : (
        <div className="kpi-grid-2">
          {(classes || []).map((c: any) => {
            const hall     = c.hall?.name || ''
            const level    = c.level?.name || ''
            const grade    = c.grade?.name || ''
            const term     = c.term?.name || ''
            const enrolled = enrolledMap[c.id] || 0
            const daysStr  = fmtDays(c.days_of_week)

            return (
              <div key={c.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderTop: '3px solid #4a90d9',
                borderRadius: 14,
                padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0, marginInlineEnd: 10 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>
                      {c.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>
                      {daysStr}
                      {c.start_time ? ` · ${c.start_time.slice(0, 5)}` : ''}
                      {c.end_time ? `–${c.end_time.slice(0, 5)}` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {hall && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: '#4a90d918', color: '#4a90d9', border: '1px solid #4a90d928',
                        borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 600,
                      }}>
                        {hall}
                      </span>
                    )}
                    {level && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--txt2)' }}>{level}</p>}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {grade && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{isRtl ? 'الصف' : 'Grade'}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt1)' }}>{grade}</span>
                    </div>
                  )}
                  {term && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{isRtl ? 'الترم' : 'Term'}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt1)' }}>{term}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{isRtl ? 'الطالبات' : 'Enrolled'}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt1)' }}>
                      {enrolled} / {c.max_capacity || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
