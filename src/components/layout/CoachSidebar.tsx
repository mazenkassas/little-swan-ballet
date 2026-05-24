'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Calendar, MapPin, ClipboardCheck,
  LogOut, ChevronLeft,
} from 'lucide-react'

type CoachInfo = { displayName: string; initials: string; email: string }

export default function CoachSidebar({ coach, mobileOpen = false }: { coach: CoachInfo; mobileOpen?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const t = useTranslations('coachNav')

  const navGroups = [
    {
      label: t('groups.sessions'),
      items: [
        { href: '/coach', icon: LayoutDashboard, label: t('dashboard'), exact: true },
        { href: '/coach/schedule', icon: Calendar, label: t('schedule') },
        { href: '/coach/checkin', icon: MapPin, label: t('checkin') },
      ],
    },
    {
      label: t('groups.students'),
      items: [
        { href: '/coach/attendance', icon: ClipboardCheck, label: t('attendance') },
      ],
    },
  ]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  const navLink = (href: string, icon: React.ReactNode, label: string, exact?: boolean) => {
    const active = isActive(href, exact)
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '8px 10px',
          borderRadius: 8,
          marginBottom: 1,
          fontSize: 13,
          textDecoration: 'none',
          color: active ? '#4a90d9' : 'var(--txt2)',
          background: active ? 'rgba(74,144,217,0.1)' : 'transparent',
          justifyContent: collapsed ? 'center' : 'flex-start',
          fontWeight: active ? 500 : 400,
          transition: 'background .12s, color .12s',
          minHeight: 34,
          flexShrink: 0,
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', color: active ? '#4a90d9' : 'var(--txt2)' }}>
          {icon}
        </span>
        {!collapsed && label}
      </Link>
    )
  }

  return (
    <aside
      className={`sidebar${mobileOpen ? ' mob-open' : ''}`}
      style={{
        width: collapsed ? 56 : 210,
        minHeight: '100vh',
        flexShrink: 0,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo + collapse toggle */}
      <div style={{
        padding: '16px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 60,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: 18,
              color: '#4a90d9',
              fontWeight: 400,
              lineHeight: 1,
            }}>Little Swan</div>
            <div style={{
              fontSize: 9,
              color: 'var(--txt2)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginTop: 3,
              opacity: 0.7,
            }}>Coach Portal</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--txt2)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10,
                color: 'var(--txt2)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '12px 8px 4px',
                opacity: 0.6,
                fontWeight: 600,
              }}>
                {group.label}
              </div>
            )}
            {collapsed && <div style={{ height: 8 }} />}
            {group.items.map(item => navLink(
              item.href,
              <item.icon size={14} />,
              item.label,
              item.exact
            ))}
          </div>
        ))}
      </nav>

      {/* User profile footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 10px', flexShrink: 0 }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#4a90d9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>
              {coach.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {coach.displayName}
              </p>
              <p style={{ fontSize: 10, color: '#4a90d9', margin: 0, marginTop: 1, fontWeight: 600, letterSpacing: '0.05em' }}>
                COACH
              </p>
            </div>
            <button
              onClick={handleLogout}
              title={t('logout')}
              aria-label={t('logout')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt2)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#4a90d9' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--txt2)' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#4a90d9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {coach.initials}
            </div>
            <button
              onClick={handleLogout}
              title={t('logout')}
              aria-label={t('logout')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt2)', padding: 2, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
