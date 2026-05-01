'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteCoach(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('coaches').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/coaches')
  return {}
}

export async function toggleCoachActive(id: string, current: boolean): Promise<void> {
  const supabase = await createClient()
  await supabase.from('coaches').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/coaches')
}
