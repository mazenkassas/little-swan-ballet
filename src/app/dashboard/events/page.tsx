import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Star, Users } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

const eventTypeColors: Record<string, string> = {
  recital: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  tv_show: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  workshop: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  competition: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
}
const eventTypeLabels: Record<string, string> = {
  recital: 'عرض', tv_show: 'تلفزيون', workshop: 'ورشة', competition: 'مسابقة',
}

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*, enrollments:event_enrollments(id, payment_status)')
    .order('date', { ascending: false })

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">الفعاليات</h1>
          <p className="text-white/40 text-sm mt-1">العروض والفعاليات والمسابقات</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          إنشاء فعالية
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {events?.map((event: any) => {
          const totalEnrolled = event.enrollments?.length || 0
          const paid = event.enrollments?.filter((e: any) => e.payment_status === 'paid').length || 0
          const totalRevenue = paid * event.price

          return (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="bg-white/5 border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-all hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <Star size={20} className="text-white" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${eventTypeColors[event.type] || 'text-white/40 bg-white/5 border-white/10'}`}>
                  {eventTypeLabels[event.type] || event.type}
                </span>
              </div>

              <h3 className="text-white font-semibold mb-1">{event.name}</h3>
              <p className="text-white/40 text-sm">{formatDate(event.date)}</p>
              {event.venue && <p className="text-white/30 text-xs mt-0.5">{event.venue}</p>}

              <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white/40 text-sm">
                  <Users size={14} />
                  {totalEnrolled} مسجلة
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 text-sm font-semibold">{formatCurrency(totalRevenue)}</p>
                  <p className="text-white/20 text-xs">{formatCurrency(event.price)} / طالبة</p>
                </div>
              </div>
            </Link>
          )
        })}
        {(!events || events.length === 0) && (
          <div className="col-span-3 text-center py-20 text-white/20">
            <Star size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد فعاليات</p>
          </div>
        )}
      </div>
    </div>
  )
}
