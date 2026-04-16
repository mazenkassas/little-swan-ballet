import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, BookOpen, Trophy, ChevronRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function ExamsPage() {
  const supabase = await createClient()

  const { data: exams } = await supabase
    .from('exams')
    .select('*, level:levels(name), student_exams:student_exams(id, result)')
    .order('date', { ascending: false })

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">الامتحانات</h1>
          <p className="text-white/40 text-sm mt-1">إدارة الامتحانات والترقي للمستويات</p>
        </div>
        <Link
          href="/dashboard/exams/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          إنشاء امتحان
        </Link>
      </div>

      <div className="space-y-4">
        {exams?.map((exam: any) => {
          const passed = exam.student_exams?.filter((e: any) => e.result === 'pass').length || 0
          const failed = exam.student_exams?.filter((e: any) => e.result === 'fail').length || 0
          const pending = exam.student_exams?.filter((e: any) => e.result === 'pending').length || 0
          const total = exam.student_exams?.length || 0

          return (
            <Link
              key={exam.id}
              href={`/dashboard/exams/${exam.id}`}
              className="flex items-center gap-5 bg-white/5 border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                <BookOpen size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-semibold">{exam.name}</h3>
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                    {exam.level?.name || 'جميع المستويات'}
                  </span>
                </div>
                <p className="text-white/40 text-sm mt-1">
                  {formatDate(exam.date)} • رسوم: {formatCurrency(exam.fee)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="text-emerald-400 font-bold text-lg">{passed}</p>
                  <p className="text-white/30 text-xs">ناجح</p>
                </div>
                <div className="text-center">
                  <p className="text-red-400 font-bold text-lg">{failed}</p>
                  <p className="text-white/30 text-xs">راسب</p>
                </div>
                <div className="text-center">
                  <p className="text-white/50 font-bold text-lg">{pending}</p>
                  <p className="text-white/30 text-xs">لم يسجل</p>
                </div>
                <ChevronRight size={16} className="text-white/20" />
              </div>
            </Link>
          )
        })}
        {(!exams || exams.length === 0) && (
          <div className="text-center py-16 text-white/20 bg-white/3 rounded-2xl">
            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد امتحانات</p>
          </div>
        )}
      </div>
    </div>
  )
}
