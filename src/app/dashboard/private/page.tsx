import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Dumbbell } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import NewPrivateSessionForm from './NewPrivateSessionForm'

export default async function PrivatePage() {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('private_sessions')
    .select('*, student:students(name_ar), coach:coaches(name_ar)')
    .order('date', { ascending: false })
    .limit(20)

  const { data: students } = await supabase.from('students').select('id, name_ar').eq('status', 'active').order('name_ar')
  const { data: coaches } = await supabase.from('coaches').select('id, name_ar').eq('is_active', true).order('name_ar')

  const totalRevenue = sessions?.reduce((s, p) => s + p.fee, 0) || 0

  return (
    <div className="p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">الجلسات الخاصة</h1>
        <p className="text-white/40 text-sm mt-1">إدارة البرايفيت وتتبع الإيرادات</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* New session form */}
        <NewPrivateSessionForm students={students || []} coaches={coaches || []} />

        {/* Sessions list */}
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex justify-between items-center">
            <h2 className="text-white font-semibold">آخر الجلسات</h2>
            <span className="text-emerald-400 text-sm font-semibold">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="divide-y divide-white/5">
            {sessions?.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-white text-sm font-medium">{s.student?.name_ar}</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    مع {s.coach?.name_ar} • {s.duration_hours} ساعة • {formatDate(s.date)}
                  </p>
                </div>
                <span className="text-emerald-400 font-semibold text-sm">{formatCurrency(s.fee)}</span>
              </div>
            ))}
            {(!sessions || sessions.length === 0) && (
              <div className="text-center py-12 text-white/20 text-sm">
                لا توجد جلسات خاصة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
