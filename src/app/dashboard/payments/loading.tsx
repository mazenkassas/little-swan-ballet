export default function Loading() {
  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="sk" style={{ width: 120, height: 11, marginBottom: 6 }} />
        <div className="sk" style={{ width: 140, height: 24, borderRadius: 6 }} />
      </div>

      {/* KPI 3-col */}
      <div className="kpi-grid-3" style={{ marginBottom: 20 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="sk" style={{ height: 100, borderRadius: 14 }} />
        ))}
      </div>

      {/* Filter bar */}
      <div className="sk" style={{ height: 58, borderRadius: 14, marginBottom: 20 }} />

      {/* Table */}
      <div className="tbl-outer">
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 32 }}>
          {[30, 140, 90, 80, 70, 80, 60, 80].map((w, i) => (
            <div key={i} className="sk" style={{ width: w, height: 11 }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 32, alignItems: 'center' }}>
            <div className="sk" style={{ width: 24, height: 12 }} />
            <div className="sk" style={{ width: 130, height: 12 }} />
            <div className="sk" style={{ width: 70, height: 22, borderRadius: 20 }} />
            <div className="sk" style={{ width: 70, height: 12 }} />
            <div className="sk" style={{ width: 70, height: 12 }} />
            <div className="sk" style={{ width: 70, height: 22, borderRadius: 20 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
