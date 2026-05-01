export default function Loading() {
  const sk = (w: string | number, h: number, r = 8) => (
    <div className="sk" style={{ width: w, height: h, borderRadius: r, flexShrink: 0 }} />
  )
  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        {sk(100, 11)}
        <div style={{ marginTop: 6 }}>{sk(160, 24, 6)}</div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid-4" style={{ marginBottom: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="sk" style={{ height: 110, borderRadius: 16 }} />
        ))}
      </div>

      {/* Row 2 */}
      <div className="kpi-grid-2" style={{ marginBottom: 16 }}>
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
      </div>

      {/* Row 3 */}
      <div className="kpi-grid-2">
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
        <div className="sk" style={{ height: 220, borderRadius: 16 }} />
      </div>
    </div>
  )
}
