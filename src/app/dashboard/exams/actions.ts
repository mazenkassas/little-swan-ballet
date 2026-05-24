'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteExam(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  await supabase.from('exam_targets').delete().eq('exam_id', id)
  await supabase.from('student_exams').delete().eq('exam_id', id)
  const { error } = await supabase.from('exams').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/exams')
  return {}
}

export async function updateExam(
  id: string,
  data: { name: string; date: string; fee: number; payment_deadline: string },
  targets: { grade_id: string; term_id: string }[],
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('exams').update(data).eq('id', id)
  if (error) return { error: error.message }
  await supabase.from('exam_targets').delete().eq('exam_id', id)
  if (targets.length > 0) {
    await supabase.from('exam_targets').insert(targets.map(t => ({ exam_id: id, ...t })))
  }
  revalidatePath('/dashboard/exams')
  revalidatePath(`/dashboard/exams/${id}`)
  return {}
}
