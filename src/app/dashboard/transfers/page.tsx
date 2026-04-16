import { createClient } from '@/lib/supabase/server'
import TransferActions from './TransferActions'
import Link from 'next/link'
import { Plus, ArrowLeftRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function TransfersPage() {
  const supabase = await createClient()

  const { data: transfers } = await supabase
    .from('student_transfers')
    .select(`
      *,
      student:students(name_ar, name_en),
      from_class:classes!from_class_id(name),
      to_class:classes!to_class_id(name)
    `)
    .order('request_date', { ascending: false })

  const pending = transfers?.filter(t => t.status === 'pending') || []
  const decided = transfers?.filter(t => t.status !== 'pending') || []

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">طلبات التحويل</h1>
          <p className="text-white/40 text-sm mt-1">{pending.length} طلب قيد الانتظار</p>
        </div>
        <Link
          href="/dashboard/transfers/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          طلب تحويل
        </Link>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider mb-4">قيد الانتظار</h2>
          <div className="space-y-3">
            {pending.map((t: any) => (
              <div key={t.id} className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-white font-semibold">{t.student?.name_ar}</p>
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                      قيد الانتظار
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <span className="text-rose-400">{t.from_class?.name}</span>
                    <ArrowLeftRight size={14} className="text-white/20" />
                    <span className="text-emerald-400">{t.to_class?.name}</span>
                  </div>
                  <p className="text-white/30 text-xs mt-1">{formatDate(t.request_date)}</p>
                </div>
                <TransferActions transferId={t.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {decided.length > 0 && (
        <div>
          <h2 className="text-white/40 text-sm font-medium uppercase tracking-wider mb-4">السجل</h2>
          <div className="space-y-2">
            {decided.map((t: any) => (
              <div key={t.id} className="bg-white/3 border border-white/6 rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-white/70 text-sm">{t.student?.name_ar}</p>
                  <div className="flex items-center gap-2 text-xs text-white/30 mt-1">
                    <span>{t.from_class?.name}</span>
                    <ArrowLeftRight size={11} />
                    <span>{t.to_class?.name}</span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  t.status === 'approved'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  {t.status === 'approved' ? 'موافق' : 'مرفوض'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!transfers || transfers.length === 0) && (
        <div className="text-center py-20 text-white/20">
          <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
          <p>لا توجد طلبات تحويل</p>
        </div>
      )}
    </div>
  )
}
