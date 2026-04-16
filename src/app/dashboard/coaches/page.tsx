import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, MapPin, Clock } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default async function CoachesPage() {
  const supabase = await createClient()
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: coaches } = await supabase
    .from('coaches')
    .select('*')
    .eq('is_active', true)
    .order('name_ar')

  // Get monthly hours for each coach
  const { data: attendance } = await supabase
    .from('coach_attendance')
    .select('coach_id, hours_worked, location_status')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)
    .not('hours_worked', 'is', null)

  const coachHours: Record<string, { hours: number; flagged: number }> = {}
  attendance?.forEach(a => {
    if (!coachHours[a.coach_id]) coachHours[a.coach_id] = { hours: 0, flagged: 0 }
    coachHours[a.coach_id].hours += a.hours_worked || 0
    if (a.location_status === 'invalid') coachHours[a.coach_id].flagged++
  })

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">المدربات</h1>
          <p className="text-white/40 text-sm mt-1">إدارة المدربات والمرتبات — {format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <Link
          href="/dashboard/coaches/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          إضافة مدربة
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {coaches?.map((coach: any) => {
          const stats = coachHours[coach.id] || { hours: 0, flagged: 0 }
          const monthlySalary = stats.hours * coach.hourly_rate

          return (
            <Link
              key={coach.id}
              href={`/dashboard/coaches/${coach.id}`}
              className="bg-white/5 border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {coach.name_ar[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{coach.name_ar}</p>
                    <p className="text-white/40 text-sm">{coach.name_en}</p>
                  </div>
                </div>
                {stats.flagged > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                    <MapPin size={10} />
                    {stats.flagged} مشكوك
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/3 rounded-xl p-3 text-center">
                  <p className="text-white/40 text-xs mb-1 flex items-center justify-center gap-1">
                    <Clock size={10} />
                    ساعات الشهر
                  </p>
                  <p className="text-white font-bold text-lg">{stats.hours.toFixed(1)}</p>
                </div>
                <div className="bg-white/3 rounded-xl p-3 text-center">
                  <p className="text-white/40 text-xs mb-1">المرتب المتوقع</p>
                  <p className="text-emerald-400 font-bold">{monthlySalary.toFixed(0)} جنيه</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
                <span>{coach.hourly_rate} جنيه/ساعة</span>
                <span>{coach.phone || '—'}</span>
              </div>
            </Link>
          )
        })}
        {(!coaches || coaches.length === 0) && (
          <div className="col-span-3 text-center py-16 text-white/20">
            <p>لا توجد مدربات</p>
          </div>
        )}
      </div>
    </div>
  )
}
