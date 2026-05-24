import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { CreditCard } from 'lucide-react'
import AddPaymentTypeForm from './AddPaymentTypeForm'
import PaymentTypeCard from './PaymentTypeCard'

export const dynamic = 'force-dynamic'

export default async function PaymentTypesPage() {
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const [{ data: methods }, { data: payments }] = await Promise.all([
    supabase.from('payment_methods').select('*').order('created_at'),
    supabase.from('payments').select('payment_method'),
  ])

  // Count how many payments use each slug
  const usageMap: Record<string, number> = {}
  ;(payments || []).forEach((p: any) => {
    if (p.payment_method) usageMap[p.payment_method] = (usageMap[p.payment_method] || 0) + 1
  })

  const allMethods = (methods || []).map((m: any) => ({
    ...m,
    usage: usageMap[m.slug] || 0,
  }))

  const activeCount   = allMethods.filter(m => m.is_active).length
  const inactiveCount = allMethods.filter(m => !m.is_active).length
  const totalUsage    = allMethods.reduce((s, m) => s + m.usage, 0)

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>
          {isRtl ? 'إدارة أنواع الدفع المقبولة في الأكاديمية' : 'Manage accepted payment types'}
        </p>
        <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>
          {isRtl ? 'أنواع الدفع' : 'Types of Payment'}
        </h1>
      </div>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: isRtl ? 'إجمالي الأنواع' : 'Total Types',    value: allMethods.length, color: '#d4667a', icon: <CreditCard size={14} color="#d4667a" /> },
          { label: isRtl ? 'مفعّلة'        : 'Active',           value: activeCount,        color: '#3dab7e', icon: '✓' },
          { label: isRtl ? 'معطّلة'        : 'Inactive',         value: inactiveCount,      color: 'var(--txt2)', icon: '—' },
          { label: isRtl ? 'إجمالي المعاملات' : 'Total Transactions', value: totalUsage,   color: '#4a90d9', icon: '🧾' },
        ].map((stat, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 12,
            background: 'var(--bg-card)', border: `1px solid ${stat.color}25`,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: typeof stat.color === 'string' ? stat.color + '15' : 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              {typeof stat.icon === 'string' ? stat.icon : stat.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)', fontWeight: 600 }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Add form */}
        <AddPaymentTypeForm isRtl={isRtl} />

        {/* Methods list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Active methods */}
          {allMethods.filter(m => m.is_active).length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#3dab7e', display: 'flex', alignItems: 'center', gap: 6 }}>
                ✓ {isRtl ? `أنواع مفعّلة (${activeCount})` : `Active (${activeCount})`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {allMethods.filter(m => m.is_active).map(m => (
                  <PaymentTypeCard key={m.id} method={m} isRtl={isRtl} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive methods */}
          {allMethods.filter(m => !m.is_active).length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                — {isRtl ? `أنواع معطّلة (${inactiveCount})` : `Inactive (${inactiveCount})`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {allMethods.filter(m => !m.is_active).map(m => (
                  <PaymentTypeCard key={m.id} method={m} isRtl={isRtl} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {allMethods.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '64px 0',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>
                {isRtl ? 'لا توجد أنواع دفع بعد' : 'No payment types yet'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--txt2)' }}>
                {isRtl ? 'أضف أول نوع دفع من النموذج' : 'Add your first payment type using the form'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
