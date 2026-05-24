import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import AttendanceConfirm from './AttendanceConfirm'

export const dynamic = 'force-dynamic'

export default async function CoachAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const isRtl = locale === 'ar'

  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('email', user.email!)
    .eq('can_login', true)
    .maybeSingle()
  if (!coach) redirect('/login')

  // Get class IDs for this coach
  const { data: coachClassRows } = await supabase
    .from('classes')
    .select('id')
    .eq('default_coach_id', coach.id)

  const classIds = (coachClassRows || []).map((c: any) => c.id)

  if (classIds.length === 0) {
    return (
      <AttendanceConfirm attendance={[]} isRtl={isRtl} />
    )
  }

  // Get session IDs for these classes
  const { data: sessionRows } = await supabase
    .from('sessions')
    .select('id')
    .in('class_id', classIds)
    .order('date', { ascending: false })
    .limit(200)

  const sessionIds = (sessionRows || []).map((s: any) => s.id)

  if (sessionIds.length === 0) {
    return <AttendanceConfirm attendance={[]} isRtl={isRtl} />
  }

  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, status, coach_status, session:sessions(id, date, class:classes(name)), student:students(name_ar, name_en)')
    .in('session_id', sessionIds)
    .order('timestamp', { ascending: false })
    .limit(80)

  return (
    <AttendanceConfirm attendance={attendance || []} isRtl={isRtl} />
  )
}
