import { Suspense } from 'react'
import { format } from 'date-fns'
import { getTranslations } from 'next-intl/server'
import DashboardKPIs from './_components/DashboardKPIs'
import DashboardRows from './_components/DashboardRows'

export const dynamic = 'force-dynamic'

function KPISkeleton() {
  return (
    <div className="kpi-grid-4" style={{ marginBottom: 16, alignItems: 'stretch' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="sk" style={{ height: 110, borderRadius: 16 }} />
      ))}
    </div>
  )
}

function RowsSkeleton() {
  return (
    <>
      <div className="kpi-grid-2" style={{ marginBottom: 16 }}>
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
      </div>
      <div className="kpi-grid-2">
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
      </div>
    </>
  )
}

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')

  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%' }}>

      {/* Header — renders immediately, no DB wait */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt1)', margin: 0, letterSpacing: -0.3 }}>
          {t('title')}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 4 }}>
          {format(new Date(), 'EEEE, dd/MM/yyyy')}
        </p>
      </div>

      {/* KPI Cards — streams in as first DB batch completes */}
      <Suspense fallback={<KPISkeleton />}>
        <DashboardKPIs />
      </Suspense>

      {/* Lists + tables — streams in independently */}
      <Suspense fallback={<RowsSkeleton />}>
        <DashboardRows />
      </Suspense>

    </div>
  )
}
