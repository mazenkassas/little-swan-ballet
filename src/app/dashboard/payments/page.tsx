import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import ExamFeesList from './ExamFeesList'

const TYPE_COLORS: Record<string, string> = {
  subscription: '#d4667a',
  product:      '#3dab7e',
  event:        '#8e5fd9',
  private:      '#4a90d9',
  exam:         '#e8960a',
  enrollment:   '#d4667a',
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string }>
}) {
  const locale  = await getLocale()
  const isRtl   = locale === 'ar'
  const params  = await searchParams
  const supabase = await createClient()
  const today   = format(new Date(), 'yyyy-MM-dd')
  const selectedDate = params.date || today

  let query = supabase
    .from('payments')
    .select('*, student:students(name_ar, name_en), staff:staff(name)')
    .eq('date', selectedDate)
    .order('created_at', { ascending: false })
  if (params.type) query = query.eq('type', params.type)
  const { data: payments } = await query

  const { data: expenses } = await supabase
    .from('expenses').select('*').eq('date', selectedDate)

  // Pending exam fees: enrolled students whose exam payment_deadline <= selectedDate and fee not yet paid
  const { data: allPendingExamFees } = await supabase
    .from('student_exams')
    .select('id, student_id, exam_id, student:students(id, name_ar, name_en), exam:exams(id, name, fee, payment_deadline)')
    .eq('exam_fee_paid', false)
    .not('exam', 'is', null)

  const pendingExamFees = (allPendingExamFees ?? []).filter(
    (r: any) => r.exam?.payment_deadline && r.exam.payment_deadline <= selectedDate
  ) as any[]

  const totalRevenue  = payments?.reduce((s, p) => s + (p.amount_paid ?? 0), 0) || 0
  const totalExpenses = expenses?.reduce((s, e) => s + (e.amount ?? 0), 0) || 0
  const netRevenue    = totalRevenue - totalExpenses

  const L = isRtl ? {
    title: 'المدفوعات',
    sub: 'سجل المعاملات المالية',
    revenue: 'إجمالي الإيرادات',
    revSub: 'جميع أنواع المدفوعات',
    expensesLbl: 'إجمالي المصروفات',
    expSub: 'المصروفات التشغيلية',
    net: 'صافي الإيرادات',
    netSub: 'بعد خصم المصروفات',
    all: 'الكل',
    noPayments: 'لا توجد مدفوعات في هذا اليوم',
    col: { num: '#', student: 'الطالبة', type: 'النوع', due: 'المبلغ', paid: 'المدفوع', method: 'طريقة الدفع', date: 'التاريخ', staff: 'الموظفة' },
    types: { subscription: 'اشتراك', product: 'منتج', event: 'فعالية', private: 'خاص', exam: 'اختبار', enrollment: 'تسجيل' },
    methods: { cash: 'كاش', instapay: 'إنستاباي' },
  } : {
    title: 'Payments & Revenue',
    sub: 'All financial transactions',
    revenue: "Today's Revenue",
    revSub: 'All payment types',
    expensesLbl: "Today's Expenses",
    expSub: 'Operational',
    net: 'Net Revenue',
    netSub: 'After expenses',
    all: 'All',
    noPayments: 'No payments for this day',
    col: { num: '#', student: 'Student', type: 'Type', due: 'Amount Due', paid: 'Paid', method: 'Method', date: 'Date', staff: 'Staff' },
    types: { subscription: 'Subscription', product: 'Product', event: 'Event', private: 'Private', exam: 'Exam', enrollment: 'Enrollment' },
    methods: { cash: 'Cash', instapay: 'Instapay' },
  }

  const typeFilters = [
    { value: '',             label: L.all },
    { value: 'subscription', label: L.types.subscription },
    { value: 'product',      label: L.types.product },
    { value: 'event',        label: L.types.event },
    { value: 'private',      label: L.types.private },
    { value: 'exam',         label: L.types.exam },
    { value: 'enrollment',   label: L.types.enrollment },
  ]

  const cols = [L.col.num, L.col.student, L.col.type, L.col.due, L.col.paid, L.col.method, L.col.date, L.col.staff]

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{L.sub}</p>
        <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{L.title}</h1>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#3dab7e12', border: '1px solid #3dab7e22', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 500 }}>{L.revenue}</span>
            <span style={{ fontSize: 18 }}>💵</span>
          </div>
          <p style={{ color: '#3dab7e', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5 }}>{formatCurrency(totalRevenue)}</p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: 0 }}>{L.revSub}</p>
        </div>
        <div style={{ background: '#e0404012', border: '1px solid #e0404022', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 500 }}>{L.expensesLbl}</span>
            <span style={{ fontSize: 18 }}>📉</span>
          </div>
          <p style={{ color: '#e04040', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5 }}>{formatCurrency(totalExpenses)}</p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: 0 }}>{L.expSub}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ color: 'var(--txt2)', fontSize: 12, fontWeight: 500 }}>{L.net}</span>
            <span style={{ fontSize: 18 }}>📊</span>
          </div>
          <p style={{ color: netRevenue >= 0 ? 'var(--txt1)' : '#e04040', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5 }}>{formatCurrency(netRevenue)}</p>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: 0 }}>{L.netSub}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        {/* Date picker */}
        <form style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {params.type && <input type="hidden" name="type" value={params.type} />}
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

        {/* Type chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {typeFilters.map(f => {
            const active = (params.type || '') === f.value
            return (
              <Link
                key={f.value}
                href={`/dashboard/payments?date=${selectedDate}${f.value ? `&type=${f.value}` : ''}`}
                style={{
                  background: active ? '#d4667a' : 'var(--bg-page)',
                  border: `1px solid ${active ? '#d4667a' : 'var(--border)'}`,
                  borderRadius: 20, padding: '4px 12px',
                  fontSize: 11, fontWeight: 600,
                  color: active ? '#fff' : 'var(--txt2)',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pending Exam Fees */}
      <ExamFeesList rows={pendingExamFees} isRtl={isRtl} selectedDate={selectedDate} />

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
              {cols.map(col => (
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
            {payments?.map((p: any, idx: number) => {
              const typeColor  = TYPE_COLORS[p.type] || '#b89990'
              const typeName   = L.types[p.type as keyof typeof L.types] || p.type
              const methodName = L.methods[p.payment_method as keyof typeof L.methods] || p.payment_method
              const isCash     = p.payment_method === 'cash'
              const displayDate = p.date
                ? new Date(p.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })
                : '—'
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* # */}
                  <td style={{ padding: '11px 14px', color: 'var(--txt2)', fontSize: 12 }}>{idx + 1}</td>
                  {/* Student */}
                  <td style={{ padding: '11px 14px' }}>
                    <Link href={`/dashboard/students/${p.student_id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{p.student?.name_ar || '—'}</p>
                      {p.student?.name_en && (
                        <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{p.student.name_en}</p>
                      )}
                    </Link>
                  </td>
                  {/* Type */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: typeColor + '18', color: typeColor,
                      border: `1px solid ${typeColor}28`,
                      borderRadius: 20, padding: '2px 10px',
                      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                      {typeName}
                    </span>
                  </td>
                  {/* Amount Due */}
                  <td style={{ padding: '11px 14px', color: 'var(--txt2)', fontSize: 12 }}>
                    {formatCurrency(p.amount_due)}
                  </td>
                  {/* Paid */}
                  <td style={{ padding: '11px 14px', color: '#3dab7e', fontSize: 13, fontWeight: 700 }}>
                    {formatCurrency(p.amount_paid)}
                  </td>
                  {/* Method */}
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: isCash ? '#3dab7e18' : '#4a90d918',
                      color: isCash ? '#3dab7e' : '#4a90d9',
                      border: `1px solid ${isCash ? '#3dab7e28' : '#4a90d928'}`,
                      borderRadius: 20, padding: '2px 10px',
                      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                      {methodName}
                    </span>
                  </td>
                  {/* Date */}
                  <td style={{ padding: '11px 14px', color: 'var(--txt2)', fontSize: 12 }}>{displayDate}</td>
                  {/* Staff */}
                  <td style={{ padding: '11px 14px', color: 'var(--txt2)', fontSize: 12 }}>{p.staff?.name || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!payments || payments.length === 0) && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13 }}>
            {L.noPayments}
          </div>
        )}
      </div>
    </div>
  )
}
