'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const BASE = '/dashboard/staff-log'
const href = (date: string, today: string) => (date === today ? BASE : `${BASE}?date=${date}`)

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// Day navigator: previous / next day arrows, a pill that opens the native
// date picker, and a "Today" shortcut when viewing another day.
export default function DayPicker({
  date, today, label, isRtl, L,
}: {
  date: string
  today: string
  label: string
  isRtl: boolean
  L: { prev: string; next: string; today: string; pick: string }
}) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const isToday  = date === today
  const canNext  = date < today

  function go(d: string) {
    if (!d || d === date) return
    startTransition(() => router.push(href(d > today ? today : d, today)))
  }

  const arrow: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--txt1)',
  }
  // In RTL the "previous" arrow sits on the right and points right.
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', opacity: pending ? 0.6 : 1, transition: 'opacity 0.15s' }}>
      <Link href={href(shift(date, -1), today)} aria-label={L.prev} title={L.prev} style={arrow}>
        <PrevIcon size={16} />
      </Link>

      <span style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '0 14px', height: 34, color: 'var(--txt1)', fontSize: 13, fontWeight: 600,
        whiteSpace: 'nowrap', cursor: 'pointer',
      }}>
        <Calendar size={14} color="#d4667a" />
        {label}
        {/* Invisible native date input over the pill, so one click opens the picker */}
        <input
          ref={inputRef}
          type="date"
          value={date}
          max={today}
          aria-label={L.pick}
          onClick={() => { try { inputRef.current?.showPicker() } catch {} }}
          onChange={e => go(e.target.value)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', border: 'none', padding: 0, margin: 0,
          }}
        />
      </span>

      {canNext ? (
        <Link href={href(shift(date, 1), today)} aria-label={L.next} title={L.next} style={arrow}>
          <NextIcon size={16} />
        </Link>
      ) : (
        <span aria-hidden style={{ ...arrow, opacity: 0.35, cursor: 'not-allowed' }}>
          <NextIcon size={16} />
        </span>
      )}

      {!isToday && (
        <Link href={BASE} style={{
          display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px',
          background: '#d4667a', color: '#fff', borderRadius: 10,
          fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {L.today}
        </Link>
      )}
    </div>
  )
}
