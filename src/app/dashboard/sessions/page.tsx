import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, getDay } from 'date-fns'
import GenerateSessionsButton from './GenerateSessionsButton'
import { getTranslations, getLocale } from 'next-intl/server'

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const t = await getTranslations('sessions')
  const tc = await getTranslations('common')
  const locale = await getLocale()
  const params = await searchParams
  const supabase = await createClient()

  const weekStart = params.week
    ? new Date(params.week)
    : startOfWeek(new Date(), { weekStartsOn: 0 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr   = format(weekEnd,   'yyyy-MM-dd')

  // Auto-generate sessions for any active class that has no session this week
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
      (existingSessions || []).map(s => `${s.class_id}|${s.date}`)
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

    if (toInsert.length) {
      await supabase.from('sessions').insert(toInsert)
    }
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, class:classes(name, start_time, end_time, level:levels(name)), hall:halls(name), coach:coaches(name_ar)')
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
    .order('date')
    .order('created_at')

  const grouped: Record<string, any[]> = {}
  sessions?.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = []
    grouped[s.date].push(s)
  })

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const prevWeek = format(addDays(weekStart, -7), 'yyyy-MM-dd')
  const nextWeek = format(addDays(weekStart, 7), 'yyyy-MM-dd')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ padding: 32, background: 'var(--bg-page)', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 4 }}>{t('subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <GenerateSessionsButton weekStart={format(weekStart, 'yyyy-MM-dd')} weekEnd={format(weekEnd, 'yyyy-MM-dd')} />
          <Link
            href="/dashboard/sessions/new"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--txt2)', fontWeight: 600, padding: '10px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 13 }}
          >
            <Plus size={16} />
            {t('manualSession')}
          </Link>
        </div>
      </div>

      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Link
          href={`?week=${prevWeek}`}
          style={{ color: 'var(--txt2)', padding: '8px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 13 }}
          className="hover:opacity-70 transition-opacity"
        >
          ← {tc('prevWeek')}
        </Link>
        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--txt1)' }}>
          {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
        </div>
        <Link
          href={`?week=${nextWeek}`}
          style={{ color: 'var(--txt2)', padding: '8px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 13 }}
          className="hover:opacity-70 transition-opacity"
        >
          {tc('nextWeek')} →
        </Link>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const daySessions = grouped[dateStr] || []
          const isToday = dateStr === todayStr

          return (
            <div
              key={dateStr}
              style={{
                borderRadius: 16,
                border: '1px solid',
                minHeight: 128,
                padding: 12,
                background: isToday ? 'rgba(244,63,94,0.08)' : 'var(--bg-card)',
                borderColor: isToday ? 'rgba(244,63,94,0.25)' : 'var(--border)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 12, color: isToday ? '#f43f5e' : 'var(--txt2)' }}>
                <p style={{ fontSize: 11, fontWeight: 500, margin: 0 }}>
                  {(locale === 'ar'
                    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
                    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  )[day.getDay()]}
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: isToday ? '#f43f5e' : 'var(--txt1)' }}>
                  {format(day, 'dd')}
                </p>
              </div>
              <div className="space-y-1.5">
                {daySessions.map(s => (
                  <div
                    key={s.id}
                    className={`block rounded-lg px-2.5 py-2 text-xs ${
                      s.status === 'completed' ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-500' :
                      s.status === 'cancelled' ? 'bg-red-500/15 border border-red-500/20 text-red-500' :
                      'bg-violet-500/15 border border-violet-500/20 text-violet-500'
                    }`}
                  >
                    <p className="font-medium truncate">{s.class?.name}</p>
                    <p className="opacity-60 mt-0.5">{s.hall?.name}</p>
                    <p className="opacity-50 mt-0.5">{s.class?.start_time?.slice(0, 5)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
