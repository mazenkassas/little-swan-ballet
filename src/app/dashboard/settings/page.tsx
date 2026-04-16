import { createClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const [
    { data: settings },
    { data: levels },
    { data: plans },
    { data: halls },
  ] = await Promise.all([
    supabase.from('system_settings').select('*'),
    supabase.from('levels').select('*').order('order_num'),
    supabase.from('subscription_plans').select('*').eq('is_active', true),
    supabase.from('halls').select('*'),
  ])

  const settingsMap: Record<string, string> = {}
  settings?.forEach(s => { settingsMap[s.key] = s.value })

  return (
    <div className="p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">الإعدادات</h1>
        <p className="text-white/40 text-sm mt-1">إعدادات النظام — للمشرف العام فقط</p>
      </div>

      <SettingsForm
        settings={settingsMap}
        levels={levels || []}
        plans={plans || []}
        halls={halls || []}
      />
    </div>
  )
}
