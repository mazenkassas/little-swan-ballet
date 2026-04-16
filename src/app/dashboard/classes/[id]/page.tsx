import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Users, Clock, Calendar } from 'lucide-react'
import EnrollStudentForm from './EnrollStudentForm'

const DAYS_AR: Record<string, string> = {
  Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cls } = await supabase
    .from('classes')
    .select('*, level:levels(*), hall:halls(*), default_coach:coaches(*)')
    .eq('id', id)
    .single()

  if (!cls) notFound()

  const { data: enrolled } = await supabase
    .from('class_students')
    .select('*, student:students(*, level:levels(name))')
    .eq('class_id', id)
    .order('enrolled_date', { ascending: false })

  // Students not yet enrolled in this class
  const enrolledIds = enrolled?.map(e => e.student_id) || []
  let availableQuery = supabase.from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar')
  if (enrolledIds.length > 0) {
    availableQuery = availableQuery.not('id', 'in', `(${enrolledIds.join(',')})`)
  }
  const { data: available } = await availableQuery

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/classes" className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowRight size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{cls.name}</h1>
          <p className="text-white/40 text-sm mt-1">
            {cls.level?.name} • {cls.hall?.name} • {cls.days_of_week?.map((d: string) => DAYS_AR[d] || d).join(', ')} • {cls.start_time?.slice(0,5)}–{cls.end_time?.slice(0,5)}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <Users size={15} className="text-white/40" />
          <span className="text-white/60 text-sm">{enrolled?.length || 0} / {cls.max_capacity}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Enrolled students */}
        <div className="xl:col-span-2 bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-white font-semibold">الطالبات المسجلات ({enrolled?.length || 0})</h2>
          </div>
          <div className="divide-y divide-white/5">
            {enrolled?.map((e: any) => (
              <div key={e.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {e.student?.name_ar[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/dashboard/students/${e.student_id}`} className="text-white text-sm font-medium hover:text-rose-400 transition-colors">
                    {e.student?.name_ar}
                  </Link>
                  <p className="text-white/30 text-xs mt-0.5">{e.student?.level?.name || 'بدون مستوى'}</p>
                </div>
                <span className="text-white/20 text-xs">
                  {new Date(e.enrolled_date).toLocaleDateString('ar-EG')}
                </span>
                <UnenrollButton classStudentId={e.id} />
              </div>
            ))}
            {(!enrolled || enrolled.length === 0) && (
              <div className="text-center py-12 text-white/20 text-sm">
                لا توجد طالبات مسجلات في هذا الفصل
              </div>
            )}
          </div>
        </div>

        {/* Enroll new student */}
        <EnrollStudentForm classId={id} students={available || []} currentCount={enrolled?.length || 0} maxCapacity={cls.max_capacity} />
      </div>
    </div>
  )
}

function UnenrollButton({ classStudentId }: { classStudentId: string }) {
  return (
    <form action={async () => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('class_students').delete().eq('id', classStudentId)
    }}>
      <button type="submit" className="text-red-400/50 hover:text-red-400 text-xs transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
        حذف
      </button>
    </form>
  )
}
