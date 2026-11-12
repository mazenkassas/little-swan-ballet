import { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>
export type SubsAction = 'view' | 'edit'

/**
 * Who may use the Subscriptions page:
 *  - super_admin: always
 *  - other active staff roles: only if granted "subscriptions" on the Roles page
 *    (stored as JSON in system_settings.role_permissions).
 * Returns the caller's staff id when allowed, otherwise null.
 */
export async function checkSubscriptionsAccess(
  supabase: Supabase,
  action: SubsAction,
): Promise<{ staffId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const email = user.email.trim().replace(/[\\%_]/g, '\\$&')
  const { data: me } = await supabase
    .from('staff')
    .select('id, role, is_active')
    .ilike('email', email)
    .maybeSingle()
  if (!me || me.is_active === false) return null
  if (me.role === 'super_admin') return { staffId: me.id }

  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'role_permissions')
    .maybeSingle()
  try {
    const perms = JSON.parse(setting?.value || '{}')
    const p = perms?.[me.role]?.subscriptions
    const allowed = action === 'view' ? !!p?.view : !!(p?.edit || p?.create)
    return allowed ? { staffId: me.id } : null
  } catch {
    return null
  }
}

/** Today's date in the academy's time zone, as 'YYYY-MM-DD'. */
export function cairoToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}
