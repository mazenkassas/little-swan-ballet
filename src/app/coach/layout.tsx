import CoachShell from '@/components/layout/CoachShell'
import ThemeToggle from '@/components/layout/ThemeToggle'
import LanguageToggle from '@/components/layout/LanguageToggle'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const isRtl = locale === 'ar'

  const { data: coach } = await supabase
    .from('coaches')
    .select('id, name_ar, name_en')
    .eq('email', user.email!)
    .eq('can_login', true)
    .maybeSingle()

  if (!coach) redirect('/dashboard')

  const displayName = isRtl
    ? (coach.name_ar || coach.name_en || 'Coach')
    : (coach.name_en || coach.name_ar || 'Coach')
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <CoachShell
      coach={{ displayName, initials, email: user.email || '' }}
      topbarActions={<><LanguageToggle /><ThemeToggle /></>}
    >
      {children}
    </CoachShell>
  )
}
