'use server'
// Today's clock-ins / check-ins made outside the academy (or with location blocked),
// for the super admin's alert bell.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailPattern } from '@/lib/emailMatch'
import { cairoDayRange, cairoToday } from '@/lib/staffClock'

export type LocationAlert = {
  id: string
  who: 'staff' | 'coach'
  nameAr: string | null
  nameEn: string | null
  status: 'invalid' | 'denied'
  distance: number | null
  device: string | null
  at: string
}

export async function getLocationAlerts(): Promise<LocationAlert[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return []
  const { data: me } = await supabase
    .from('staff').select('role').ilike('email', emailPattern(user.email)).maybeSingle()
  if (me?.role !== 'super_admin') return []

  const admin = createAdminClient()
  const [start, end] = cairoDayRange(cairoToday())
  const flagged = ['invalid', 'denied']

  const [{ data: staff }, { data: coaches }] = await Promise.all([
    admin.from('staff_attendance')
      .select('id, login_time, location_status, login_distance_m, login_device, staff:staff(name, name_en)')
      .in('location_status', flagged)
      .gte('login_time', start.toISOString()).lt('login_time', end.toISOString()),
    admin.from('coach_attendance')
      .select('id, check_in_time, location_status, check_in_distance_m, check_in_device, coach:coaches(name_ar, name_en)')
      .in('location_status', flagged)
      .gte('check_in_time', start.toISOString()).lt('check_in_time', end.toISOString()),
  ])

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

  const alerts: LocationAlert[] = [
    ...(staff ?? []).map(r => {
      const p = one(r.staff as unknown as { name: string | null; name_en: string | null } | null)
      return {
        id: `s:${r.id}`, who: 'staff' as const, nameAr: p?.name ?? null, nameEn: p?.name_en ?? null,
        status: r.location_status, distance: r.login_distance_m, device: r.login_device, at: r.login_time,
      }
    }),
    ...(coaches ?? []).map(r => {
      const p = one(r.coach as unknown as { name_ar: string | null; name_en: string | null } | null)
      return {
        id: `c:${r.id}`, who: 'coach' as const, nameAr: p?.name_ar ?? null, nameEn: p?.name_en ?? null,
        status: r.location_status, distance: r.check_in_distance_m, device: r.check_in_device, at: r.check_in_time,
      }
    }),
  ]
  return alerts.sort((a, b) => b.at.localeCompare(a.at))
}
