export default function Loading() {
  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="sk" style={{ width: 120, height: 11, marginBottom: 6 }} />
          <div className="sk" style={{ width: 80, height: 22, borderRadius: 6 }} />
        </div>
        <div className="sk" style={{ width: 110, height: 34, borderRadius: 8 }} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[60, 50, 70, 55, 120].map((w, i) => (
          <div key={i} className="sk" style={{ width: w, height: 30, borderRadius: 8 }} />
        ))}
      </div>

      {/* Table */}
      <div className="tbl-outer">
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 40 }}>
          {[60, 140, 100, 50, 100, 70, 120].map((w, i) => (
            <div key={i} className="sk" style={{ width: w, height: 11 }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 40, alignItems: 'center' }}>
            <div className="sk" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
            <div className="sk" style={{ width: 130, height: 12 }} />
            <div className="sk" style={{ width: 90, height: 12 }} />
            <div className="sk" style={{ width: 40, height: 12 }} />
            <div className="sk" style={{ width: 80, height: 12 }} />
            <div className="sk" style={{ width: 60, height: 22, borderRadius: 20 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
