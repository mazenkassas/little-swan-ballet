'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, CheckCircle2, LogOut, AlertTriangle, Clock } from 'lucide-react'
import { haversineDistance } from '@/lib/utils'

export default function CoachCheckinPage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [activeCheckins, setActiveCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [gpsError, setGpsError] = useState('')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [coachId, setCoachId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // Get current coach
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get coach by email
      const { data: coach } = await supabase.from('coaches')
        .select('id').eq('email', session.user.email!).single()
      if (coach) {
        setCoachId(coach.id)

        // Load today's sessions
        const today = new Date().toISOString().split('T')[0]
        const { data: sess } = await supabase.from('sessions')
          .select('*, class:classes(name, level:levels(name)), hall:halls(name)')
          .eq('date', today)
          .or(`coach_id.eq.${coach.id}`)
        setSessions(sess || [])

        // Active check-ins
        const { data: checkins } = await supabase.from('coach_attendance')
          .select('*, session:sessions(*, class:classes(name))')
          .eq('coach_id', coach.id)
          .is('check_out_time', null)
          .not('check_in_time', 'is', null)
        setActiveCheckins(checkins || [])
      }

      // Load settings
      const { data: settingsData } = await supabase.from('system_settings')
        .select('key, value')
        .in('key', ['academy_lat', 'academy_lng', 'allowed_radius_meters'])
      const settingsMap: Record<string, string> = {}
      settingsData?.forEach(s => { settingsMap[s.key] = s.value })
      setSettings(settingsMap)
    }
    load()
  }, [])

  async function getGPS(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsError('GPS غير متاح على هذا الجهاز')
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          setGpsError('تعذر الحصول على الموقع: ' + err.message)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  async function checkIn(sessionId: string) {
    if (!coachId) return
    setLoading(l => ({ ...l, [sessionId]: true }))
    setGpsError('')

    const gps = await getGPS()
    const academyLat = parseFloat(settings.academy_lat || '0')
    const academyLng = parseFloat(settings.academy_lng || '0')
    const radius = parseFloat(settings.allowed_radius_meters || '100')

    let locationStatus = 'invalid'
    let lat = null, lng = null

    if (gps) {
      lat = gps.lat; lng = gps.lng
      const distance = haversineDistance(gps.lat, gps.lng, academyLat, academyLng)
      locationStatus = distance <= radius ? 'valid' : 'invalid'
    }

    await supabase.from('coach_attendance').insert({
      session_id: sessionId,
      coach_id: coachId,
      check_in_time: new Date().toISOString(),
      check_in_lat: lat,
      check_in_lng: lng,
      location_status: locationStatus,
    })

    setLoading(l => ({ ...l, [sessionId]: false }))
    window.location.reload()
  }

  async function checkOut(attendanceId: string) {
    setLoading(l => ({ ...l, [attendanceId]: true }))
    setGpsError('')

    const gps = await getGPS()
    const academyLat = parseFloat(settings.academy_lat || '0')
    const academyLng = parseFloat(settings.academy_lng || '0')
    const radius = parseFloat(settings.allowed_radius_meters || '100')

    let locationStatus = 'invalid'
    let lat = null, lng = null

    if (gps) {
      lat = gps.lat; lng = gps.lng
      const distance = haversineDistance(gps.lat, gps.lng, academyLat, academyLng)
      locationStatus = distance <= radius ? 'valid' : 'invalid'
    }

    const checkoutTime = new Date()
    const existing = activeCheckins.find(c => c.id === attendanceId)
    let hoursWorked = null

    if (existing?.check_in_time) {
      const diff = checkoutTime.getTime() - new Date(existing.check_in_time).getTime()
      hoursWorked = Math.round((diff / 3600000) * 10) / 10
    }

    await supabase.from('coach_attendance').update({
      check_out_time: checkoutTime.toISOString(),
      check_out_lat: lat,
      check_out_lng: lng,
      location_status: locationStatus,
      hours_worked: hoursWorked,
    }).eq('id', attendanceId)

    setLoading(l => ({ ...l, [attendanceId]: false }))
    window.location.reload()
  }

  return (
    <div className="p-8 max-w-2xl" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">تسجيل الحضور</h1>
        <p className="text-white/40 text-sm mt-1">سجّل حضورك وانصرافك من الأكاديمية</p>
      </div>

      {gpsError && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-400 text-sm mb-6">
          <AlertTriangle size={16} />
          {gpsError}
        </div>
      )}

      {/* Active Check-ins */}
      {activeCheckins.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            جارٍ التسجيل
          </h2>
          {activeCheckins.map(att => (
            <div key={att.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{att.session?.class?.name}</p>
                  <p className="text-white/40 text-sm mt-1 flex items-center gap-2">
                    <Clock size={13} />
                    دخلت: {new Date(att.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${
                      att.location_status === 'valid'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    }`}>
                      <MapPin size={10} className="inline ml-1" />
                      {att.location_status === 'valid' ? 'موقع صحيح' : 'موقع مشكوك'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => checkOut(att.id)}
                  disabled={loading[att.id]}
                  className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                >
                  <LogOut size={15} />
                  {loading[att.id] ? 'جارٍ...' : 'تسجيل الانصراف'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's Sessions */}
      <div>
        <h2 className="text-white font-semibold mb-3">حصص اليوم</h2>
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-white/20 bg-white/3 rounded-2xl">
            <p>لا توجد حصص مسجلة لك اليوم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => {
              const isCheckedIn = activeCheckins.some(a => a.session_id === session.id)
              return (
                <div key={session.id} className="bg-white/5 border border-white/8 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{session.class?.name}</p>
                    <p className="text-white/40 text-sm mt-0.5">{session.hall?.name} • {session.class?.level?.name}</p>
                  </div>
                  {!isCheckedIn ? (
                    <button
                      onClick={() => checkIn(session.id)}
                      disabled={loading[session.id]}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      {loading[session.id] ? 'جارٍ...' : 'تسجيل الحضور'}
                    </button>
                  ) : (
                    <span className="text-emerald-400 text-sm flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      تم التسجيل
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
