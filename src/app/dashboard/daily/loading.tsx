export default function Loading() {
  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%' }}>
      {/* Date nav */}
      <div className="sk" style={{ height: 52, borderRadius: 14, marginBottom: 16 }} />

      {/* KPI row */}
      <div className="kpi-grid-4" style={{ marginBottom: 20 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="sk" style={{ height: 88, borderRadius: 14 }} />
        ))}
      </div>

      {/* Session cards */}
      {[1, 2, 3].map(i => (
        <div key={i} className="sk" style={{ height: 280, borderRadius: 16, marginBottom: 14 }} />
      ))}
    </div>
  )
}
