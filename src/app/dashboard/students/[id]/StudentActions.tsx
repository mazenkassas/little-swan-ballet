'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { MoreHorizontal } from 'lucide-react'
import type { Student } from '@/lib/types'

const STATUSES = [
  { key: 'active',   en: 'Active',   ar: 'نشط',     color: '#3dab7e' },
  { key: 'inactive', en: 'Inactive', ar: 'غير نشط', color: '#e04040' },
  { key: 'frozen',   en: 'Freeze',   ar: 'تجميد',   color: '#4a90d9' },
]

export default function StudentActions({ student }: { student: Student }) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDark,  setIsDark]  = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  const router    = useRouter()
  const supabase  = createClient()
  const locale    = useLocale()
  const isRtl     = locale === 'ar'

  async function updateStatus(status: string) {
    if (status === student.status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)

    await supabase.from('students').update({ status }).eq('id', student.id)

    if (status === 'frozen') {
      await supabase.from('freezes').insert({
        student_id: student.id,
        start_date: new Date().toISOString().split('T')[0],
        reason: 'تجميد يدوي',
        status: 'active',
      })
    } else if (student.status === 'frozen') {
      await supabase.from('freezes')
        .update({ status: 'ended', end_date: new Date().toISOString().split('T')[0] })
        .eq('student_id', student.id)
        .eq('status', 'active')
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        title="Actions"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34,
          background: open ? 'var(--bg2)' : 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 8, color: 'var(--txt2)',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.5 : 1,
          transition: 'background 0.15s',
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', insetInlineEnd: 0, top: '100%', marginTop: 6,
            width: 180, background: isDark ? '#1e1e2e' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#EDD8DC'}`,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,.45)', zIndex: 20, overflow: 'hidden',
          }}>
            <p style={{
              fontSize: 10, fontWeight: 600, color: 'var(--txt2)',
              padding: '10px 16px 6px', margin: 0,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#EDD8DC'}`,
              background: isDark ? '#1e1e2e' : '#ffffff',
            }}>
              {isRtl ? 'الحالة' : 'Status'}
            </p>
            {STATUSES.map(s => {
              const isCurrent = student.status === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => updateStatus(s.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '10px 16px',
                    background: isCurrent ? s.color + '22' : (isDark ? '#1e1e2e' : '#ffffff'),
                    border: 'none', cursor: isCurrent ? 'default' : 'pointer',
                    textAlign: 'start', transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: s.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 12,
                      fontWeight: isCurrent ? 700 : 500,
                      color: s.color,
                    }}>
                      {isRtl ? s.ar : s.en}
                    </span>
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
