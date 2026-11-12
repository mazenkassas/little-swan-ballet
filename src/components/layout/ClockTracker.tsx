'use client'
// Keeps the signed-in admin/staff member clocked in while the dashboard is open.
import { useEffect } from 'react'
import { clockPing } from '@/lib/actions/clock'
import { PING_MS } from '@/lib/staffClock'

export default function ClockTracker() {
  useEffect(() => {
    const ping = () => { clockPing().catch(() => {}) }
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
