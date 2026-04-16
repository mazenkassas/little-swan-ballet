'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, GraduationCap, CalendarDays, ClipboardCheck,
  CreditCard, UserCog, BookOpen, ShoppingBag, Star, Dumbbell,
  Settings, LogOut, Wallet, FileBarChart, ArrowLeftRight
} from 'lucide-react'

const navGroups = [
  {
    label: 'الرئيسي',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
      { href: '/dashboard/students', icon: Users, label: 'الطالبات' },
      { href: '/dashboard/classes', icon: GraduationCap, label: 'الفصول' },
      { href: '/dashboard/sessions', icon: CalendarDays, label: 'الحصص' },
      { href: '/dashboard/attendance', icon: ClipboardCheck, label: 'الحضور' },
    ]
  },
  {
    label: 'مالي',
    items: [
      { href: '/dashboard/payments', icon: CreditCard, label: 'المدفوعات' },
      { href: '/dashboard/expenses', icon: Wallet, label: 'المصروفات' },
      { href: '/dashboard/reports', icon: FileBarChart, label: 'التقارير' },
    ]
  },
  {
    label: 'إدارة',
    items: [
      { href: '/dashboard/coaches', icon: UserCog, label: 'المدربات' },
      { href: '/dashboard/exams', icon: BookOpen, label: 'الامتحانات' },
      { href: '/dashboard/transfers', icon: ArrowLeftRight, label: 'التحويلات' },
      { href: '/dashboard/inventory', icon: ShoppingBag, label: 'المخزون' },
      { href: '/dashboard/events', icon: Star, label: 'الفعاليات' },
      { href: '/dashboard/private', icon: Dumbbell, label: 'البرايفيت' },
      { href: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: 210, minHeight: '100vh', flexShrink: 0,
      background: '#FFFFFF', borderLeft: '1px solid #EDD8DC',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid #EDD8DC' }}>
        <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 18, color: '#C8788A', fontWeight: 400 }}>
          Little Swan
        </div>
        <div style={{ fontSize: 9, color: '#B89CA0', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
          Ballet Academy
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <div style={{ fontSize: 10, color: '#B89CA0', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                  borderRadius: 8, marginBottom: 1, fontSize: 13, textDecoration: 'none',
                  color: active ? '#8B4A58' : '#7A5C63',
                  background: active ? '#F5E6EA' : 'transparent',
                  transition: 'all .15s',
                }}>
                  <Icon size={14} style={{ flexShrink: 0, color: active ? '#C8788A' : '#B89CA0' }} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #EDD8DC' }}>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
          borderRadius: 8, width: '100%', fontSize: 13, color: '#B89CA0',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}>
          <LogOut size={14} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}