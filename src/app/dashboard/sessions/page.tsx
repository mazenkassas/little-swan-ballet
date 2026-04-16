import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Calendar, Zap } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import GenerateSessionsButton from './GenerateSessionsButton'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const weekStart = params.week
    ? new Date(params.week)
    : startOfWeek(new Date(), { weekStartsOn: 0 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, class:classes(name, start_time, end_time, level:levels(name)), hall:halls(name), coach:coaches(name_ar)')
    .gte('date', format(weekStart, 'yyyy-MM-dd'))
    .lte('date', format(weekEnd, 'yyyy-MM-dd'))
    .order('date')
    .order('created_at')

  // Group by date
  const grouped: Record<string, any[]> = {}
  sessions?.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = []
    grouped[s.date].push(s)
  })

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const prevWeek = format(addDays(weekStart, -7), 'yyyy-MM-dd')
  const nextWeek = format(addDays(weekStart, 7), 'yyyy-MM-dd')

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">الحصص</h1>
          <p className="text-white/40 text-sm mt-1">عرض وإدارة الحصص الأسبوعية</p>
        </div>
        <div className="flex gap-3">
          <GenerateSessionsButton weekStart={format(weekStart, 'yyyy-MM-dd')} weekEnd={format(weekEnd, 'yyyy-MM-dd')} />
          <Link
            href="/dashboard/sessions/new"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Plus size={16} />
            حصة يدوية
          </Link>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between mb-6">
        <Link href={`?week=${prevWeek}`} className="text-white/40 hover:text-white/70 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm">
          ← الأسبوع السابق
        </Link>
        <div className="text-white font-medium text-sm">
          {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
        </div>
        <Link href={`?week=${nextWeek}`} className="text-white/40 hover:text-white/70 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm">
          الأسبوع القادم →
        </Link>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const daySessions = grouped[dateStr] || []
          const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border min-h-32 p-3 ${
                isToday ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/3 border-white/8'
              }`}
            >
              <div className={`text-center mb-3 ${isToday ? 'text-rose-400' : 'text-white/40'}`}>
                <p className="text-xs font-medium">
                  {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][day.getDay()]}
                </p>
                <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-rose-400' : 'text-white/70'}`}>
                  {format(day, 'dd')}
                </p>
              </div>
              <div className="space-y-1.5">
                {daySessions.map(s => (
                  <Link
                    key={s.id}
                    href={`/dashboard/sessions/${s.id}`}
                    className={`block rounded-lg px-2.5 py-2 text-xs transition-all hover:opacity-80 ${
                      s.status === 'completed' ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400' :
                      s.status === 'cancelled' ? 'bg-red-500/15 border border-red-500/20 text-red-400' :
                      'bg-violet-500/15 border border-violet-500/20 text-violet-400'
                    }`}
                  >
                    <p className="font-medium truncate">{s.class?.name}</p>
                    <p className="opacity-60 mt-0.5">{s.hall?.name}</p>
                    <p className="opacity-50 mt-0.5">{s.class?.start_time?.slice(0,5)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
