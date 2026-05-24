type Sub = {
  id: string
  remaining_sessions: number | null
  total_sessions: number | null
  end_date: string | null
  start_date: string | null
  student: { id: string; name_ar: string; name_en: string | null; status: string } | null
  plan: { name: string } | null
}

function SubRow({ s, isRtl, today }: { s: Sub; isRtl: boolean; today: string }) {
  const rem   = s.remaining_sessions ?? 0
  const total = s.total_sessions ?? 0
  const pct   = total > 0 ? Math.round((rem / total) * 100) : 0
  const color = rem === 0 ? '#e04040' : rem <= 3 ? '#e8960a' : '#3dab7e'
  const name  = isRtl || !s.student?.name_en ? s.student?.name_ar : s.student?.name_en
  const init  = (s.student?.name_ar || '?').charAt(0)
  const expired = !!s.end_date && s.end_date < today

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: '#d4667a18', color: '#d4667a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>
        {init}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
          {s.plan?.name || (isRtl ? 'بدون خطة' : 'No plan')}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{rem} / {total}</span>
        <div style={{ width: 56, height: 4, borderRadius: 2, background: 'var(--border)' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color }} />
        </div>
      </div>
      {s.end_date && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0,
          background: expired ? '#e0404018' : '#4a90d918',
          color:      expired ? '#e04040'   : '#4a90d9',
          border: `1px solid ${expired ? '#e0404028' : '#4a90d928'}`,
        }}>
          {s.end_date}
        </span>
      )}
    </div>
  )
}

export default function DueDateTab({
  subscriptions,
  isRtl,
  today,
}: {
  subscriptions: Sub[]
  isRtl: boolean
  today: string
}) {
  const in7Str = (() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })()

  const overdue: Sub[] = []
  const soon:    Sub[] = []
  const ok:      Sub[] = []

  for (const s of subscriptions) {
    const rem     = s.remaining_sessions ?? 0
    const expired = !!s.end_date && s.end_date < today
    const nearEnd = !!s.end_date && s.end_date >= today && s.end_date <= in7Str

    if (rem === 0 || expired)   overdue.push(s)
    else if (rem <= 3 || nearEnd) soon.push(s)
    else                          ok.push(s)
  }

  const groups = [
    { key: 'overdue', label: isRtl ? 'منتهية' : 'Overdue',  color: '#e04040', items: overdue },
    { key: 'soon',    label: isRtl ? 'قريبة'  : 'Due Soon', color: '#e8960a', items: soon   },
    { key: 'ok',      label: isRtl ? 'نشطة'   : 'Active',   color: '#3dab7e', items: ok     },
  ]

  const total = subscriptions.length

  return (
    <div>
      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {groups.map(g => (
          <div key={g.key} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: `${g.color}12`, border: `1px solid ${g.color}28`,
            borderRadius: 10, padding: '8px 14px',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: g.color }}>{g.items.length}</span>
            <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>{g.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt1)' }}>{total}</span>
          <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>{isRtl ? 'إجمالي' : 'Total'}</span>
        </div>
      </div>

      {groups.map(g => g.items.length === 0 ? null : (
        <div key={g.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{
            padding: '10px 16px', background: `${g.color}08`,
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: g.color }}>{g.label}</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: `${g.color}18`, color: g.color, border: `1px solid ${g.color}28`,
            }}>
              {g.items.length}
            </span>
          </div>
          {g.items.map(s => (
            <SubRow key={s.id} s={s} isRtl={isRtl} today={today} />
          ))}
        </div>
      ))}

      {total === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
            {isRtl ? 'لا توجد اشتراكات نشطة' : 'No active subscriptions'}
          </p>
        </div>
      )}

      <div style={{ height: 32 }} />
    </div>
  )
}
