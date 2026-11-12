// Server-side helpers for location checks (academy geofence) and device detection.
import { headers } from 'next/headers'

export type LocationStatus = 'valid' | 'invalid' | 'pending' | 'denied'
export type Device = 'mobile' | 'desktop'

type Db = { from: (table: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Academy location + allowed radius, as saved on the Settings page. */
export async function getAcademyGeo(db: Db): Promise<{ lat: number; lng: number; radius: number } | null> {
  const { data } = await db
    .from('system_settings')
    .select('key, value')
    .in('key', ['academy_lat', 'academy_lng', 'allowed_radius_meters'])
  const map: Record<string, string> = {}
  ;(data || []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value })
  const lat = parseFloat(map.academy_lat ?? '')
  const lng = parseFloat(map.academy_lng ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null
  const radius = parseFloat(map.allowed_radius_meters ?? '')
  return { lat, lng, radius: Number.isFinite(radius) && radius > 0 ? radius : 100 }
}

/** Compare a reported position with the academy. No position → 'denied' if refused, else 'pending'. */
export async function checkLocation(
  db: Db,
  pos: { lat: number | null; lng: number | null; denied?: boolean },
): Promise<{ status: LocationStatus; distance: number | null }> {
  if (pos.lat == null || pos.lng == null) return { status: pos.denied ? 'denied' : 'pending', distance: null }
  const academy = await getAcademyGeo(db)
  if (!academy) return { status: 'pending', distance: null }
  const distance = Math.round(haversineMeters(pos.lat, pos.lng, academy.lat, academy.lng))
  return { status: distance <= academy.radius ? 'valid' : 'invalid', distance }
}

/** 'mobile' for phone/tablet browsers, 'desktop' for computer browsers (the "Website"). */
export async function requestDevice(): Promise<Device> {
  const ua = (await headers()).get('user-agent') ?? ''
  return /Mobi|Android|iPhone|iPad|iPod|Tablet|Silk|Kindle/i.test(ua) ? 'mobile' : 'desktop'
}
