import { formatCurrency } from '@/lib/utils'

type SubPayment = {
  id: string
  amount_paid: number
  amount_due: number
  payment_method: string | null
  date: string
  created_at: string
  student: { id: string; name_ar: string; name_en: string | null } | null
  subscriptions: Array<{ plan: { name: string } | null }> | null
}

export default function PaymentDateTab({
  payments,
  isRtl,
}: {
  payments: SubPayment[]
  isRtl: boolean
}) {
  // Group by month YYYY-MM (already sorted newest-first from server)
  const byMonth = new Map<string, SubPayment[]>()
  for (const p of payments) {
    const key = p.date.substring(0, 7)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(p)
  }
  const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a))
  const grandTotal = payments.reduce((s, p) => s + (p.amount_paid ?? 0), 0)

  function monthLabel(ym: string) {
    const [y, m] = ym.split('-')
    return new Date(+y, +m - 1, 1).toLocaleDateString(
      isRtl ? 'ar-EG' : 'en-US',
      { month: 'long', year: 'numeric' },
    )
  }

  return (
    <div>
      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt1)' }}>{payments.length}</span>
          <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{isRtl ? 'دفعة' : 'payment(s)'}</span>
        </div>
        <div style={{ background: '#3dab7e12', border: '1px solid #3dab7e28', borderRadius: 10, padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#3dab7e' }}>{formatCurrency(grandTotal)}</span>
          <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{isRtl ? 'إجمالي' : 'total'}</span>
        </div>
      </div>

      {months.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
            {isRtl ? 'لا توجد مدفوعات اشتراك' : 'No subscription payments'}
          </p>
        </div>
      )}

      {months.map(ym => {
        const list      = byMonth.get(ym)!
        const monthTotal = list.reduce((s, p) => s + (p.amount_paid ?? 0), 0)

        return (
          <div key={ym} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            {/* Month header */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-page)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt1)' }}>{monthLabel(ym)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--txt2)' }}>
                  {list.length} {isRtl ? 'دفعة' : 'payment(s)'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#3dab7e' }}>
                  {formatCurrency(monthTotal)}
                </span>
              </div>
            </div>

            {list.map(p => {
              const name      = isRtl || !p.student?.name_en ? p.student?.name_ar : p.student?.name_en
              const init      = (p.student?.name_ar || '?').charAt(0)
              const planName  = p.subscriptions?.[0]?.plan?.name
              const method    = p.payment_method
              const methodClr = method === 'cash' ? '#3dab7e' : '#4a90d9'
              const methodLbl = method === 'instapay'
                ? 'Instapay'
                : method === 'cash'
                  ? (isRtl ? 'كاش' : 'Cash')
                  : (method ?? '')

              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: '#3dab7e18', color: '#3dab7e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {init}
                  </div>

                  {/* Name + plan */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </p>
                    {planName && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)' }}>{planName}</p>
                    )}
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 11, color: 'var(--txt2)', flexShrink: 0 }}>{p.date}</span>

                  {/* Method badge */}
                  {methodLbl && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                      background: `${methodClr}18`, color: methodClr,
                      border: `1px solid ${methodClr}28`,
                    }}>
                      {methodLbl}
                    </span>
                  )}

                  {/* Amount */}
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#3dab7e', flexShrink: 0 }}>
                    {formatCurrency(p.amount_paid)}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}

      <div style={{ height: 32 }} />
    </div>
  )
}
