'use client'
// Keeps the signed-in admin/staff member clocked in while the dashboard is open,
// and reports where they clocked in from.
import { useEffect, useRef } from 'react'
import { clockLocation, clockPing } from '@/lib/actions/clock'
import { PING_MS } from '@/lib/staffClock'

export default function ClockTracker() {
  const locating = useRef(false)

  useEffect(() => {
    function locate(sessionId: string) {
      if (locating.current) return
      if (!navigator.geolocation) { clockLocation(sessionId, null, null, true).catch(() => {}); return }
      locating.current = true
      navigator.geolocation.getCurrentPosition(
        pos => {
          locating.current = false
          clockLocation(sessionId, pos.coords.latitude, pos.coords.longitude).catch(() => {})
        },
        err => {
          locating.current = false
          // Refused → flag it. Timeout/unavailable → stay pending and retry on the next ping.
          if (err.code === err.PERMISSION_DENIED) clockLocation(sessionId, null, null, true).catch(() => {})
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
      )
    }

    const ping = () => {
      clockPing().then(r => { if (r?.locate) locate(r.locate) }).catch(() => {})
    }
    ping()
    const timer = setInterval(ping, PING_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') ping() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return null
}
