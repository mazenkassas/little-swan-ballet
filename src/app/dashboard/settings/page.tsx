import { createClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'
import { getLocale } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const locale   = await getLocale()
  const supabase = await createClient()

  const [
    { data: settings },
    { data: levels },
    { data: plans },
    { data: halls },
  ] = await Promise.all([
    supabase.from('system_settings').select('*'),
    supabase.from('levels').select('*').order('order_num'),
    supabase.from('subscription_plans').select('*').eq('is_active', true).order('price'),
    supabase.from('halls').select('*'),
  ])

  const settingsMap: Record<string, string> = {}
  settings?.forEach(s => { settingsMap[s.key] = s.value })

  return (
    <SettingsForm
      settings={settingsMap}
      levels={levels || []}
      plans={plans  || []}
      halls={halls  || []}
      locale={locale}
    />
  )
}
