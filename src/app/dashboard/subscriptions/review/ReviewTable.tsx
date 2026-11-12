'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { enableAutoCount, type ReviewRow } from '../actions'

const ACCENT = '#d4667a'

function fmt(d: string | null, isRtl: boolean) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function ReviewTable({ rows, autoCount, canEdit, isRtl }: {
  rows: ReviewRow[]; autoCount: boolean; canEdit: boolean; isRtl: boolean
}) {
  const router = useRouter()
  const [onlyChanged, setOnlyChanged] = useState(true)
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const L = isRtl ? {
    total: 'باقات نشطة', changed: 'ستتغير', toZero: 'ستصبح «مطلوب تجديد»',
    onlyChanged: 'المتغيرة فقط', all: 'الكل', search: 'ابحث…',
    col: { student: 'الطالبة', group: 'المجموعة', start: 'البداية', end: 'النهاية', now: 'الآن', next: 'بعد التفعيل' },
    left: 'متبقي', enable: 'تفعيل العد التلقائي لكل الباقات', confirm: (n: number) => `سيتم تحديث ${n} باقة الآن. متابعة؟`,
    on: 'العد التلقائي مفعّل. الأرقام تُحدَّث تلقائياً كل يوم وبعد كل تعديل.',
    done: (n: number) => `تم التفعيل ✓ — تم تحديث ${n} باقة`, none: 'لا توجد باقات',
    hint: 'لو تاريخ بداية باقة غير صحيح، صحّحه من صفحة الاشتراكات أولاً ثم ارجع هنا.',
  } : {
    total: 'Active packages', changed: 'Will change', toZero: "Will become 'Renewal due'",
    onlyChanged: 'Changed only', all: 'All', search: 'Search…',
    col: { student: 'Student', group: 'Group', start: 'Start', end: 'End', now: 'Now', next: 'After switch-on' },
    left: 'left', enable: 'Switch on automatic counting for all packages', confirm: (n: number) => `${n} packages will be updated now. Continue?`,
    on: 'Automatic counting is on. Numbers update by themselves every day and after every change.',
    done: (n: number) => `Switched on ✓ — ${n} packages updated`, none: 'No packages',
    hint: 'If a package start date is wrong, fix it on the Subscriptions page first, then come back here.',
  }

  const changed = rows.filter(r => r.changed)
  const toZero = changed.filter(r => r.next?.remaining === 0 && r.current.remaining > 0)
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter(r => (!onlyChanged || r.changed) && (!s || r.name.toLowerCase().includes(s) || r.group.toLowerCase().includes(s)))
  }, [rows, onlyChanged, q])

  async function enable() {
    if (!confirm(L.confirm(changed.length))) return
    setSaving(true); setMsg(null)
    const r = await enableAutoCount()
    setSaving(false)
    if (r.error) setMsg({ ok: false, text: r.error })
    else { setMsg({ ok: true, text: L.done(r.updated ?? 0) }); router.refresh() }
  }

  const card = (label: string, value: number, color: string) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  )
  const pill = (rem: number, total: number, color: string) => (
    <span style={{ fontSize: 12, fontWeight: 700, color, background: color + '18', border: `1px solid ${color}40`, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>
      {rem}/{total}
    </span>
  )
  const th: React.CSSProperties = { textAlign: 'start', fontSize: 11, fontWeight: 600, color: 'var(--txt2)', padding: '9px 12px', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { fontSize: 12, color: 'var(--txt1)', padding: '9px 12px', borderTop: '1px solid var(--border)' }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {card(L.total, rows.length, 'var(--txt1)')}
        {card(L.changed, changed.length, '#e8960a')}
        {card(L.toZero, toZero.length, '#e04040')}
      </div>

      {autoCount ? (
        <p style={{ fontSize: 13, fontWeight: 600, color: '#3dab7e', margin: '0 0 14px' }}>✓ {L.on}</p>
      ) : canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={enable} disabled={saving} style={{
            border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10,
            padding: '10px 16px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>{saving ? '…' : L.enable}</button>
          <span style={{ fontSize: 12, color: 'var(--txt2)', flex: '1 1 260px' }}>{L.hint}</span>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? '#3dab7e' : '#e04040', margin: '0 0 14px' }}>{msg.ok ? '' : '⚠ '}{msg.text}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={L.search} style={{
          flex: '1 1 200px', height: 38, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '0 12px', fontSize: 13, color: 'var(--txt1)', outline: 'none', fontFamily: 'inherit',
        }} />
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => setOnlyChanged(v)} style={{
            border: `1px solid ${onlyChanged === v ? ACCENT : 'var(--border)'}`, background: onlyChanged === v ? ACCENT + '18' : 'var(--bg-card)',
            color: onlyChanged === v ? ACCENT : 'var(--txt2)', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>{v ? `${L.onlyChanged} (${changed.length})` : `${L.all} (${rows.length})`}</button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg-page)' }}>
            <tr>{[L.col.student, L.col.group, L.col.start, L.col.end, L.col.now, L.col.next].map(c => <th key={c} style={th}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id} style={{ background: r.changed ? '#e8960a08' : undefined }}>
                <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                <td style={{ ...td, color: 'var(--txt2)', maxWidth: 260 }}>{r.group}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmt(r.start, isRtl)}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmt(r.end, isRtl)}</td>
                <td style={td}>{pill(r.current.remaining, r.current.total, 'var(--txt2)')}</td>
                <td style={td}>
                  {r.next
                    ? pill(r.next.remaining, r.next.total, r.next.remaining === 0 ? '#e04040' : r.changed ? '#e8960a' : '#3dab7e')
                    : <span style={{ color: 'var(--txt2)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p style={{ textAlign: 'center', color: 'var(--txt2)', fontSize: 13, padding: 24, margin: 0 }}>{L.none}</p>}
      </div>
    </>
  )
}
