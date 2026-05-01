'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, GraduationCap, ClipboardCheck,
  CreditCard, UserCog, BookOpen, ShoppingBag, Star, Dumbbell,
  Settings, LogOut, Wallet, FileBarChart, ArrowLeftRight,
  ChevronLeft, ClipboardList, ShieldCheck
} from 'lucide-react'

type UserInfo = { displayName: string; role: string; email: string; initials: string }

export default function Sidebar({ user }: { user: UserInfo }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const t = useTranslations('nav')

  const navGroups = [
    {
      label: t('groups.main'),
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard'), exact: true },
        { href: '/dashboard/daily', icon: ClipboardList, label: t('daily') },
        { href: '/dashboard/students', icon: Users, label: t('students') },
        { href: '/dashboard/classes', icon: GraduationCap, label: t('classes') },
        { href: '/dashboard/attendance', icon: ClipboardCheck, label: t('attendance') },
      ]
    },
    {
      label: t('groups.financial'),
      items: [
        { href: '/dashboard/payments', icon: CreditCard, label: t('payments') },
        { href: '/dashboard/expenses', icon: Wallet, label: t('expenses') },
        { href: '/dashboard/reports', icon: FileBarChart, label: t('reports') },
      ]
    },
    {
      label: t('groups.management'),
      items: [
        { href: '/dashboard/staff', icon: Users, label: t('staff') },
        { href: '/dashboard/coaches', icon: UserCog, label: t('coaches') },
        { href: '/dashboard/exams', icon: BookOpen, label: t('exams') },
        { href: '/dashboard/events', icon: Star, label: t('events') },
        // { href: '/dashboard/transfers', icon: ArrowLeftRight, label: t('transfers') },
        { href: '/dashboard/inventory', icon: ShoppingBag, label: t('inventory') },
        { href: '/dashboard/private', icon: Dumbbell, label: t('private') },
        { href: '/dashboard/roles',   icon: ShieldCheck, label: t('roles') },
      ]
    }
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
          color: active ? '#C8788A' : 'var(--txt2)',
          background: active ? 'var(--bg2)' : 'transparent',
          justifyContent: collapsed ? 'center' : 'flex-start',
          fontWeight: active ? 500 : 400,
          transition: 'background .12s, color .12s',
          minHeight: 34,
          flexShrink: 0,
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', color: active ? '#C8788A' : 'var(--txt2)' }}>
          {icon}
        </span>
        {!collapsed && label}
      </Link>
    )
  }


return (
    <aside style={{
      width: collapsed ? 56 : 210,
      minHeight: '100vh',
      flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>

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
              color: '#C8788A',
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
            }}>Ballet Academy</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
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

      {/* Settings */}
      <div style={{ padding: '0 8px 4px', flexShrink: 0 }}>
        {navLink('/dashboard/settings', <Settings size={14} />, t('settings'))}
      </div>

      {/* User profile footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 10px',
        flexShrink: 0,
      }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#C8788A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>
              {user.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName}
              </p>
              <p style={{ fontSize: 10, color: 'var(--txt2)', margin: 0, marginTop: 1 }}>
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title={t('logout')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt2)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#C8788A' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--txt2)' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#C8788A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {user.initials}
            </div>
            <button
              onClick={handleLogout}
              title={t('logout')}
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
