'use server'

import { createClient } from '@/lib/supabase/server'
import { emailPattern } from '@/lib/emailMatch'
import { revalidatePath } from 'next/cache'
import { checkLocation, requestDevice } from '@/lib/geo'

async function getCoachId(supabase: Awaited<ReturnType<typeof createClient>>, email: string) {
  const { data } = await supabase
    .from('coaches')
    .select('id')
    .ilike('email', emailPattern(email))
    .eq('can_login', true)
    .eq('is_active', true)
    .maybeSingle()
  return data?.id ?? null
}

export async function coachCheckIn(
  sessionId: string | null,
  lat: number | null,
  lng: number | null,
  denied = false,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated' }

  const coachId = await getCoachId(supabase, user.email)
  if (!coachId) return { error: 'Coach record not found' }

  // Same geofence as admin/staff: academy location + allowed radius from Settings
  const { status: locationStatus, distance } = await checkLocation(supabase, { lat, lng, denied })

  const { error } = await supabase.from('coach_attendance').insert({
    coach_id: coachId,
    session_id: sessionId || null,
    check_in_time: new Date().toISOString(),
    check_in_lat: lat,
    check_in_lng: lng,
    location_status: locationStatus,
    check_in_distance_m: distance,
    check_in_device: await requestDevice(),
  })

  if (error) return { error: error.message }
  revalidatePath('/coach/checkin')
  revalidatePath('/coach')
  return {}
}

export async function coachCheckOut(
  attendanceId: string,
  lat: number | null,
  lng: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated' }

  const coachId = await getCoachId(supabase, user.email)
  if (!coachId) return { error: 'Coach record not found' }

  const { data: existing } = await supabase
    .from('coach_attendance')
    .select('check_in_time, check_out_time, coach_id')
    .eq('id', attendanceId)
    .single()

  if (!existing) return { error: 'Record not found' }
  if (existing.coach_id !== coachId) return { error: 'Unauthorized' }
  if (existing.check_out_time) return { error: 'Already checked out' }

  const checkInTime = new Date(existing.check_in_time)
  const checkOutTime = new Date()
  const hoursWorked = Math.round(((checkOutTime.getTime() - checkInTime.getTime()) / 3600000) * 10) / 10

  const { error } = await supabase.from('coach_attendance').update({
    check_out_time: checkOutTime.toISOString(),
    check_out_lat: lat,
    check_out_lng: lng,
    hours_worked: hoursWorked,
  }).eq('id', attendanceId)

  if (error) return { error: error.message }
  revalidatePath('/coach/checkin')
  revalidatePath('/coach')
  return {}
}

export async function confirmAttendanceRecord(
  attendanceId: string,
  coachStatus: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated' }

  const coachId = await getCoachId(supabase, user.email)
  if (!coachId) return { error: 'Coach record not found' }

  // Only allow confirming attendance for sessions of this coach's own classes
  const { data: record } = await supabase
    .from('attendance')
    .select('id, session:sessions(class:classes(default_coach_id))')
    .eq('id', attendanceId)
    .maybeSingle()
  if (!record) return { error: 'Record not found' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session: any = Array.isArray(record.session) ? record.session[0] : record.session
  const cls = Array.isArray(session?.class) ? session.class[0] : session?.class
  if (cls?.default_coach_id !== coachId) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('attendance')
    .update({ coach_status: coachStatus })
    .eq('id', attendanceId)

  if (error) return { error: error.message }
  revalidatePath('/coach/attendance')
  return {}
}
