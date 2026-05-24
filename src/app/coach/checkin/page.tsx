import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { format } from 'date-fns'
import CheckInPanel from './CheckInPanel'

export const dynamic = 'force-dynamic'

export default async function CoachCheckInPage() {
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
  if (!coach) redirect('/login')

  const today = format(new Date(), 'yyyy-MM-dd')

  // Get class IDs for this coach
  const { data: coachClassRows } = await supabase
    .from('classes')
    .select('id')
    .eq('default_coach_id', coach.id)
    .eq('is_active', true)

  const coachClassIds = (coachClassRows || []).map((c: any) => c.id)

  const [
    { data: todaySessions },
    { data: todayLogs },
    { data: history },
  ] = await Promise.all([
    // Today's sessions for this coach's classes
    coachClassIds.length > 0
      ? supabase
          .from('sessions')
          .select('id, date, class:classes(id, name, start_time, end_time, hall:halls(name))')
          .eq('date', today)
          .in('class_id', coachClassIds)
          .order('created_at')
      : Promise.resolve({ data: [] }),
    // Today's check-in logs
    supabase
      .from('coach_attendance')
      .select('id, session_id, check_in_time, check_out_time, hours_worked, location_status')
      .eq('coach_id', coach.id)
      .gte('check_in_time', today + 'T00:00:00')
      .lte('check_in_time', today + 'T23:59:59')
      .order('check_in_time', { ascending: false }),
    // Full history
    supabase
      .from('coach_attendance')
      .select('id, session_id, check_in_time, check_out_time, hours_worked, location_status, session:sessions(date, class:classes(name))')
      .eq('coach_id', coach.id)
      .order('check_in_time', { ascending: false })
      .limit(30),
  ])

  return (
    <CheckInPanel
      todaySessions={todaySessions || []}
      todayLogs={todayLogs || []}
      history={history || []}
      isRtl={isRtl}
    />
  )
}
