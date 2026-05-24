import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import EditExamForm from './EditExamForm'

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .single()

  if (!exam) notFound()

  const { data: targets } = await supabase
    .from('exam_targets')
    .select('grade_id, term_id')
    .eq('exam_id', id)

  const [{ data: grades }, { data: terms }] = await Promise.all([
    supabase.from('grades').select('*'),
    supabase.from('terms').select('*').order('name'),
  ])

  return (
    <EditExamForm
      exam={exam}
      existingTargets={targets ?? []}
      grades={grades ?? []}
      terms={terms ?? []}
      isRtl={isRtl}
    />
  )
}
