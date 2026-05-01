'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function transferStudent(
  studentId: string,
  fromClassId: string | null,
  toClassId: string,
  notes: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  if (fromClassId) {
    const { error: delErr } = await supabase
      .from('class_students')
      .delete()
      .eq('student_id', studentId)
      .eq('class_id', fromClassId)
    if (delErr) return { error: delErr.message }
  }

  const { error: insErr } = await supabase
    .from('class_students')
    .insert({ student_id: studentId, class_id: toClassId })
  if (insErr) return { error: insErr.message }

  if (fromClassId) {
    await supabase.from('student_transfers').insert({
      student_id:    studentId,
      from_class_id: fromClassId,
      to_class_id:   toClassId,
      status:        'approved',
      request_date:  new Date().toISOString().split('T')[0],
      decision_date: new Date().toISOString().split('T')[0],
      notes:         notes || null,
    })
  }

  revalidatePath('/dashboard/students')
  return {}
}
