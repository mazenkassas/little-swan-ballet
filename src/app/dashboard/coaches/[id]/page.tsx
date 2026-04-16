import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Clock, MapPin, DollarSign } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: coach } = await supabase.from('coaches').select('*').eq('id', id).single()
  if (!coach) notFound()

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: attendance } = await supabase
    .from('coach_attendance')
    .select('*, session:sessions(date, class:classes(name))')
    .eq('coach_id', id)
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)
    .order('created_at', { ascending: false })

  const totalHours = attendance?.reduce((s, a) => s + (a.hours_worked || 0), 0) || 0
  const flaggedCount = attendance?.filter(a => a.location_status === 'invalid').length || 0
  const monthlySalary = totalHours * coach.hourly_rate

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/coaches" className="text-white/30 hover:text-white/60"><ArrowRight size={20} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              {coach.name_ar[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{coach.name_ar}</h1>
              <p className="text-white/40 text-sm">{coach.name_en} • {coach.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-violet-400" />
            <span className="text-white/50 text-sm">ساعات هذا الشهر</span>
          </div>
          <p className="text-2xl font-bold text-violet-400">{totalHours.toFixed(1)}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-400" />
            <span className="text-white/50 text-sm">المرتب المتوقع</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(monthlySalary)}</p>
        </div>
        <div className={`${flaggedCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/8'} border rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className={flaggedCount > 0 ? 'text-amber-400' : 'text-white/40'} />
            <span className="text-white/50 text-sm">تسجيلات مشكوكة</span>
          </div>
          <p className={`text-2xl font-bold ${flaggedCount > 0 ? 'text-amber-400' : 'text-white/40'}`}>{flaggedCount}</p>
        </div>
      </div>

      {/* Attendance log */}
      <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8">
          <h2 className="text-white font-semibold">سجل الحضور — {format(new Date(), 'MMMM yyyy')}</h2>
          <p className="text-white/30 text-xs mt-0.5">{coach.hourly_rate} جنيه/ساعة</p>
        </div>
        <div className="divide-y divide-white/5">
          {attendance?.map(a => (
            <div key={a.id} className={`flex items-center gap-4 px-6 py-4 ${a.location_status === 'invalid' ? 'bg-amber-500/3' : ''}`}>
              <div className="flex-1">
                <p className="text-white text-sm">{a.session?.class?.name || 'برايفيت'}</p>
                <p className="text-white/30 text-xs">
                  {a.check_in_time ? new Date(a.check_in_time).toLocaleString('ar-EG') : '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {a.hours_worked && (
                  <span className="text-violet-400 text-sm font-medium">{a.hours_worked}h</span>
                )}
                {a.hours_worked && (
                  <span className="text-emerald-400 text-sm">{formatCurrency(a.hours_worked * coach.hourly_rate)}</span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                  a.location_status === 'valid'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : a.location_status === 'invalid'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-white/20 bg-white/5 border-white/10'
                }`}>
                  <MapPin size={10} />
                  {a.location_status === 'valid' ? 'صحيح' : a.location_status === 'invalid' ? 'مشكوك' : 'قيد العمل'}
                </span>
              </div>
            </div>
          ))}
          {(!attendance || attendance.length === 0) && (
            <div className="text-center py-12 text-white/20 text-sm">لا يوجد سجل حضور لهذا الشهر</div>
          )}
        </div>
        {attendance && attendance.length > 0 && (
          <div className="px-6 py-4 border-t border-white/8 bg-white/3 flex justify-between items-center">
            <span className="text-white/50 text-sm">إجمالي الشهر</span>
            <div className="flex items-center gap-4">
              <span className="text-violet-400 font-medium">{totalHours.toFixed(1)} ساعة</span>
              <span className="text-emerald-400 font-bold text-lg">{formatCurrency(monthlySalary)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
