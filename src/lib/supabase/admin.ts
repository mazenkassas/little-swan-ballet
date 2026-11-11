import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client using the service-role key. Bypasses RLS and can manage
 * Supabase Auth users. ONLY import this from server code ('use server' actions,
 * route handlers, server components) — never from a client component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL is not configured')
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
