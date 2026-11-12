import DashboardShell from '@/components/layout/DashboardShell'
import { emailPattern } from '@/lib/emailMatch'
import ClockTracker from '@/components/layout/ClockTracker'
import ThemeToggle from '@/components/layout/ThemeToggle'
import LanguageToggle from '@/components/layout/LanguageToggle'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GRANTABLE_PAGES, canViewPage, parseRolePerms } from '@/lib/rolePermissions'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  coach: 'Coach',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Coaches have a separate portal — redirect them out of the admin dashboard
  if (user.email) {
    const { data: coachRecord } = await supabase
      .from('coaches')
      .select('id')
      .ilike('email', emailPattern(user.email))
      .eq('can_login', true)
      .eq('is_active', true)
      .maybeSingle()
    if (coachRecord) redirect('/coach')
  }

  // Real role from the staff table; drives which sidebar links are shown
  // (the same rules src/proxy.ts uses to guard the routes).
  const [{ data: me }, { data: permSetting }] = await Promise.all([
    supabase.from('staff').select('name, role').ilike('email', emailPattern(user.email)).maybeSingle(),
    supabase.from('system_settings').select('value').eq('key', 'role_permissions').maybeSingle(),
  ])
  const staffRole: string = me?.role ?? ''
  const perms = parseRolePerms(permSetting?.value, staffRole)
  const visiblePages = staffRole === 'super_admin'
    ? null // everything
    : GRANTABLE_PAGES.filter(p => canViewPage(staffRole, perms, p))

  const displayName = me?.name ||user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'مستخدم'
  const role = ROLE_LABELS[staffRole] || staffRole || 'مشرف'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <DashboardShell
      user={{ displayName, role, email: user.email || '', initials }}
      visiblePages={visiblePages}
      topbarActions={<><LanguageToggle /><ThemeToggle /></>}
    >
      <ClockTracker />
      {children}
    </DashboardShell>
  )
}
