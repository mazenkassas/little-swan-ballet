import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import ExamResultsForm from './ExamResultsForm'

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: exam } = await supabase
    .from('exams')
    .select('*, level:levels(*)')
    .eq('id', id)
    .single()

  if (!exam) notFound()

  // Get students at this level
  const { data: students } = await supabase
    .from('students')
    .select('id, name_ar, name_en, level:levels(id, name, order_num)')
    .eq('status', 'active')
    .eq('level_id', exam.level_id)

  // Get existing results
  const { data: existing } = await supabase
    .from('student_exams')
    .select('*')
    .eq('exam_id', id)

  // Get next level for promotion
  const { data: nextLevel } = await supabase
    .from('levels')
    .select('*')
    .eq('order_num', (exam.level?.order_num || 0) + 1)
    .single()

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/exams" className="text-white/30 hover:text-white/60">
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{exam.name}</h1>
          <p className="text-white/40 text-sm mt-1">
            {exam.level?.name} • {formatDate(exam.date)} • رسوم: {formatCurrency(exam.fee)}
            {nextLevel && <span className="text-emerald-400/70"> → ترقي إلى: {nextLevel.name}</span>}
          </p>
        </div>
      </div>

      <ExamResultsForm
        exam={exam}
        students={students || []}
        existingResults={existing || []}
        nextLevel={nextLevel}
      />
    </div>
  )
}
