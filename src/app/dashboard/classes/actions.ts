'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteClass(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('classes').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/classes')
  return {}
}
