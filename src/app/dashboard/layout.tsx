import DashboardShell from '@/components/layout/DashboardShell'
import ThemeToggle from '@/components/layout/ThemeToggle'
import LanguageToggle from '@/components/layout/LanguageToggle'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Coaches have a separate portal — redirect them out of the admin dashboard
  if (user.email) {
    const { data: coachRecord } = await supabase
      .from('coaches')
      .select('id')
      .eq('email', user.email)
      .eq('can_login', true)
      .eq('is_active', true)
      .maybeSingle()
    if (coachRecord) redirect('/coach')
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'مستخدم'
  const role = user.user_metadata?.role || 'مشرف'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <DashboardShell
      user={{ displayName, role, email: user.email || '', initials }}
      topbarActions={<><LanguageToggle /><ThemeToggle /></>}
    >
      {children}
    </DashboardShell>
  )
}
