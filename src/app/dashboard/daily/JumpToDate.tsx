'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'

// "Jump to date" pill on the daily page: opens the browser's date picker
// and navigates to the chosen day.
export default function JumpToDate({
  selectedDay, todayStr, isRtl,
}: {
  selectedDay: string
  todayStr: string
  isRtl: boolean
}) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()

  function go(date: string) {
    if (!date || date === selectedDay) return
    startTransition(() => {
      router.push(date === todayStr ? '/dashboard/daily' : `/dashboard/daily?date=${date}`)
    })
  }

  return (
    <span
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#d4667a12', border: '1px solid #d4667a35', borderRadius: 20,
        padding: '5px 12px', color: '#d4667a', fontSize: 12, fontWeight: 700,
        whiteSpace: 'nowrap', cursor: 'pointer', opacity: pending ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <Calendar size={14} />
      {pending
        ? (isRtl ? 'جارٍ الانتقال…' : 'Loading…')
        : (isRtl ? 'انتقال إلى تاريخ' : 'Jump to date')}
      {/* Invisible native date input stretched over the pill, so one click opens the picker */}
      <input
        ref={inputRef}
        type="date"
        value={selectedDay}
        aria-label={isRtl ? 'انتقال إلى تاريخ' : 'Jump to date'}
        onClick={() => { try { inputRef.current?.showPicker() } catch {} }}
        onChange={e => go(e.target.value)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', border: 'none', padding: 0, margin: 0,
        }}
      />
    </span>
  )
}
