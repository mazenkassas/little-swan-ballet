'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, GraduationCap, CalendarDays, ClipboardCheck,
  CreditCard, UserCog, BookOpen, ShoppingBag, Star, Dumbbell,
  Settings, LogOut, ChevronRight, Wallet, FileBarChart
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'الرئيسية', labelEn: 'Dashboard' },
  { href: '/dashboard/students', icon: Users, label: 'الطالبات', labelEn: 'Students' },
  { href: '/dashboard/classes', icon: GraduationCap, label: 'الفصول', labelEn: 'Classes' },
  { href: '/dashboard/sessions', icon: CalendarDays, label: 'الحصص', labelEn: 'Sessions' },
  { href: '/dashboard/attendance', icon: ClipboardCheck, label: 'الحضور', labelEn: 'Attendance' },
  { href: '/dashboard/payments', icon: CreditCard, label: 'المدفوعات', labelEn: 'Payments' },
  { href: '/dashboard/coaches', icon: UserCog, label: 'المدربات', labelEn: 'Coaches' },
  { href: '/dashboard/exams', icon: BookOpen, label: 'الامتحانات', labelEn: 'Exams' },
  { href: '/dashboard/inventory', icon: ShoppingBag, label: 'المخزون', labelEn: 'Inventory' },
  { href: '/dashboard/events', icon: Star, label: 'الفعاليات', labelEn: 'Events' },
  { href: '/dashboard/private', icon: Dumbbell, label: 'البرايفيت', labelEn: 'Private' },
  { href: '/dashboard/expenses', icon: Wallet, label: 'المصروفات', labelEn: 'Expenses' },
  { href: '/dashboard/reports', icon: FileBarChart, label: 'التقارير', labelEn: 'Reports' },
  { href: '/dashboard/settings', icon: Settings, label: 'الإعدادات', labelEn: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-[#0d0d14] border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20 flex-shrink-0">
            <span className="text-xl">🩰</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Little Swan</p>
            <p className="text-white/30 text-xs">Ballet Academy</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group',
                isActive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <Icon size={16} className={cn(isActive ? 'text-rose-400' : 'text-white/30 group-hover:text-white/60')} />
              <span className="flex-1 font-medium">{item.label}</span>
              {isActive && <ChevronRight size={14} className="text-rose-400/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all w-full group"
        >
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}
