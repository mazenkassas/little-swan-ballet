'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AUTH_MANAGED,
  deleteLoginUserIfUnused,
  normalizeEmail,
  requireManager,
  setLoginActive,
  updateLoginUser,
  createLoginUser,
} from '@/lib/loginAccounts'
import { revalidatePath } from 'next/cache'

export type CoachInput = {
  name_ar: string
  name_en: string
  phone: string
  email: string
  hourly_rate: number
}

export async function createCoach(
  input: CoachInput & { password: string },
): Promise<{ error?: string }> {
  const denied = await requireManager('coaches', 'create')
  if (denied) return { error: denied }
  if (!input.password || input.password.length < 6) return { error: 'Password must be at least 6 characters' }

  const supabase = await createClient()
  const admin = createAdminClient()
  const email = normalizeEmail(input.email)

  // 1. Login account in Supabase Auth (this is what the login page checks)
  const auth = await createLoginUser(admin, email, input.password)
  if (auth.error) return { error: auth.error }

  // 2. Coach row
  const { error } = await supabase.from('coaches').insert({
    name_ar: input.name_ar,
    name_en: input.name_en,
    phone: input.phone,
    email,
    hourly_rate: input.hourly_rate,
    password_hash: AUTH_MANAGED,
    can_login: true,
  })
  if (error) {
    if (auth.created) await admin.auth.admin.deleteUser(auth.created.id)
    return { error: error.message }
  }

  revalidatePath('/dashboard/coaches')
  return {}
}

export async function updateCoach(
  id: string,
  input: CoachInput & { password?: string; is_active: boolean },
): Promise<{ error?: string }> {
  const denied = await requireManager('coaches')
  if (denied) return { error: denied }
  if (input.password && input.password.length < 6) return { error: 'Password must be at least 6 characters' }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: current, error: readErr } = await supabase
    .from('coaches').select('email').eq('id', id).single()
  if (readErr || !current) return { error: readErr?.message ?? 'Coach not found' }

  const email = normalizeEmail(input.email)

  const auth = await updateLoginUser(admin, current.email, {
    email,
    password: input.password || undefined,
    active: input.is_active,
  })
  if (auth.error) return { error: auth.error }

  const { error } = await supabase.from('coaches').update({
    name_ar: input.name_ar,
    name_en: input.name_en,
    phone: input.phone,
    email,
    hourly_rate: input.hourly_rate,
    is_active: input.is_active,
    password_hash: AUTH_MANAGED,
  }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/coaches')
  revalidatePath(`/dashboard/coaches/${id}`)
  return {}
}

export async function deleteCoach(id: string): Promise<{ error?: string }> {
  const denied = await requireManager('coaches', 'delete')
  if (denied) return { error: denied }

  const supabase = await createClient()
  const { data: coach } = await supabase.from('coaches').select('email').eq('id', id).maybeSingle()
  const { error } = await supabase.from('coaches').delete().eq('id', id)
  if (error) return { error: error.message }

  if (coach?.email) await deleteLoginUserIfUnused(createAdminClient(), coach.email)

  revalidatePath('/dashboard/coaches')
  return {}
}

export async function toggleCoachActive(id: string, current: boolean): Promise<void> {
  if (await requireManager('coaches')) return
  const supabase = await createClient()
  const { data: coach } = await supabase
    .from('coaches').update({ is_active: !current }).eq('id', id).select('email').maybeSingle()
  if (coach?.email) await setLoginActive(createAdminClient(), coach.email, !current)
  revalidatePath('/dashboard/coaches')
}
