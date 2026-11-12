import { Suspense } from 'react'
import DashboardHome from './_components/DashboardHome'
import Loading from './loading'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%' }}>
      <Suspense fallback={<Loading bare />}>
        <DashboardHome />
      </Suspense>
    </div>
  )
}
