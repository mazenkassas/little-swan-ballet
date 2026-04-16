import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency, formatDate } from '@/lib/utils'
import AddExpenseForm from './AddExpenseForm'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, staff:staff(name)')
    .eq('date', today)
    .order('created_at', { ascending: false })

  const total = expenses?.reduce((s, e) => s + e.amount, 0) || 0

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">المصروفات</h1>
          <p className="text-white/40 text-sm mt-1">تسجيل مصروفات اليوم — الإجمالي: {formatCurrency(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AddExpenseForm />

        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <h2 className="text-white font-semibold">مصروفات اليوم</h2>
          </div>
          <div className="divide-y divide-white/5">
            {expenses?.map(e => (
              <div key={e.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-white text-sm">{e.title}</p>
                  <p className="text-white/30 text-xs mt-0.5">{e.staff?.name || '—'}</p>
                </div>
                <span className="text-red-400 font-semibold">{formatCurrency(e.amount)}</span>
              </div>
            ))}
            {(!expenses || expenses.length === 0) && (
              <div className="text-center py-10 text-white/20 text-sm">
                لا توجد مصروفات اليوم
              </div>
            )}
          </div>
          {expenses && expenses.length > 0 && (
            <div className="px-5 py-4 border-t border-white/8 bg-white/3 flex justify-between">
              <span className="text-white/50 text-sm font-medium">الإجمالي</span>
              <span className="text-red-400 font-bold">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
