'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useRef, useState, useEffect, useCallback } from 'react'

export default function StudentSearch({ isRtl }: { isRtl: boolean }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('search') || '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const status = searchParams.get('status') || ''

  const push = useCallback((v: string) => {
    const sp = new URLSearchParams()
    if (status) sp.set('status', status)
    if (v)      sp.set('search', v)
    const q = sp.toString()
    router.replace(`${pathname}${q ? '?' + q : ''}`, { scroll: false })
  }, [router, pathname, status])

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(v), 300)
  }

  // Sync value when URL search param changes externally (e.g. tab click clears search)
  useEffect(() => {
    setValue(searchParams.get('search') || '')
  }, [searchParams.get('search')])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={isRtl ? 'بحث...' : 'Search...'}
      style={{
        padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8,
        fontSize: 12, color: 'var(--txt1)', width: 200, outline: 'none',
        background: 'var(--bg-card)',
      }}
    />
  )
}
