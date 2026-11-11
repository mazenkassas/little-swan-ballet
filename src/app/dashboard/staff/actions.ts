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

export type StaffInput = {
  name: string
  name_en: string
  email: string
  role: string
  phone: string
  monthly_salary?: number
}

export async function createStaff(
  input: StaffInput & { password: string },
): Promise<{ error?: string }> {
  const denied = await requireManager('staff')
  if (denied) return { error: denied }
  if (!input.password || input.password.length < 6) return { error: 'Password must be at least 6 characters' }

  const supabase = await createClient()
  const admin = createAdminClient()
  const email = normalizeEmail(input.email)

  const auth = await createLoginUser(admin, email, input.password)
  if (auth.error) return { error: auth.error }

  const row: Record<string, unknown> = {
    name: input.name,
    name_en: input.name_en,
    email,
    role: input.role,
    phone: input.phone,
    is_active: true,
    password_hash: AUTH_MANAGED,
  }
  if (input.monthly_salary != null) row.monthly_salary = input.monthly_salary

  const { error } = await supabase.from('staff').insert(row)
  if (error) {
    if (auth.created) await admin.auth.admin.deleteUser(auth.created.id)
    return { error: error.message }
  }

  revalidatePath('/dashboard/staff')
  return {}
}

export async function updateStaff(
  id: string,
  input: StaffInput & { password?: string; is_active: boolean },
): Promise<{ error?: string }> {
  const denied = await requireManager('staff')
  if (denied) return { error: denied }
  if (input.password && input.password.length < 6) return { error: 'Password must be at least 6 characters' }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: current, error: readErr } = await supabase
    .from('staff').select('email').eq('id', id).single()
  if (readErr || !current) return { error: readErr?.message ?? 'Staff member not found' }

  const email = normalizeEmail(input.email)

  const auth = await updateLoginUser(admin, current.email, {
    email,
    password: input.password || undefined,
    active: input.is_active,
  })
  if (auth.error) return { error: auth.error }

  const row: Record<string, unknown> = {
    name: input.name,
    name_en: input.name_en,
    role: input.role,
    email,
    phone: input.phone,
    is_active: input.is_active,
    password_hash: AUTH_MANAGED,
  }
  if (input.monthly_salary != null) row.monthly_salary = input.monthly_salary

  const { error } = await supabase.from('staff').update(row).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/staff')
  revalidatePath(`/dashboard/staff/${id}`)
  return {}
}

export async function deleteStaff(id: string): Promise<{ error?: string }> {
  const denied = await requireManager('staff')
  if (denied) return { error: denied }

  const supabase = await createClient()
  const { data: staff } = await supabase.from('staff').select('email').eq('id', id).maybeSingle()
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) return { error: error.message }

  if (staff?.email) await deleteLoginUserIfUnused(createAdminClient(), staff.email)

  revalidatePath('/dashboard/staff')
  return {}
}

export async function toggleStaffActive(id: string, current: boolean): Promise<void> {
  if (await requireManager('staff')) return
  const supabase = await createClient()
  const { data: staff } = await supabase
    .from('staff').update({ is_active: !current }).eq('id', id).select('email').maybeSingle()
  if (staff?.email) await setLoginActive(createAdminClient(), staff.email, !current)
  revalidatePath('/dashboard/staff')
}
