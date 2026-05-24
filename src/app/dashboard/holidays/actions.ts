'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addHoliday(data: {
  name: string
  start_date: string
  end_date: string
  student_ids: string[] | null
}) {
  const { name, start_date, end_date, student_ids } = data
  const today = new Date().toISOString().split('T')[0]

  if (!name?.trim() || !start_date || !end_date) return { error: 'Missing required fields' }
  if (start_date < today)    return { error: 'Start date cannot be in the past' }
  if (end_date < start_date) return { error: 'End date must be on or after start date' }

  const supabase = await createClient()
  const { error } = await supabase.from('holidays').insert({
    name: name.trim(),
    start_date,
    end_date,
    student_ids: student_ids && student_ids.length > 0 ? student_ids : null,
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/holidays')
  revalidatePath('/dashboard/daily')
  return { success: true }
}

export async function deleteHoliday(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/holidays')
  revalidatePath('/dashboard/daily')
  return { success: true }
}
