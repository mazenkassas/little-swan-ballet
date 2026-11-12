// Skeleton matching the dashboard layout. `bare` skips the page padding when used inside the page.
export default function Loading({ bare = false }: { bare?: boolean }) {
  const sk = (h: number, extra: React.CSSProperties = {}) => <div className="sk" style={{ height: h, borderRadius: 14, ...extra }} />
  const body = (
    <div className="dh">
      <div className="dh-head">{sk(24, { width: 160, borderRadius: 6 })}<div style={{ marginTop: 8 }}>{sk(12, { width: 200, borderRadius: 6 })}</div></div>
      <div className="dh-stats">{[1, 2, 3, 4].map(i => <div key={i}>{sk(104)}</div>)}</div>
      <div className="dh-main">
        {sk(320)}
        <div className="dh-side">{sk(180)}{sk(140)}</div>
      </div>
    </div>
  )
  return bare ? body : <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%' }}>{body}</div>
}
