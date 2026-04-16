import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, MapPin, Clock, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('*, class:classes(*, level:levels(name)), hall:halls(name), coach:coaches(name_ar, name_en)')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*, student:students(name_ar, name_en, level:levels(name))')
    .eq('session_id', id)

  const { data: coachAttendance } = await supabase
    .from('coach_attendance')
    .select('*, coach:coaches(name_ar)')
    .eq('session_id', id)

  const present = attendance?.filter(a => a.status === 'present').length || 0
  const absent = attendance?.filter(a => a.status === 'absent').length || 0
  const makeup = attendance?.filter(a => a.status === 'make_up').length || 0

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/sessions" className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowRight size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{session.class?.name}</h1>
            <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
              session.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
              session.status === 'cancelled' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
              'text-violet-400 bg-violet-500/10 border-violet-500/20'
            }`}>
              {session.status === 'completed' ? 'منتهية' : session.status === 'cancelled' ? 'ملغية' : 'مجدولة'}
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">
            {formatDate(session.date)} • {session.hall?.name} • {session.class?.start_time?.slice(0,5)}–{session.class?.end_time?.slice(0,5)}
          </p>
        </div>
        <Link
          href={`/dashboard/attendance?session=${id}&date=${session.date}`}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-pink-700 transition-all"
        >
          <CheckCircle2 size={15} />
          تسجيل الحضور
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
            <h2 className="text-white/60 text-sm uppercase tracking-wider mb-4">إحصائيات الحصة</h2>
            <div className="space-y-3">
              {[
                { label: 'حاضرة', value: present, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'غائبة', value: absent, color: 'text-red-400', bg: 'bg-red-500/10' },
                { label: 'تعويض', value: makeup, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'الإجمالي', value: (attendance?.length || 0), color: 'text-white', bg: 'bg-white/8' },
              ].map(stat => (
                <div key={stat.label} className={`flex items-center justify-between ${stat.bg} rounded-xl px-4 py-3`}>
                  <span className="text-white/60 text-sm">{stat.label}</span>
                  <span className={`font-bold text-lg ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coach attendance */}
          <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
            <h2 className="text-white/60 text-sm uppercase tracking-wider mb-4">المدربات</h2>
            {coachAttendance && coachAttendance.length > 0 ? (
              <div className="space-y-3">
                {coachAttendance.map(ca => (
                  <div key={ca.id} className="bg-white/3 rounded-xl p-3">
                    <p className="text-white text-sm font-medium">{ca.coach?.name_ar}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {ca.check_in_time ? new Date(ca.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        {' → '}
                        {ca.check_out_time ? new Date(ca.check_out_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '...'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border ${
                        ca.location_status === 'valid'
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                      }`}>
                        <MapPin size={9} className="inline ml-0.5" />
                        {ca.location_status === 'valid' ? 'صحيح' : 'مشكوك'}
                      </span>
                    </div>
                    {ca.hours_worked && (
                      <p className="text-violet-400 text-xs mt-1">{ca.hours_worked} ساعة عمل</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/20 text-sm">لم تسجل أي مدربة حضورها</p>
            )}
          </div>
        </div>

        {/* Attendance list */}
        <div className="xl:col-span-2 bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-white font-semibold">سجل الحضور</h2>
          </div>
          <div className="divide-y divide-white/5">
            {attendance?.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {a.student?.name_ar[0]}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{a.student?.name_ar}</p>
                  <p className="text-white/30 text-xs">{a.student?.name_en}</p>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                  a.status === 'present' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  a.status === 'absent' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                  'text-blue-400 bg-blue-500/10 border-blue-500/20'
                }`}>
                  {a.status === 'present' ? 'حاضرة' : a.status === 'absent' ? 'غائبة' : 'تعويض'}
                </span>
              </div>
            ))}
            {(!attendance || attendance.length === 0) && (
              <div className="text-center py-12 text-white/20 text-sm">
                لم يُسجَّل حضور بعد
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
