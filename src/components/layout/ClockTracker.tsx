'use client'
// Keeps the signed-in admin/staff member clocked in while the dashboard is open,
// and reports where they clocked in from.
import { useEffect, useRef } from 'react'
import { clockLocation, clockPing } from '@/lib/actions/clock'
import { PING_MS } from '@/lib/staffClock'

const GPS_TIMEOUT_MS = 20000

export default function ClockTracker() {
  // When the current location request started (0 = none in flight)
  const locatingSince = useRef(0)

  useEffect(() => {
    function locate(sessionId: string) {
      // The browser may never answer (e.g. the permission prompt is ignored): retry after a while.
      if (locatingSince.current && Date.now() - locatingSince.current < GPS_TIMEOUT_MS + 15000) return
      if (!navigator.geolocation || !window.isSecureContext) {
        clockLocation(sessionId, null, null, false, 'unsupported').catch(() => {})
        return
      }
      locatingSince.current = Date.now()
      navigator.geolocation.getCurrentPosition(
        pos => {
          locatingSince.current = 0
          clockLocation(sessionId, pos.coords.latitude, pos.coords.longitude).catch(() => {})
        },
        err => {
          locatingSince.current = 0
          if (err.code === err.PERMISSION_DENIED) {
            clockLocation(sessionId, null, null, true).catch(() => {})
          } else {
            // No GPS fix yet: note why, stay pending and retry on the next ping.
            const why = err.code === err.TIMEOUT ? 'timeout' : 'unavailable'
            clockLocation(sessionId, null, null, false, why).catch(() => {})
          }
        },
        { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 60000 },
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
