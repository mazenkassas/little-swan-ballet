'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteStaff(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return {}
}

export async function toggleStaffActive(id: string, current: boolean): Promise<void> {
  const supabase = await createClient()
  await supabase.from('staff').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/staff')
}
