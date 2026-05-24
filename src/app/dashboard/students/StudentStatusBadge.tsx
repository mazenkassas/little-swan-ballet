'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

const STATUSES = [
  { key: 'active',   en: 'Active',   ar: 'نشط',     color: '#3dab7e' },
  { key: 'inactive', en: 'Inactive', ar: 'غير نشط', color: '#e04040' },
  { key: 'frozen',   en: 'Freeze',   ar: 'تجميد',   color: '#4a90d9' },
]

export default function StudentStatusBadge({
  id, status, isRtl,
}: {
  id: string
  status: string
  isRtl: boolean
}) {
  const [current, setCurrent] = useState(status)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [pos,     setPos]     = useState({ top: 0, left: 0 })
  const [isDark,  setIsDark]  = useState(false)
  const btnRef   = useRef<HTMLButtonElement>(null)
  const router   = useRouter()
  const supabase = createClient()

  const sc = STATUSES.find(s => s.key === current) ?? STATUSES[0]

  function openDropdown(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(o => !o)
  }

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // close on scroll or resize
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  async function pick(next: string) {
    if (next === current) { setOpen(false); return }
    setOpen(false)
    setLoading(true)

    await supabase.from('students').update({ status: next }).eq('id', id)

    if (next === 'frozen') {
      await supabase.from('freezes').insert({
        student_id: id,
        start_date: new Date().toISOString().split('T')[0],
        reason: 'تجميد يدوي',
        status: 'active',
      })
    } else if (current === 'frozen') {
      await supabase.from('freezes')
        .update({ status: 'ended', end_date: new Date().toISOString().split('T')[0] })
        .eq('student_id', id)
        .eq('status', 'active')
    }

    setCurrent(next)
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      {/* Badge trigger */}
      <button
        ref={btnRef}
        onClick={openDropdown}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: sc.color + '18', color: sc.color,
          fontSize: 10, fontWeight: 600, padding: '3px 8px 3px 6px',
          borderRadius: 20, border: `1px solid ${sc.color}28`,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 3, background: sc.color, flexShrink: 0 }} />
        {isRtl ? sc.ar : sc.en}
        <ChevronDown size={10} style={{ opacity: 0.7, marginInlineStart: 1 }} />
      </button>

      {/* True portal — renders into #portal-root, escapes all table stacking contexts */}
      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: 160,
            background: isDark ? '#1e1e2e' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#EDD8DC'}`,
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            zIndex: 9999,
            overflow: 'hidden',
          }}>
            {STATUSES.map(s => {
              const isCurrent = s.key === current
              return (
                <button
                  key={s.key}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); pick(s.key) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '9px 12px',
                    background: isCurrent ? s.color + '22' : (isDark ? '#1e1e2e' : '#ffffff'),
                    border: 'none', cursor: isCurrent ? 'default' : 'pointer',
                    textAlign: 'start',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: s.color, flexShrink: 0, boxShadow: `0 0 4px ${s.color}80` }} />
                    <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: s.color }}>
                      {isRtl ? s.ar : s.en}
                    </span>
                  </div>
                  {isCurrent && <span style={{ fontSize: 10, color: s.color, fontWeight: 800 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </>,
        document.getElementById('portal-root') ?? document.body
      )}
    </>
  )
}
