'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function toSlug(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export async function addPaymentMethod(data: {
  name: string; name_ar: string; slug: string
  color: string; icon: string
}) {
  const { name, name_ar, color, icon } = data
  const slug = toSlug(data.slug || name)
  if (!name.trim() || !name_ar.trim() || !slug) return { error: 'All fields are required' }

  const supabase = await createClient()
  const { error } = await supabase.from('payment_methods').insert({ name: name.trim(), name_ar: name_ar.trim(), slug, color, icon })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/payment-types')
  return { success: true }
}

export async function updatePaymentMethod(id: string, data: {
  name: string; name_ar: string; color: string; icon: string; is_active: boolean
}) {
  const { name, name_ar, color, icon, is_active } = data
  if (!name.trim() || !name_ar.trim()) return { error: 'Name fields are required' }

  const supabase = await createClient()
  const { error } = await supabase.from('payment_methods')
    .update({ name: name.trim(), name_ar: name_ar.trim(), color, icon, is_active })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/payment-types')
  return { success: true }
}

export async function deletePaymentMethod(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('payment_methods').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/payment-types')
  return { success: true }
}

export async function togglePaymentMethod(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('payment_methods').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/payment-types')
  return { success: true }
}
