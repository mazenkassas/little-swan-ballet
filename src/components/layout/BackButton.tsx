'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

export default function BackButton({
  label,
  fallback,
  variant = 'default',
}: {
  label: string
  fallback: string
  variant?: 'default' | 'primary'
}) {
  const router = useRouter()
  const locale = useLocale()
  const isRtl  = locale === 'ar'

  function handleClick() {
    if (window.history.length > 1) router.back()
    else router.push(fallback)
  }

  if (variant === 'primary') {
    return (
      <button
        onClick={handleClick}
        style={{
          display: 'inline-flex', alignItems: 'center',
          background: '#d4667a', border: 'none', borderRadius: 8,
          padding: '7px 16px', color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', padding: 0,
        color: 'var(--txt2)', fontSize: 12, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}
