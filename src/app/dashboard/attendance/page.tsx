import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import AttendanceSheet from './AttendanceSheet'

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const today = params.date || format(new Date(), 'yyyy-MM-dd')

  // Get sessions for selected date
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, class:classes(name, level:levels(name)), hall:halls(name), coach:coaches(name_ar)')
    .eq('date', today)
    .order('created_at')

  // Get selected session details
  let selectedSession = null
  let enrolledStudents: any[] = []
  let existingAttendance: any[] = []

  if (params.session) {
    const { data: sess } = await supabase
      .from('sessions')
      .select('*, class:classes(*, level:levels(*)), hall:halls(*), coach:coaches(*)')
      .eq('id', params.session)
      .single()
    selectedSession = sess

    if (sess) {
      const { data: enrolled } = await supabase
        .from('class_students')
        .select('*, student:students(*, level:levels(name), subscriptions:subscriptions(remaining_sessions, status, total_sessions))')
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

  return (
    <div className="p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">تسجيل الحضور</h1>
        <p className="text-white/40 text-sm mt-1">سجّل حضور الطالبات لكل حصة</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">حصص اليوم</h2>
            <form>
              <input
                type="date"
                name="date"
                defaultValue={today}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/60 text-xs focus:outline-none focus:border-rose-500/60"
              />
            </form>
          </div>
          <div className="space-y-2">
            {sessions && sessions.length > 0 ? sessions.map((s: any) => (
              <a
                key={s.id}
                href={`?session=${s.id}&date=${today}`}
                className={`block rounded-xl px-4 py-3 transition-all border ${
                  params.session === s.id
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-white/3 border-white/5 text-white/70 hover:bg-white/6'
                }`}
              >
                <p className="text-sm font-medium">{s.class?.name}</p>
                <p className="text-xs opacity-60 mt-0.5">{s.hall?.name} • {s.coach?.name_ar || 'بدون مدربة'}</p>
                <span className={`text-xs mt-1.5 inline-block px-2 py-0.5 rounded-full border ${
                  s.status === 'completed' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                  s.status === 'cancelled' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                  'text-violet-400 border-violet-500/30 bg-violet-500/10'
                }`}>
                  {s.status === 'completed' ? 'منتهية' : s.status === 'cancelled' ? 'ملغية' : 'مجدولة'}
                </span>
              </a>
            )) : (
              <div className="text-center py-10 text-white/20">
                <p className="text-sm">لا توجد حصص لهذا اليوم</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Sheet */}
        <div className="xl:col-span-2">
          {selectedSession ? (
            <AttendanceSheet
              session={selectedSession}
              students={enrolledStudents}
              existingAttendance={existingAttendance}
            />
          ) : (
            <div className="bg-white/5 border border-white/8 rounded-2xl p-6 h-full flex items-center justify-center">
              <div className="text-center text-white/20">
                <p className="text-lg font-medium">اختر حصة من القائمة</p>
                <p className="text-sm mt-1">لتسجيل الحضور</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
