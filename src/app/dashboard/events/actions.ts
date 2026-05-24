'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  await supabase.from('event_enrollments').delete().eq('event_id', id)
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/events')
  return {}
}

export async function updateEvent(
  id: string,
  data: { name: string; type: string; date: string; price: number; payment_deadline: string; venue?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('events').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/events')
  revalidatePath(`/dashboard/events/${id}`)
  return {}
}
