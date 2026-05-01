import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import RolesForm from './RolesForm'

export const dynamic = 'force-dynamic'

export default async function RolesPage() {
  const locale   = await getLocale()
  const supabase = await createClient()

  const { data: settings } = await supabase.from('system_settings').select('*')

  const settingsMap: Record<string, string> = {}
  settings?.forEach((s: any) => { settingsMap[s.key] = s.value })

  let permissions: any = {}
  try { permissions = JSON.parse(settingsMap['role_permissions'] || '{}') } catch {}

  return <RolesForm permissions={permissions} locale={locale} />
}
