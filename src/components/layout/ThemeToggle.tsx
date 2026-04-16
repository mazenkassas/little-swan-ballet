'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('ls-theme')
    if (saved === 'dark') {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('ls-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('ls-theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'وضع النهار' : 'وضع الليل'}
      style={{
        width: 34, height: 34,
        borderRadius: 8,
        border: '0.5px solid var(--border)',
        background: 'var(--bg2)',
        color: 'var(--txt2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
      }}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
