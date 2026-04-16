import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, TrendingUp, CreditCard, Banknote } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format } from 'date-fns'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const selectedDate = params.date || today

  let query = supabase
    .from('payments')
    .select('*, student:students(name_ar, name_en), staff:staff(name)')
    .eq('date', selectedDate)
    .order('created_at', { ascending: false })

  if (params.type) query = query.eq('type', params.type)
  const { data: payments } = await query

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('date', selectedDate)

  const totalRevenue = payments?.reduce((s, p) => s + p.amount_paid, 0) || 0
  const totalExpenses = expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const netRevenue = totalRevenue - totalExpenses

  const paymentTypes = [
    { value: '', label: 'الكل' },
    { value: 'subscription', label: 'اشتراك' },
    { value: 'product', label: 'منتج' },
    { value: 'event', label: 'فعالية' },
    { value: 'private', label: 'برايفيت' },
    { value: 'exam', label: 'امتحان' },
    { value: 'enrollment', label: 'تسجيل جديد' },
  ]

  const typeLabels: Record<string, string> = {
    subscription: 'اشتراك', product: 'منتج', event: 'فعالية',
    private: 'برايفيت', exam: 'امتحان', enrollment: 'تسجيل جديد',
  }

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">المدفوعات</h1>
          <p className="text-white/40 text-sm mt-1">تسجيل ومتابعة جميع المعاملات المالية</p>
        </div>
        <Link
          href="/dashboard/payments/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          إضافة دفعة
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={18} className="text-emerald-400" />
            <span className="text-white/60 text-sm">إجمالي الإيرادات</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Banknote size={18} className="text-red-400" />
            <span className="text-white/60 text-sm">إجمالي المصروفات</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard size={18} className="text-white/60" />
            <span className="text-white/60 text-sm">الصافي</span>
          </div>
          <p className={`text-2xl font-bold ${netRevenue >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(netRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4 mb-6">
        <form className="flex flex-wrap gap-3">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/70 text-sm focus:outline-none focus:border-rose-500/60"
          />
          <select
            name="type"
            defaultValue={params.type || ''}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/70 text-sm focus:outline-none min-w-36"
          >
            {paymentTypes.map(t => (
              <option key={t.value} value={t.value} className="bg-[#1a1a2e]">{t.label}</option>
            ))}
          </select>
          <button type="submit" className="bg-white/8 hover:bg-white/12 border border-white/10 text-white/70 px-4 py-2.5 rounded-xl text-sm transition-colors">
            فلترة
          </button>
        </form>
      </div>

      {/* Payments Table */}
      <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-right px-6 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">الطالبة</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">النوع</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">المطلوب</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">المدفوع</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">الرصيد</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">طريقة الدفع</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">الموظف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments?.map((p: any) => (
              <tr key={p.id} className="hover:bg-white/3 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/dashboard/students/${p.student_id}`} className="hover:text-rose-400 transition-colors">
                    <p className="text-white text-sm font-medium">{p.student?.name_ar}</p>
                    <p className="text-white/30 text-xs">{p.student?.name_en}</p>
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs px-2.5 py-1 rounded-full border text-violet-400 bg-violet-500/10 border-violet-500/20">
                    {typeLabels[p.type] || p.type}
                  </span>
                </td>
                <td className="px-4 py-4 text-white/60 text-sm">{formatCurrency(p.amount_due)}</td>
                <td className="px-4 py-4 text-emerald-400 text-sm font-medium">{formatCurrency(p.amount_paid)}</td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-medium ${p.remaining_balance > 0 ? 'text-amber-400' : 'text-white/30'}`}>
                    {formatCurrency(p.remaining_balance)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    p.payment_method === 'cash'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  }`}>
                    {p.payment_method === 'cash' ? 'كاش' : 'إنستاباي'}
                  </span>
                </td>
                <td className="px-4 py-4 text-white/30 text-sm">{p.staff?.name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!payments || payments.length === 0) && (
          <div className="text-center py-16 text-white/20">
            <p className="text-sm">لا توجد مدفوعات لهذا اليوم</p>
          </div>
        )}
      </div>
    </div>
  )
}
