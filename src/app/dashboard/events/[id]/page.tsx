import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Star, Users } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import EventEnrollForm from './EventEnrollForm'

const typeLabels: Record<string, string> = {
  recital: 'عرض', tv_show: 'تلفزيون', workshop: 'ورشة', competition: 'مسابقة',
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: enrollments } = await supabase
    .from('event_enrollments')
    .select('*, student:students(name_ar, name_en), payment:payments(amount_paid, payment_method)')
    .eq('event_id', id)
    .order('id')

  const enrolledIds = enrollments?.map(e => e.student_id) || []
  let available = []
  if (enrolledIds.length === 0) {
    const { data } = await supabase.from('students').select('id, name_ar').eq('status', 'active').order('name_ar')
    available = data || []
  } else {
    const { data } = await supabase.from('students').select('id, name_ar').eq('status', 'active').not('id', 'in', `(${enrolledIds.join(',')})`).order('name_ar')
    available = data || []
  }

  const totalPaid = enrollments?.filter(e => e.payment_status === 'paid').length || 0
  const totalRevenue = totalPaid * event.price

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/events" className="text-white/30 hover:text-white/60"><ArrowRight size={20} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{event.name}</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
              {typeLabels[event.type] || event.type}
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">
            {formatDate(event.date)} {event.venue ? `• ${event.venue}` : ''} • {formatCurrency(event.price)} للطالبة
          </p>
        </div>
        <div className="text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
          <p className="text-emerald-400 font-bold">{formatCurrency(totalRevenue)}</p>
          <p className="text-white/30 text-xs">{totalPaid} دفعت</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Enrolled list */}
        <div className="xl:col-span-2 bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={16} className="text-rose-400" />
              المسجلات ({enrollments?.length || 0})
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {enrollments?.map(e => (
              <div key={e.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {e.student?.name_ar[0]}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{e.student?.name_ar}</p>
                  <p className="text-white/30 text-xs">{e.student?.name_en}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  e.payment_status === 'paid' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  e.payment_status === 'partial' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  {e.payment_status === 'paid' ? 'دفعت' : e.payment_status === 'partial' ? 'جزئي' : 'لم تدفع'}
                </span>
              </div>
            ))}
            {(!enrollments || enrollments.length === 0) && (
              <div className="text-center py-12 text-white/20 text-sm">لا توجد طالبات مسجلات</div>
            )}
          </div>
        </div>

        {/* Enroll form */}
        <EventEnrollForm eventId={id} eventPrice={event.price} students={available} />
      </div>
    </div>
  )
}
