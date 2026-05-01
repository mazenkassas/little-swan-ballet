'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

export default function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()

  function toggle() {
    const next = locale === 'ar' ? 'en' : 'ar'
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      title={locale === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
      style={{
        width: 34, height: 34,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        color: 'var(--txt2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
        fontSize: 12, fontWeight: 700, letterSpacing: 0,
        fontFamily: 'inherit',
      }}
    >
      {locale === 'ar' ? 'EN' : 'ع'}
    </button>
  )
}
