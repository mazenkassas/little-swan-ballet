import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import AttendanceSheet from './AttendanceSheet'
import { getLocale } from 'next-intl/server'

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; date?: string }>
}) {
  const params   = await searchParams
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()
  const today    = params.date || format(new Date(), 'yyyy-MM-dd')

  const { data: rawSessions } = await supabase
    .from('sessions')
    .select('*, class:classes(name, start_time, end_time, grade:grades(name), term:terms(name)), hall:halls(name), coach:coaches(name_ar, name_en)')
    .eq('date', today)
    .order('created_at')

  // Deduplicate by class_id
  const seen = new Set<string>()
  const sessions = (rawSessions || []).filter((s: any) => {
    if (seen.has(s.class_id)) return false
    seen.add(s.class_id)
    return true
  })

  let selectedSession = null
  let enrolledStudents: any[] = []
  let existingAttendance: any[] = []

  if (params.session) {
    const { data: sess } = await supabase
      .from('sessions')
      .select('*, class:classes(*, grade:grades(*), term:terms(*)), hall:halls(*), coach:coaches(*)')
      .eq('id', params.session)
      .single()
    selectedSession = sess

    if (sess) {
      const { data: enrolled } = await supabase
        .from('class_students')
        .select('*, student:students(*, level:levels(name), subscriptions:subscriptions(remaining_sessions, status, total_sessions, start_date))')
        .eq('class_id', sess.class_id)

      enrolledStudents = (enrolled || [])
        .map((e: any) => e.student)
        .filter((s: any) => s && s.status !== 'frozen' && s.status !== 'inactive')

      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', params.session)

      existingAttendance = att || []
    }
  }

  function fmt12h(time: string) {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    const h12 = h % 12 || 12
    const suffix = isRtl
      ? (h < 12 ? 'ص' : 'م')
      : (h < 12 ? 'AM' : 'PM')
    return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
  }

  const L = isRtl ? {
    title: 'الحضور والغياب',
    sub: 'تسجيل حضور الطالبات',
    todaySessions: 'حصص اليوم',
    noSessions: 'لا توجد حصص اليوم',
    selectSession: 'اختر حصة',
    toRecord: 'اضغط على حصة من القائمة لعرض الطالبات',
    noCoach: 'بدون مدربة',
  } : {
    title: 'Attendance',
    sub: 'Record student attendance',
    todaySessions: "Today's Sessions",
    noSessions: 'No sessions today',
    selectSession: 'Select a session',
    toRecord: 'Click a session from the list to view students',
    noCoach: 'No coach',
  }

  return (
    <div style={{ padding: '28px 32px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{L.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 3 }}>{L.sub}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'stretch' }}>

        {/* Sessions sidebar */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>{L.todaySessions}</p>
            <form>
              <input
                type="date"
                name="date"
                defaultValue={today}
                lang={isRtl ? 'ar' : 'en-GB'}
                style={{
                  background: 'var(--bg-page)', border: '1px solid var(--border)',
                  borderRadius: 7, padding: '4px 8px', fontSize: 11,
                  color: 'var(--txt2)', outline: 'none', cursor: 'pointer',
                }}
              />
            </form>
          </div>

          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--txt2)', fontSize: 12, opacity: 0.6 }}>
                {L.noSessions}
              </div>
            ) : sessions.map((s: any) => {
              const isSelected = params.session === s.id
              const gradeName  = s.class?.grade?.name  || ''
              const termName   = s.class?.term?.name   || ''
              const timeStr    = s.class?.start_time ? `${fmt12h(s.class.start_time)} – ${fmt12h(s.class.end_time)}` : ''
              const coachName  = isRtl ? s.coach?.name_ar : s.coach?.name_en
              return (
                <a
                  key={s.id}
                  href={`?session=${s.id}&date=${today}`}
                  style={{
                    display: 'block', padding: '10px 12px', borderRadius: 10,
                    border: `1px solid ${isSelected ? '#d4667a60' : 'var(--border)'}`,
                    background: isSelected ? '#d4667a10' : 'var(--bg-page)',
                    textDecoration: 'none', transition: 'background 0.15s',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isSelected ? '#d4667a' : 'var(--txt1)' }}>
                    {[gradeName, termName].filter(Boolean).join(' · ')}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)', direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}>
                    {[timeStr, s.hall?.name].filter(Boolean).join(' · ')}
                  </p>
                  {coachName && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)', opacity: 0.7 }}>{coachName}</p>
                  )}
                  <span style={{
                    display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 20,
                    background: s.status === 'completed' ? '#3dab7e18' : s.status === 'cancelled' ? '#e0404018' : '#7c3aed18',
                    color:      s.status === 'completed' ? '#3dab7e'   : s.status === 'cancelled' ? '#e04040'   : '#7c3aed',
                    border: `1px solid ${s.status === 'completed' ? '#3dab7e30' : s.status === 'cancelled' ? '#e0404030' : '#7c3aed30'}`,
                  }}>
                    {s.status === 'completed' ? (isRtl ? 'مكتملة' : 'Completed') :
                     s.status === 'cancelled' ? (isRtl ? 'ملغاة'   : 'Cancelled') :
                                                (isRtl ? 'مجدولة'  : 'Scheduled')}
                  </span>
                </a>
              )
            })}
          </div>
        </div>

        {/* Attendance sheet */}
        <div>
          {selectedSession ? (
            <AttendanceSheet
              session={selectedSession}
              students={enrolledStudents}
              existingAttendance={existingAttendance}
              isRtl={isRtl}
            />
          ) : (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center', color: 'var(--txt2)' }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{L.selectSession}</p>
                <p style={{ fontSize: 12, marginTop: 6, opacity: 0.6 }}>{L.toRecord}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
