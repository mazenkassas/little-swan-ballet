import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInYears, format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), parseISO(dateOfBirth))
}

export function formatDate(date: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(date), fmt)
  } catch {
    return date
  }
}

export function formatCurrency(amount: number): string {
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(amount)} EGP`
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function getStudentStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case 'frozen': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'inactive': return 'text-gray-500 bg-gray-50 border-gray-200'
    default: return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'نشط',
    frozen: 'مجمد',
    inactive: 'غير نشط',
    present: 'حاضر',
    absent: 'غائب',
    make_up: 'تعويض',
    pending: 'قيد الانتظار',
    approved: 'موافق',
    rejected: 'مرفوض',
    pass: 'ناجح',
    fail: 'راسب',
    cash: 'كاش',
    instapay: 'إنستاباي',
    subscription: 'اشتراك',
    product: 'منتج',
    event: 'فعالية',
    private: 'برايفيت',
    exam: 'امتحان',
    enrollment: 'تسجيل جديد',
    scheduled: 'مجدول',
    completed: 'منتهي',
    cancelled: 'ملغي',
  }
  return labels[status] || status
}

export const DAYS_OF_WEEK = [
  { value: 'Saturday',  label: 'السبت' },
  { value: 'Sunday',    label: 'الأحد' },
  { value: 'Monday',    label: 'الاثنين' },
  { value: 'Tuesday',   label: 'الثلاثاء' },
  { value: 'Wednesday', label: 'الأربعاء' },
  { value: 'Thursday',  label: 'الخميس' },
  { value: 'Friday',    label: 'الجمعة' },
]
