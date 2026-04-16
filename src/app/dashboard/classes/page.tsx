import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Clock, Users } from 'lucide-react'

export default async function ClassesPage() {
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('classes')
    .select(`
      *,
      level:levels(name),
      hall:halls(name),
      default_coach:coaches(name_ar),
      enrolled_count:class_students(count)
    `)
    .eq('is_active', true)
    .order('start_time')

  const DAYS_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
  }

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">الفصول</h1>
          <p className="text-white/40 text-sm mt-1">{classes?.length || 0} فصل نشط</p>
        </div>
        <Link
          href="/dashboard/classes/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          إضافة فصل
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {classes?.map((cls: any) => {
          const enrolled = cls.enrolled_count?.[0]?.count || 0
          const pct = Math.round((enrolled / cls.max_capacity) * 100)
          return (
            <Link
              key={cls.id}
              href={`/dashboard/classes/${cls.id}`}
              className="bg-white/5 border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all hover:scale-[1.01] group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">{cls.name}</h3>
                  <p className="text-white/40 text-sm mt-0.5">{cls.level?.name || 'بدون مستوى'}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  {cls.hall?.name}
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-white/50">
                  <Clock size={14} className="text-white/30" />
                  {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                </div>
                <div className="flex items-center gap-2 text-white/50">
                  <span className="text-white/30 text-xs">أيام:</span>
                  <span className="text-white/60">
                    {cls.days_of_week?.map((d: string) => DAYS_AR[d] || d).join(' • ')}
                  </span>
                </div>
                {cls.default_coach && (
                  <div className="text-white/40 text-xs">
                    مدربة: {cls.default_coach.name_ar}
                  </div>
                )}
              </div>

              {/* Capacity bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-white/30 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {enrolled} / {cls.max_capacity}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="bg-white/10 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </Link>
          )
        })}

        {(!classes || classes.length === 0) && (
          <div className="col-span-3 text-center py-16 text-white/20">
            <p className="text-lg">لا توجد فصول</p>
            <p className="text-sm mt-1">ابدأ بإضافة أول فصل</p>
          </div>
        )}
      </div>
    </div>
  )
}
