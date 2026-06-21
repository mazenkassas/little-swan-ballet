'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextOrCurrentClassDate } from '@/lib/subscriptionLogic'

export async function deleteStudent(studentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Delete dependent rows before the student to satisfy FK constraints
  const deps = [
    'attendance',
    'class_students',
    'subscriptions',
    'freezes',
    'student_transfers',
  ] as const

  for (const table of deps) {
    const { error } = await supabase.from(table).delete().eq('student_id', studentId)
    if (error) return { error: `${table}: ${error.message}` }
  }

  const { error } = await supabase.from('students').delete().eq('id', studentId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/students')
  return {}
}

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

  // Rules 5 & 6: Re-anchor the active subscription to the new class.
  // - Always update class_id so future session deductions count against the right group.
  // - If the cycle is already expired (remaining = 0), also recalculate next_cycle_start
  //   so the late-payment backdating uses the new group's first session, not the old one's.
  if (fromClassId) {
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id, remaining_sessions')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .or(`class_id.eq.${fromClassId},class_id.is.null`)   // handle legacy subs too
      .maybeSingle()

    if (activeSub) {
      const updates: Record<string, any> = { class_id: toClassId }

      if (activeSub.remaining_sessions === 0) {
        const { data: newClass } = await supabase
          .from('classes')
          .select('days_of_week')
          .eq('id', toClassId)
          .single()

        if (newClass?.days_of_week?.length) {
          updates.next_cycle_start = getNextOrCurrentClassDate(
            newClass.days_of_week as string[],
            new Date()
          )
        }
      }

      await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', activeSub.id)
    }
  }

  revalidatePath('/dashboard/students')
  return {}
}
