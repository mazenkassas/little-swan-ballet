// Server-only helpers that keep Supabase Auth users in sync with the
// `coaches` and `staff` tables. Login (src/app/login/page.tsx) authenticates
// against Supabase Auth, so every coach/staff member who should be able to
// log in needs a matching Auth user — the table row alone is not enough.
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Value stored in `password_hash`: the real password lives in Supabase Auth. */
export const AUTH_MANAGED = 'supabase_auth'

type Admin = ReturnType<typeof createAdminClient>

const BANNED_FOREVER = '876000h' // ~100 years

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

/**
 * Ensures the current user is an active staff member allowed to manage `page`
 * ('coaches' or 'staff'). Mirrors the access rules in src/proxy.ts.
 */
export async function requireManager(page: 'coaches' | 'staff'): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return 'Not signed in'

  const { data: me } = await supabase
    .from('staff')
    .select('role, is_active')
    .eq('email', user.email)
    .maybeSingle()

  if (!me || me.is_active === false) return 'Not allowed'
  if (me.role === 'super_admin') return null
  if (me.role === 'admin' || me.role === 'staff') {
    const { data: perm } = await supabase
      .from('role_permissions')
      .select('id')
      .eq('role', me.role)
      .eq('page', page)
      .maybeSingle()
    if (perm) return null
  }
  return 'Not allowed'
}

export async function findAuthUserByEmail(admin: Admin, email: string): Promise<User | null> {
  const target = normalizeEmail(email)
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const hit = data.users.find(u => u.email?.toLowerCase() === target)
    if (hit) return hit
    if (data.users.length < 1000) return null
  }
}

/**
 * Creates the Auth user for `email`. If a login with that email already exists
 * it is left untouched (its password is never overwritten) and an error is returned.
 */
export async function createLoginUser(
  admin: Admin,
  email: string,
  password: string,
): Promise<{ error?: string; created?: User }> {
  const existing = await findAuthUserByEmail(admin, email)
  if (existing) {
    return { error: 'A login account with this email already exists. Use a different email.' }
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: normalizeEmail(email),
    password,
    email_confirm: true,
  })
  return error ? { error: error.message } : { created: data.user ?? undefined }
}

/**
 * Applies an edit to an existing account: email change, optional new password,
 * and active/inactive (inactive accounts are banned so they cannot log in).
 * If no Auth user exists yet, one is created when a password is supplied.
 */
export async function updateLoginUser(
  admin: Admin,
  oldEmail: string,
  changes: { email: string; password?: string; active: boolean },
): Promise<{ error?: string }> {
  const existing = await findAuthUserByEmail(admin, oldEmail)
  if (!existing) {
    if (!changes.password) {
      return { error: 'This account has no login yet — enter a password to create one.' }
    }
    const r = await createLoginUser(admin, changes.email, changes.password)
    if (r.error) return r
    if (!changes.active && r.created) {
      await admin.auth.admin.updateUserById(r.created.id, { ban_duration: BANNED_FOREVER })
    }
    return {}
  }
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    email: normalizeEmail(changes.email),
    email_confirm: true,
    ...(changes.password ? { password: changes.password } : {}),
    ban_duration: changes.active ? 'none' : BANNED_FOREVER,
  })
  return error ? { error: error.message } : {}
}

export async function setLoginActive(admin: Admin, email: string, active: boolean) {
  const user = await findAuthUserByEmail(admin, email)
  if (!user) return
  await admin.auth.admin.updateUserById(user.id, {
    ban_duration: active ? 'none' : BANNED_FOREVER,
  })
}

/** Deletes the Auth user unless the email still belongs to another coach/staff row. */
export async function deleteLoginUserIfUnused(admin: Admin, email: string) {
  const e = normalizeEmail(email).replace(/[\\%_]/g, '\\$&') // literal match in ilike
  const [{ count: coachCount }, { count: staffCount }] = await Promise.all([
    admin.from('coaches').select('id', { count: 'exact', head: true }).ilike('email', e),
    admin.from('staff').select('id', { count: 'exact', head: true }).ilike('email', e),
  ])
  if ((coachCount ?? 0) + (staffCount ?? 0) > 0) return
  const user = await findAuthUserByEmail(admin, e)
  if (user) await admin.auth.admin.deleteUser(user.id)
}
