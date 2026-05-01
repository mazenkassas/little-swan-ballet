import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const params   = await searchParams
  const supabase = await createClient()
  const today    = format(new Date(), 'yyyy-MM-dd')
  const selectedDate = params.date || today

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, staff:staff(name)')
    .eq('date', selectedDate)
    .order('created_at', { ascending: false })

  const total = expenses?.reduce((s, e) => s + (e.amount ?? 0), 0) || 0

  const L = isRtl ? {
    title: 'المصروفات',
    sub: 'مصروفات اليوم المضافة من الشاشة اليومية',
    totalLbl: 'إجمالي المصروفات',
    totalSub: 'لهذا اليوم',
    countLbl: 'عدد البنود',
    noExpenses: 'لا توجد مصروفات في هذا اليوم',
    col: { num: '#', desc: 'البيان', amount: 'المبلغ', staff: 'الموظفة' },
  } : {
    title: 'Expenses',
    sub: 'Daily expenses recorded from the daily screen',
    totalLbl: 'Total Expenses',
    totalSub: 'For this day',
    countLbl: 'Entries',
    noExpenses: 'No expenses for this day',
    col: { num: '#', desc: 'Description', amount: 'Amount', staff: 'Staff' },
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
        <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{L.title}</h1>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20, maxWidth: 520 }}>
        <div style={{ background: '#e0404012', border: '1px solid #e0404022', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 500 }}>{L.totalLbl}</span>
            <span style={{ fontSize: 18 }}>📉</span>
          </div>
          <p style={{ color: '#e04040', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5 }}>{formatCurrency(total)}</p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: 0 }}>{L.totalSub}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 500 }}>{L.countLbl}</span>
            <span style={{ fontSize: 18 }}>📋</span>
          </div>
          <p style={{ color: 'var(--txt1)', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5 }}>{expenses?.length || 0}</p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: 0 }}>{L.totalSub}</p>
        </div>
      </div>

      {/* Date filter */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 16px', marginBottom: 20,
        display: 'inline-flex', alignItems: 'center',
      }}>
        <form>
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            style={{
              background: 'var(--bg-page)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--txt1)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </form>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
              {[L.col.num, L.col.desc, L.col.amount, L.col.staff].map(col => (
                <th key={col} style={{
                  textAlign: isRtl ? 'right' : 'left', color: 'var(--txt2)',
                  fontSize: 11, fontWeight: 600, padding: '10px 14px',
                  whiteSpace: 'nowrap', letterSpacing: '0.03em',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses?.map((e: any, idx: number) => (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--txt2)', fontSize: 12, width: 40 }}>{idx + 1}</td>
                <td style={{ padding: '12px 14px', color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{e.title}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    display: 'inline-block',
                    background: '#e0404018', color: '#e04040',
                    border: '1px solid #e0404028',
                    borderRadius: 8, padding: '3px 12px',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {formatCurrency(e.amount)}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--txt2)', fontSize: 12 }}>{e.staff?.name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!expenses || expenses.length === 0) && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13 }}>
            {L.noExpenses}
          </div>
        )}

        {expenses && expenses.length > 0 && (
          <div style={{
            padding: '12px 14px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-page)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 600 }}>
              {isRtl ? 'الإجمالي' : 'Total'}
            </span>
            <span style={{ color: '#e04040', fontSize: 14, fontWeight: 700 }}>
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
