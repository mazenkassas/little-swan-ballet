import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Clock, Users } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import { format, addDays, startOfWeek, endOfWeek, getDay } from 'date-fns'
import ClassCardActions from './ClassCardActions'

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

// Saturday-first sort order (separate from DAY_MAP which must match JS getDay())
const DAY_SORT: Record<string, number> = {
  Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3,
  Wednesday: 4, Thursday: 5, Friday: 6,
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; week?: string; day?: string; filterDay?: string }>
}) {
  const params      = await searchParams
  const tab         = params.tab === 'sessions' ? 'sessions' : 'groups'
  const selectedDay = tab === 'sessions' ? (params.day || format(new Date(), 'yyyy-MM-dd')) : null
  const filterDay   = params.filterDay || ''
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const weekStart       = params.week ? new Date(params.week) : startOfWeek(new Date(), { weekStartsOn: 6 })
  const weekEnd         = endOfWeek(weekStart, { weekStartsOn: 6 })
  const weekStr         = format(weekStart, 'yyyy-MM-dd')
  const prevWeekStr     = format(addDays(weekStart, -7), 'yyyy-MM-dd')
  const nextWeekStr     = format(addDays(weekStart, 7), 'yyyy-MM-dd')
  const todayStr        = format(new Date(), 'yyyy-MM-dd')
  const currentWeekStr  = format(startOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd')
  const isCurrentWeek   = weekStr === currentWeekStr

  const { data: rawClasses } = await supabase
    .from('classes')
    .select('*, level:levels(name), hall:halls(name), default_coach:coaches(name_ar, name_en), enrolled_count:class_students(count)')
    .eq('is_active', true)

  // Sort by earliest day-of-week in the class (Saturday-first), then by start_time
  const allClasses = (rawClasses || []).slice().sort((a: any, b: any) => {
    const minDay = (cls: any) =>
      Math.min(...(cls.days_of_week || []).map((d: string) => DAY_SORT[d] ?? 99))
    const da = minDay(a), db = minDay(b)
    if (da !== db) return da - db
    return (a.start_time || '').localeCompare(b.start_time || '')
  })
  const classes = filterDay
    ? allClasses.filter((cls: any) => cls.days_of_week?.includes(filterDay))
    : allClasses

  // Collect all days that have at least one active class (for filter pills)
  const activeDays = Array.from(new Set(allClasses.flatMap((cls: any) => cls.days_of_week || []))) as string[]
  const DAY_SORT_KEYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday']
  activeDays.sort((a, b) => DAY_SORT_KEYS.indexOf(a) - DAY_SORT_KEYS.indexOf(b))

  let sessions: any[] = []
  if (tab === 'sessions') {
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr   = format(weekEnd,   'yyyy-MM-dd')

    // Auto-generate missing sessions for active classes this week
    const { data: activeClasses } = await supabase
      .from('classes')
      .select('id, days_of_week, default_coach_id, hall_id')
      .eq('is_active', true)

    if (activeClasses?.length) {
      const { data: existingSessions } = await supabase
        .from('sessions')
        .select('class_id, date')
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)

      const existingSet = new Set(
        (existingSessions || []).map((s: any) => `${s.class_id}|${s.date}`)
      )

      const toInsert: {
        class_id: string; date: string; coach_id: string | null; hall_id: string | null; status: string
      }[] = []

      for (const cls of activeClasses) {
        for (const dayName of (cls.days_of_week || [])) {
          const targetDow = DAY_MAP[dayName]
          if (targetDow === undefined) continue
          for (let i = 0; i <= 6; i++) {
            const date = addDays(weekStart, i)
            if (getDay(date) === targetDow) {
              const dateStr = format(date, 'yyyy-MM-dd')
              if (!existingSet.has(`${cls.id}|${dateStr}`)) {
                toInsert.push({
                  class_id: cls.id, date: dateStr,
                  coach_id: cls.default_coach_id, hall_id: cls.hall_id, status: 'scheduled',
                })
              }
            }
          }
        }
      }

      if (toInsert.length) await supabase.from('sessions').insert(toInsert)
    }

    const { data: s } = await supabase
      .from('sessions')
      .select('*, class:classes(name, start_time, end_time, grade:grades(name), term:terms(name)), hall:halls(name), coach:coaches(name_ar, name_en)')
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .order('date')
      .order('created_at')

    // Deduplicate: keep only the first session per class+date (guards against DB duplicates)
    const seen = new Set<string>()
    sessions = (s || []).filter((r: any) => {
      const key = `${r.class_id}|${r.date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Day-detail: sessions for the selected day with full student+subscription join
  let dayDetail: any[] = []
  if (tab === 'sessions' && selectedDay) {
    const { data: dd } = await supabase
      .from('sessions')
      .select(`id, status, class:classes(id, name, start_time, end_time, level:levels(name), default_coach:coaches(name_ar, name_en), class_students(student:students(id, name_ar, name_en, subscriptions(remaining_sessions, status, start_date)))), hall:halls(name)`)
      .eq('date', selectedDay)
      .order('created_at')

    // Deduplicate day detail too
    const seenDay = new Set<string>()
    dayDetail = (dd || []).filter((r: any) => {
      const key = r.class?.id
      if (!key || seenDay.has(key)) return false
      seenDay.add(key)
      return true
    })
  }

  const grouped: Record<string, any[]> = {}
  sessions.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = []
    grouped[s.date].push(s)
  })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const DAY_NAMES_WEEK = isRtl
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const DAY_NAMES_MAP: Record<string, string> = isRtl
    ? { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت' }
    : { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' }

  const L = isRtl ? {
    title: 'المجموعات',
    sub: `${classes?.length || 0} مجموعة نشطة`,
    add: 'مجموعة جديدة',
    tabGroups: 'المجموعات',
    tabSchedule: 'الجدول الأسبوعي',
    days: 'الأيام:', coach: 'المدربة:', noLevel: 'بدون مستوى',
    noClasses: 'لا توجد مجموعات', startFirst: 'ابدأ بإضافة أول مجموعة',
    prevWeek: 'الأسبوع السابق', nextWeek: 'الأسبوع التالي',
    today: 'اليوم',
    grade: 'المستوى', time: 'الوقت', coachLabel: 'المدربة',
    students: 'الطالبات', noStudents: 'لا توجد طالبات مسجلات',
    payRequired: 'مطلوب الدفع',
    noSessions: 'لا توجد مجموعات في هذا اليوم', noSessionsToday: 'لا توجد مجموعات اليوم',
  } : {
    title: 'Groups',
    sub: `${classes?.length || 0} active group(s)`,
    add: 'New Group',
    tabGroups: 'Groups',
    tabSchedule: 'Weekly Schedule',
    days: 'Days:', coach: 'Coach:', noLevel: 'No level',
    noClasses: 'No groups', startFirst: 'Start by adding the first group',
    prevWeek: 'Previous Week', nextWeek: 'Next Week',
    today: 'Today',
    grade: 'Grade', time: 'Time', coachLabel: 'Coach',
    students: 'Students', noStudents: 'No students enrolled',
    payRequired: 'Payment Required',
    noSessions: 'No groups on this day', noSessionsToday: 'No groups today',
  }

  function fmt12h(time: string) {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    const h12 = h % 12 || 12
    const s = h < 12 ? 'AM' : 'PM'
    return m === 0 ? `${h12} ${s}` : `${h12}:${String(m).padStart(2, '0')} ${s}`
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div className="page-body" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
            <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{L.title}</h1>
          </div>
          {tab === 'groups' && (
            <Link href="/dashboard/classes/new" style={{
              background: '#d4667a', borderRadius: 8, padding: '7px 14px',
              color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              <Plus size={14} />
              {L.add}
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            { key: 'groups',   label: L.tabGroups,   href: '/dashboard/classes' },
            { key: 'sessions', label: L.tabSchedule, href: '/dashboard/classes?tab=sessions' },
          ].map(t => (
            <Link key={t.key} href={t.href} style={{
              padding: '10px 18px', fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#d4667a' : 'var(--txt2)',
              textDecoration: 'none',
              borderBottom: tab === t.key ? '2px solid #d4667a' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}>
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Groups Tab ── */}
      {tab === 'groups' && (
        <div className="page-body">

          {/* Day filter pills */}
          {activeDays.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
              <Link href="/dashboard/classes" style={{ textDecoration: 'none' }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                  background: !filterDay ? '#d4667a' : 'var(--bg-card)',
                  color: !filterDay ? '#fff' : 'var(--txt2)',
                  border: `1px solid ${!filterDay ? '#d4667a' : 'var(--border)'}`,
                  display: 'inline-block',
                }}>
                  {isRtl ? 'الكل' : 'All'} ({allClasses.length})
                </span>
              </Link>
              {activeDays.map(day => {
                const count   = allClasses.filter((c: any) => c.days_of_week?.includes(day)).length
                const active  = filterDay === day
                return (
                  <Link key={day} href={`/dashboard/classes?filterDay=${day}`} style={{ textDecoration: 'none' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                      background: active ? '#7c5cdb' : 'var(--bg-card)',
                      color: active ? '#fff' : 'var(--txt2)',
                      border: `1px solid ${active ? '#7c5cdb' : 'var(--border)'}`,
                      display: 'inline-block',
                    }}>
                      {DAY_NAMES_MAP[day] || day} ({count})
                    </span>
                  </Link>
                )
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
            {classes?.map((cls: any) => {
              const enrolled = cls.enrolled_count?.[0]?.count || 0
              const pct      = Math.min(Math.round((enrolled / (cls.max_capacity || 1)) * 100), 100)
              const barColor = pct >= 90 ? '#e04040' : pct >= 70 ? '#f5a623' : '#3dab7e'
              return (
                <div key={cls.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  borderTop: `3px solid ${barColor}`,
                }}>
                  <Link href={`/dashboard/classes/${cls.id}`} style={{ padding: '16px 18px', display: 'block', textDecoration: 'none', flex: 1 }}>

                    {/* Name + hall */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 14, fontWeight: 700 }}>{cls.name}</p>
                        {cls.level?.name && (
                          <p style={{ margin: '3px 0 0', color: 'var(--txt2)', fontSize: 11 }}>{cls.level.name}</p>
                        )}
                      </div>
                      {cls.hall?.name && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 9px', whiteSpace: 'nowrap',
                          background: '#7c3aed18', color: '#7c3aed', border: '1px solid #7c3aed28', borderRadius: 20,
                          marginInlineStart: 8,
                        }}>{cls.hall.name}</span>
                      )}
                    </div>

                    {/* Time — prominent */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'var(--bg-page)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '5px 10px', marginBottom: 10,
                    }}>
                      <Clock size={12} style={{ color: '#d4667a', flexShrink: 0 }} />
                      <span style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>
                        {fmt12h(cls.start_time)} – {fmt12h(cls.end_time)}
                      </span>
                    </div>

                    {/* Days as pills */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                      {cls.days_of_week?.map((d: string) => (
                        <span key={d} style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: filterDay === d ? '#7c5cdb30' : '#7c5cdb12',
                          color: '#7c5cdb',
                          border: `1px solid ${filterDay === d ? '#7c5cdb50' : '#7c5cdb20'}`,
                        }}>
                          {DAY_NAMES_MAP[d] || d}
                        </span>
                      ))}
                    </div>

                    {/* Coach */}
                    {cls.default_coach && (
                      <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 12 }}>
                        {L.coach} <span style={{ color: 'var(--txt1)', fontWeight: 500 }}>
                          {isRtl ? cls.default_coach.name_ar : (cls.default_coach.name_en || cls.default_coach.name_ar)}
                        </span>
                      </div>
                    )}

                    {/* Capacity bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--txt2)', fontSize: 11 }}>
                          <Users size={11} />
                          <span style={{ fontWeight: 600, color: barColor }}>{enrolled}</span>
                          <span style={{ opacity: 0.6 }}>/ {cls.max_capacity}</span>
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
                        <div style={{ height: 5, borderRadius: 3, background: barColor, width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </Link>
                  <ClassCardActions id={cls.id} name={cls.name} isRtl={isRtl} />
                </div>
              )
            })}
          </div>
          {(!classes || classes.length === 0) && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--txt2)' }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                {filterDay ? (isRtl ? `لا توجد مجموعات يوم ${DAY_NAMES_MAP[filterDay]}` : `No groups on ${filterDay}`) : L.noClasses}
              </p>
              {!filterDay && <p style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>{L.startFirst}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Weekly Schedule Tab ── */}
      {tab === 'sessions' && (
        <div className="page-body">

          {/* Week nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Link href={`?tab=sessions&week=${prevWeekStr}&day=${selectedDay || ''}`} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '7px 14px', color: 'var(--txt1)', fontSize: 12, fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              {isRtl ? '→' : '←'}
            </Link>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--txt1)' }}>
                {format(weekStart, 'dd MMM')} — {format(weekEnd, 'dd MMM yyyy')}
              </p>
            </div>
            <Link href={`?tab=sessions&week=${nextWeekStr}&day=${selectedDay || ''}`} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '7px 14px', color: 'var(--txt1)', fontSize: 12, fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              {isRtl ? '←' : '→'}
            </Link>
            {!isCurrentWeek && (
              <Link href={`?tab=sessions&week=${currentWeekStr}&day=${todayStr}`} style={{
                background: '#d4667a', borderRadius: 8, padding: '7px 14px',
                color: '#fff', fontSize: 12, fontWeight: 700,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                {L.today}
              </Link>
            )}
          </div>

          {/* Status legend */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 18, justifyContent: 'center' }}>
            {[
              { color: '#7c3aed', label: isRtl ? 'مجدولة' : 'Scheduled' },
              { color: '#3dab7e', label: isRtl ? 'منتهية' : 'Completed' },
              { color: '#e04040', label: isRtl ? 'ملغية'  : 'Cancelled'  },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--txt2)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>

          {/* Week grid */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: selectedDay ? 28 : 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 10, minWidth: 700 }}>
              {days.map(day => {
                const dateStr     = format(day, 'yyyy-MM-dd')
                const daySessions = grouped[dateStr] || []
                const isToday     = dateStr === todayStr
                const isSelected  = dateStr === selectedDay
                const dayHref     = isSelected
                  ? `?tab=sessions&week=${weekStr}`
                  : `?tab=sessions&week=${weekStr}&day=${dateStr}`
                return (
                  <div key={dateStr} style={{
                    borderRadius: 14, border: '2px solid',
                    minHeight: 130, padding: 10,
                    background: isSelected ? 'rgba(212,102,122,0.08)' : isToday ? 'rgba(212,102,122,0.04)' : 'var(--bg-card)',
                    borderColor: isSelected ? '#d4667a' : isToday ? 'rgba(212,102,122,0.3)' : 'var(--border)',
                  }}>
                    <Link href={dayHref} style={{ display: 'block', textDecoration: 'none', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, margin: 0, color: isToday ? '#d4667a' : 'var(--txt2)' }}>
                            {DAY_NAMES_WEEK[day.getDay()]}
                          </p>
                          <p style={{ fontSize: 20, fontWeight: 700, margin: '1px 0 0', color: isToday ? '#d4667a' : 'var(--txt1)', lineHeight: 1 }}>
                            {format(day, 'dd')}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          {isToday && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 7px',
                              background: '#d4667a', color: '#fff', borderRadius: 10,
                            }}>
                              {L.today}
                            </span>
                          )}
                          {daySessions.length > 0 && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 6px',
                              background: isSelected ? '#d4667a20' : 'var(--bg-page)',
                              color: isSelected ? '#d4667a' : 'var(--txt2)',
                              border: `1px solid ${isSelected ? '#d4667a40' : 'var(--border)'}`,
                              borderRadius: 8,
                            }}>
                              {daySessions.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {daySessions.map((s: any) => {
                        const bg     = s.status === 'completed' ? '#3dab7e15' : s.status === 'cancelled' ? '#e0404015' : '#7c3aed15'
                        const border = s.status === 'completed' ? '#3dab7e30' : s.status === 'cancelled' ? '#e0404030' : '#7c3aed30'
                        const color  = s.status === 'completed' ? '#3dab7e'   : s.status === 'cancelled' ? '#e04040'   : '#7c3aed'
                        return (
                          <div key={s.id} style={{
                            borderRadius: 7, padding: '5px 8px',
                            background: bg, border: `1px solid ${border}`, color, fontSize: 11,
                          }}>
                            <p style={{ margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.class?.name}
                            </p>
                            <p style={{ margin: '2px 0 0', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {fmt12h(s.class?.start_time)}
                              {s.hall?.name ? ` · ${s.hall.name}` : ''}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Day Detail Panel ── */}
          {selectedDay && (
            <div>
              {/* Panel header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt2)' }}>
                    {dayDetail.length} {isRtl ? 'مجموعة' : 'group(s)'}
                    {' · '}
                    {dayDetail.reduce((t: number, s: any) => t + (s.class?.class_students?.length || 0), 0)} {isRtl ? 'طالبة' : 'student(s)'}
                  </p>
                </div>
                <Link href={`?tab=sessions&week=${weekStr}`} style={{
                  fontSize: 12, color: 'var(--txt2)', textDecoration: 'none',
                  padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', fontWeight: 600,
                }}>✕ {isRtl ? 'إغلاق' : 'Close'}</Link>
              </div>

              {dayDetail.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txt2)', fontSize: 13 }}>
                  {selectedDay === todayStr ? L.noSessionsToday : L.noSessions}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {dayDetail.map((session: any) => {
                    const cls      = session.class
                    const students = cls?.class_students || []
                    const statusColor = session.status === 'completed' ? '#3dab7e' : session.status === 'cancelled' ? '#e04040' : '#7c3aed'
                    const statusBg    = session.status === 'completed' ? '#3dab7e18' : session.status === 'cancelled' ? '#e0404018' : '#7c3aed18'
                    const needsPayCount = students.filter((cs: any) => {
                      const sub = cs.student?.subscriptions?.find((x: any) => x.status === 'active')
                      return sub && (!sub.start_date || selectedDay >= sub.start_date) && sub.remaining_sessions === 0
                    }).length
                    return (
                      <div key={session.id} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 14, overflow: 'hidden',
                        borderTop: `3px solid ${statusColor}`,
                      }}>
                        {/* Session header */}
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{cls?.name}</p>
                              {cls?.level?.name && (
                                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)' }}>{cls.level.name}</p>
                              )}
                            </div>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                              background: statusBg, color: statusColor, border: `1px solid ${statusColor}30`,
                            }}>
                              {session.status === 'completed' ? (isRtl ? 'منتهية' : 'Completed') :
                               session.status === 'cancelled' ? (isRtl ? 'ملغية' : 'Cancelled') :
                               (isRtl ? 'مجدولة' : 'Scheduled')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {/* Time */}
                            {cls?.start_time && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--txt2)' }}>
                                <Clock size={12} style={{ color: '#d4667a' }} />
                                <span style={{ fontWeight: 600, color: 'var(--txt1)' }}>
                                  {fmt12h(cls.start_time)} – {fmt12h(cls.end_time)}
                                </span>
                              </span>
                            )}
                            {/* Coach */}
                            {(cls?.default_coach?.name_ar || cls?.default_coach?.name_en) && (
                              <span style={{ fontSize: 12, color: 'var(--txt2)' }}>
                                {isRtl ? cls.default_coach.name_ar : (cls.default_coach.name_en || cls.default_coach.name_ar)}
                              </span>
                            )}
                          </div>
                          {/* Summary pills */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                              background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--txt2)',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <Users size={11} /> {students.length} {isRtl ? 'طالبة' : 'students'}
                            </span>
                            {needsPayCount > 0 && (
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                                background: '#f5a62315', color: '#f5a623', border: '1px solid #f5a62330',
                              }}>
                                ⚠ {needsPayCount} {isRtl ? 'مطلوب دفع' : 'need payment'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Students list */}
                        <div>
                          {students.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt2)', fontSize: 12 }}>
                              {L.noStudents}
                            </div>
                          ) : (
                            students.map((cs: any, idx: number) => {
                              const student   = cs.student
                              if (!student) return null
                              const name      = isRtl || !student.name_en ? student.name_ar : student.name_en
                              const initial   = (student.name_ar || '').charAt(0)
                              const activeSub = student.subscriptions?.find((x: any) => x.status === 'active')
                              const subStarted = !activeSub?.start_date || (selectedDay || '') >= activeSub.start_date
                              const needsPayment = !!activeSub && subStarted && activeSub.remaining_sessions === 0
                              const remaining    = activeSub?.remaining_sessions ?? null
                              return (
                                <div key={student.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '9px 18px',
                                  borderBottom: idx < students.length - 1 ? '1px solid var(--border)' : 'none',
                                  background: needsPayment ? 'rgba(245,166,35,0.04)' : 'transparent',
                                }}>
                                  <div style={{
                                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                    background: needsPayment ? '#f5a62318' : '#d4667a18',
                                    border: `1px solid ${needsPayment ? '#f5a62330' : '#d4667a28'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 700,
                                    color: needsPayment ? '#f5a623' : '#d4667a',
                                  }}>
                                    {initial}
                                  </div>
                                  <span style={{ flex: 1, fontSize: 13, color: 'var(--txt1)', fontWeight: 500 }}>{name}</span>
                                  {needsPayment ? (
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                      background: '#f5a62318', color: '#f5a623', border: '1px solid #f5a62330',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {L.payRequired}
                                    </span>
                                  ) : remaining !== null && (
                                    <span style={{
                                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                                      background: remaining <= 2 ? '#e0404015' : '#3dab7e15',
                                      color: remaining <= 2 ? '#e04040' : '#3dab7e',
                                      border: `1px solid ${remaining <= 2 ? '#e0404025' : '#3dab7e25'}`,
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {remaining} {isRtl ? 'حصة' : 'left'}
                                    </span>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
