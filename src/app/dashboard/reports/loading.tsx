export default function Loading() {
  return (
    <div style={{ padding: 32, background: 'var(--bg-page)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="sk" style={{ width: 100, height: 22, borderRadius: 6, marginBottom: 8 }} />
        <div className="sk" style={{ width: 220, height: 13 }} />
      </div>

      {/* KPI 4-col */}
      <div className="kpi-grid-4" style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="sk" style={{ height: 90, borderRadius: 16 }} />
        ))}
      </div>

      {/* Chart */}
      <div className="sk" style={{ height: 340, borderRadius: 16, marginBottom: 16 }} />

      {/* By type */}
      <div className="sk" style={{ height: 200, borderRadius: 16 }} />
    </div>
  )
}
