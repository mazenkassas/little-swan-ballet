'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function getCoachId(supabase: Awaited<ReturnType<typeof createClient>>, email: string) {
  const { data } = await supabase
    .from('coaches')
    .select('id')
    .eq('email', email)
    .eq('can_login', true)
    .maybeSingle()
  return data?.id ?? null
}

async function getAcademyCoords(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['academy_lat', 'academy_lng', 'checkin_radius_meters'])
  const map: Record<string, string> = {}
  ;(data || []).forEach((r: any) => { map[r.key] = r.value })
  return {
    lat: parseFloat(map['academy_lat'] ?? '0') || 0,
    lng: parseFloat(map['academy_lng'] ?? '0') || 0,
    radius: parseFloat(map['checkin_radius_meters'] ?? '500') || 500,
  }
}

export async function coachCheckIn(
  sessionId: string | null,
  lat: number | null,
  lng: number | null,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated' }

  const coachId = await getCoachId(supabase, user.email)
  if (!coachId) return { error: 'Coach record not found' }

  let locationStatus = 'pending'
  if (lat != null && lng != null) {
    const { lat: aLat, lng: aLng, radius } = await getAcademyCoords(supabase)
    if (aLat !== 0 || aLng !== 0) {
      const dist = haversineMeters(lat, lng, aLat, aLng)
      locationStatus = dist <= radius ? 'valid' : 'invalid'
    }
  }

  const { error } = await supabase.from('coach_attendance').insert({
    coach_id: coachId,
    session_id: sessionId || null,
    check_in_time: new Date().toISOString(),
    check_in_lat: lat,
    check_in_lng: lng,
    location_status: locationStatus,
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
    .select('check_in_time, coach_id')
    .eq('id', attendanceId)
    .single()

  if (!existing) return { error: 'Record not found' }
  if (existing.coach_id !== coachId) return { error: 'Unauthorized' }

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

  const { error } = await supabase
    .from('attendance')
    .update({ coach_status: coachStatus })
    .eq('id', attendanceId)

  if (error) return { error: error.message }
  revalidatePath('/coach/attendance')
  return {}
}
