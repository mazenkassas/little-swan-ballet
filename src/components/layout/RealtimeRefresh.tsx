'use client'
// Live updates for the whole app: listens to Supabase Realtime row changes and
// re-renders the current page from the server, so every open screen shows other
// people's changes (payments, attendance, enrollments, clock-ins…) without a reload.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/** Fired on window for widgets that load their own data (e.g. the location alerts bell). */
export const DATA_CHANGED_EVENT = 'ls:data-changed'

const DEBOUNCE_MS = 1200

type Row = Record<string, unknown>

/** Clock-in heartbeats only bump last_seen every couple of minutes — not worth a refresh. */
function isHeartbeat(p: RealtimePostgresChangesPayload<Row>): boolean {
  if (p.table !== 'staff_attendance' || p.eventType !== 'UPDATE') return false
  const before = p.old as Row
  const after  = p.new as Row
  if (!before || Object.keys(before).length <= 1) return false // no previous row: play safe, refresh
  return Object.keys(after).every(k => k === 'last_seen' || before[k] === after[k])
}

export default function RealtimeRefresh() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null
    let pending = false
    let subscribedOnce = false

    const flush = () => {
      timer = null
      // Background tabs catch up when they become visible again
      if (document.visibilityState !== 'visible') { pending = true; return }
      pending = false
      router.refresh()
    }
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, DEBOUNCE_MS)
    }

    const channel = supabase
      .channel('ls-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: RealtimePostgresChangesPayload<Row>) => {
        if (isHeartbeat(payload)) return
        window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { table: payload.table } }))
        schedule()
      })
      .subscribe(status => {
        if (status !== 'SUBSCRIBED') return
        // After a dropped connection (sleep, network) changes may have been missed — catch up once
        if (subscribedOnce) schedule()
        subscribedOnce = true
      })

    const onVisible = () => { if (document.visibilityState === 'visible' && pending) schedule() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
