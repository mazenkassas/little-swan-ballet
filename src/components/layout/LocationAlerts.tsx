'use client'
// Super-admin alert bell: pops up when someone clocks in / checks in outside the academy.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Bell, MapPin, X } from 'lucide-react'
import { getLocationAlerts, type LocationAlert } from '@/lib/actions/locationAlerts'
import { fmtCairoTime } from '@/lib/staffClock'
import { DATA_CHANGED_EVENT } from './RealtimeRefresh'

const POLL_MS = 30_000
const SEEN_KEY = 'ls-location-alerts-seen'

function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')) } catch { return new Set() }
}
function saveSeen(seen: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-300))) } catch {}
}

export default function LocationAlerts() {
  const isRtl = useLocale() === 'ar'
  const [alerts, setAlerts] = useState<LocationAlert[]>([])
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<LocationAlert | null>(null)
  const known = useRef<Set<string> | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const L = isRtl ? {
    title: 'تنبيهات الموقع اليوم', none: 'لا توجد تنبيهات اليوم', markAll: 'تحديد الكل كمقروء',
    outside: 'سجّل الدخول خارج الأكاديمية', blocked: 'سجّل الدخول والموقع مرفوض',
    staff: 'موظف', coach: 'مدربة', mobile: 'موبايل', desktop: 'ويب', view: 'عرض',
  } : {
    title: "Today's location alerts", none: 'No alerts today', markAll: 'Mark all as read',
    outside: 'logged in outside the academy', blocked: 'logged in with location blocked',
    staff: 'Staff', coach: 'Coach', mobile: 'Mobile', desktop: 'Website', view: 'View',
  }

  const refresh = useCallback(async () => {
    let list: LocationAlert[]
    try { list = await getLocationAlerts() } catch { return }
    setAlerts(list)
    const seenNow = loadSeen()
    setSeen(seenNow)
    // Pop up the newest alert that appeared since the page opened (or any unread one on first load)
    const fresh = list.filter(a => !seenNow.has(a.id) && (known.current ? !known.current.has(a.id) : true))
    if (fresh.length) setToast(fresh[0])
    known.current = new Set(list.map(a => a.id))
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    // Live: re-check as soon as a clock-in / check-in row changes
    const onData = (e: Event) => {
      const table = (e as CustomEvent<{ table: string }>).detail?.table
      if (table === 'staff_attendance' || table === 'coach_attendance') refresh()
    }
    window.addEventListener(DATA_CHANGED_EVENT, onData)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(DATA_CHANGED_EVENT, onData)
    }
  }, [refresh])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function markSeen(ids: string[]) {
    const next = new Set(seen); ids.forEach(id => next.add(id))
    setSeen(next); saveSeen(next)
  }

  const unread = alerts.filter(a => !seen.has(a.id))
  const name = (a: LocationAlert) => (isRtl ? (a.nameAr || a.nameEn) : (a.nameEn || a.nameAr)) || '—'
  const dist = (m: number | null) => m == null ? '' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
  const href = (a: LocationAlert) => a.who === 'staff' ? '/dashboard/attendance?who=staff&tab=today' : '/dashboard/attendance?who=coaches&tab=log'
  const line = (a: LocationAlert) => [
    a.who === 'staff' ? L.staff : L.coach,
    fmtCairoTime(a.at),
    a.device === 'mobile' ? L.mobile : a.device === 'desktop' ? L.desktop : null,
    a.status === 'invalid' ? dist(a.distance) : null,
  ].filter(Boolean).join(' · ')

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={L.title} title={L.title} style={{
        position: 'relative', width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
        background: 'var(--bg-card)', color: unread.length ? '#e04040' : 'var(--txt2)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bell size={16} />
        {unread.length > 0 && (
          <span style={{
            position: 'absolute', top: -5, insetInlineEnd: -5, minWidth: 17, height: 17, padding: '0 4px',
            borderRadius: 9, background: '#e04040', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread.length}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 40, insetInlineEnd: 0, width: 'min(340px, calc(100vw - 32px))', zIndex: 200,
          background: 'var(--bg-popup)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,.35)', overflow: 'hidden', direction: isRtl ? 'rtl' : 'ltr',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>{L.title}</span>
            {unread.length > 0 && (
              <button type="button" onClick={() => markSeen(alerts.map(a => a.id))} style={{
                background: 'none', border: 'none', color: '#d4667a', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{L.markAll}</button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {alerts.length === 0 && <p style={{ margin: 0, padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--txt2)' }}>{L.none}</p>}
            {alerts.map(a => (
              <Link key={a.id} href={href(a)} onClick={() => { markSeen([a.id]); setOpen(false) }} style={{
                display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', textDecoration: 'none',
                background: seen.has(a.id) ? 'transparent' : '#e0404008',
              }}>
                <MapPin size={15} style={{ color: '#e04040', flexShrink: 0, marginTop: 2 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--txt1)' }}>
                    <b>{name(a)}</b> {a.status === 'invalid' ? L.outside : L.blocked}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--txt2)', marginTop: 2 }} dir="auto">{line(a)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div role="alert" style={{
          position: 'fixed', bottom: 16, insetInlineEnd: 16, zIndex: 300, width: 'min(340px, calc(100vw - 32px))',
          background: 'var(--bg-popup)', border: '1px solid #e0404055', borderInlineStart: '4px solid #e04040',
          borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,.35)', padding: '12px 14px',
          display: 'flex', gap: 10, direction: isRtl ? 'rtl' : 'ltr',
        }}>
          <MapPin size={18} style={{ color: '#e04040', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--txt1)' }}>
              <b>{name(toast)}</b> {toast.status === 'invalid' ? L.outside : L.blocked}
            </p>
            <p style={{ margin: '3px 0 8px', fontSize: 11, color: 'var(--txt2)' }} dir="auto">{line(toast)}</p>
            <Link href={href(toast)} onClick={() => { markSeen([toast.id]); setToast(null) }} style={{
              fontSize: 12, fontWeight: 600, color: '#d4667a', textDecoration: 'none',
            }}>{L.view}</Link>
          </div>
          <button type="button" aria-label="Close" onClick={() => { markSeen([toast.id]); setToast(null) }} style={{
            background: 'none', border: 'none', color: 'var(--txt2)', cursor: 'pointer', padding: 0, alignSelf: 'flex-start',
          }}><X size={16} /></button>
        </div>
      )}
    </div>
  )
}
