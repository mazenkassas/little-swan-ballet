'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, RefreshCw } from 'lucide-react'
import { getStudentDetail, renewSubscription, setAttendanceMark, type StudentDetail } from './actions'
import type { AttendanceStatus } from '@/lib/subscriptionLogic'

export type SubRow = {
  key: string
  studentId: string
  nameAr: string
  nameEn: string | null
  classId: string | null
  className: string | null
  remaining: number | null
  total: number | null
  startDate: string | null
  state: 'ok' | 'low' | 'due' | 'none' | 'upcoming'
}

type Filter = 'all' | 'due' | 'low' | 'none'

const ACCENT = '#d4667a'
const STATE_COLOR: Record<SubRow['state'], string> = {
  ok: '#3dab7e', upcoming: '#4a90d9', low: '#e8960a', due: '#e04040', none: '#888888',
}

const T = {
  en: {
    title: 'Subscriptions',
    subtitle: 'Renew packages and fix attendance for every student',
    search: 'Search student…',
    allGroups: 'All groups',
    filters: { all: 'All', due: 'Renewal due', low: '1 session left', none: 'No package' } as Record<Filter, string>,
    state: { ok: 'Active', upcoming: 'Starts soon', low: '1 left', due: 'Renewal due', none: 'No package' } as Record<SubRow['state'], string>,
    left: (r: number, t: number) => `${r} of ${t} left`,
    noGroup: 'No group',
    manage: 'Manage',
    empty: 'No students match',
    loading: 'Loading…',
    package: 'Current package',
    noPackage: 'This student has no active package for this group.',
    started: 'Started',
    starts: 'Starts',
    sessionsLeft: 'sessions left',
    renew: 'Renew package',
    plan: 'Plan',
    sessions: 'sessions',
    startDate: 'Start date',
    startHint: 'Filled in automatically using the same rule as the Daily page. You can change it.',
    recordPayment: 'Record payment',
    amount: 'Amount paid',
    method: 'Method',
    cash: 'Cash', instapay: 'Instapay',
    confirmRenew: 'Confirm renewal',
    cancel: 'Cancel',
    renewed: 'Package renewed ✓',
    attendance: 'Attendance',
    attHint: 'Present and Absent use a session. Make-up and holidays don’t.',
    noSessions: 'No sessions recorded for this group yet.',
    present: 'Present', absent: 'Absent', makeup: 'Make-up', clear: 'Clear',
    counted: 'Counts', notCounted: 'Not counted', beforePkg: 'Before package', holiday: 'Holiday',
    makeupsElsewhere: 'Make-up sessions in other groups',
    readOnly: 'You can view this page but not make changes.',
    error: 'Something went wrong',
  },
  ar: {
    title: 'الاشتراكات',
    subtitle: 'تجديد الباقات وتعديل الحضور لكل طالبة',
    search: 'ابحث عن طالبة…',
    allGroups: 'كل المجموعات',
    filters: { all: 'الكل', due: 'مطلوب تجديد', low: 'متبقي حصة', none: 'بدون باقة' } as Record<Filter, string>,
    state: { ok: 'نشط', upcoming: 'يبدأ قريباً', low: 'متبقي ١', due: 'مطلوب تجديد', none: 'بدون باقة' } as Record<SubRow['state'], string>,
    left: (r: number, t: number) => `متبقي ${r} من ${t}`,
    noGroup: 'بدون مجموعة',
    manage: 'إدارة',
    empty: 'لا توجد نتائج',
    loading: 'جارٍ التحميل…',
    package: 'الباقة الحالية',
    noPackage: 'لا توجد باقة نشطة لهذه الطالبة في هذه المجموعة.',
    started: 'بدأت',
    starts: 'تبدأ',
    sessionsLeft: 'حصص متبقية',
    renew: 'تجديد الباقة',
    plan: 'الباقة',
    sessions: 'حصص',
    startDate: 'تاريخ البداية',
    startHint: 'محسوب تلقائياً بنفس طريقة صفحة اليومية، ويمكنك تغييره.',
    recordPayment: 'تسجيل الدفع',
    amount: 'المبلغ المدفوع',
    method: 'طريقة الدفع',
    cash: 'كاش', instapay: 'انستاباي',
    confirmRenew: 'تأكيد التجديد',
    cancel: 'إلغاء',
    renewed: 'تم التجديد ✓',
    attendance: 'الحضور',
    attHint: 'الحضور والغياب يخصمان حصة. التعويض والإجازات لا تُخصم.',
    noSessions: 'لا توجد حصص مسجلة لهذه المجموعة بعد.',
    present: 'حاضرة', absent: 'غائبة', makeup: 'تعويض', clear: 'مسح',
    counted: 'تُحسب', notCounted: 'لا تُحسب', beforePkg: 'قبل الباقة', holiday: 'إجازة',
    makeupsElsewhere: 'حصص تعويض في مجموعات أخرى',
    readOnly: 'يمكنك عرض الصفحة فقط دون تعديل.',
    error: 'حدث خطأ',
  },
}

export default function SubscriptionsBoard({ rows, isRtl }: { rows: SubRow[]; isRtl: boolean }) {
  const L = isRtl ? T.ar : T.en
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [groupId, setGroupId] = useState('')
  const [open, setOpen] = useState<SubRow | null>(null)

  const groups = useMemo(() => {
    const m = new Map<string, string>()
    rows.forEach(r => { if (r.classId && r.className) m.set(r.classId, r.className) })
    return [...m].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const counts = useMemo(() => ({
    all: rows.length,
    due: rows.filter(r => r.state === 'due').length,
    low: rows.filter(r => r.state === 'low').length,
    none: rows.filter(r => r.state === 'none').length,
  }), [rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const order: Record<SubRow['state'], number> = { due: 0, low: 1, none: 2, upcoming: 3, ok: 4 }
    return rows
      .filter(r => filter === 'all' || r.state === filter)
      .filter(r => !groupId || r.classId === groupId)
      .filter(r => !q || r.nameAr.toLowerCase().includes(q) || (r.nameEn || '').toLowerCase().includes(q))
      .sort((a, b) => order[a.state] - order[b.state] || name(a, isRtl).localeCompare(name(b, isRtl)))
  }, [rows, query, filter, groupId, isRtl])

  return (
    <div className={isRtl ? 'lss-rtl' : undefined} style={{ padding: '20px 16px', maxWidth: 980, margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
      <style>{SELECT_CSS}</style>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{L.title}</h1>
      <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '4px 0 16px' }}>{L.subtitle}</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {(['all', 'due', 'low', 'none'] as Filter[]).map(f => {
          const on = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              border: `1px solid ${on ? ACCENT : 'var(--border)'}`, background: on ? ACCENT + '18' : 'var(--bg-card)',
              color: on ? ACCENT : 'var(--txt2)', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {L.filters[f]} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt2)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={L.search} style={{ ...input, height: 40, paddingInlineStart: 34 }} />
        </div>
        <select className="lss-select" value={groupId} onChange={e => setGroupId(e.target.value)} style={{ flex: '1 1 240px' }} title={groups.find(g => g[0] === groupId)?.[1] ?? L.allGroups}>
          <option value="">{L.allGroups}</option>
          {groups.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </div>

      {/* List */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {visible.length === 0 && <p style={{ textAlign: 'center', color: 'var(--txt2)', fontSize: 13, padding: 28, margin: 0 }}>{L.empty}</p>}
        {visible.map((r, i) => {
          const color = STATE_COLOR[r.state]
          const pct = r.total ? Math.max(0, Math.min(1, (r.remaining ?? 0) / r.total)) : 0
          return (
            <button key={r.key} onClick={() => setOpen(r)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', textAlign: 'start',
              background: 'transparent', border: 'none', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer', color: 'inherit',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(r, isRtl)}</div>
                <div style={{ fontSize: 12, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.className || L.noGroup}</div>
              </div>
              {r.total != null && (
                <div style={{ width: 110, flexShrink: 0 }} className="hidden sm:block">
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 4 }}>{L.left(r.remaining ?? 0, r.total)}</div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
                    <div style={{ height: 6, borderRadius: 3, width: `${pct * 100}%`, background: color }} />
                  </div>
                </div>
              )}
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color, background: color + '18', border: `1px solid ${color}40`, borderRadius: 20, padding: '3px 10px' }}>
                {r.state === 'ok' && r.total != null ? `${r.remaining}/${r.total}` : L.state[r.state]}
              </span>
            </button>
          )
        })}
      </div>

      {open && <StudentPanel row={open} isRtl={isRtl} onClose={() => setOpen(null)} />}
    </div>
  )
}

function name(r: { nameAr: string; nameEn: string | null }, isRtl: boolean) {
  return isRtl ? r.nameAr || r.nameEn || '' : r.nameEn || r.nameAr
}

const input: React.CSSProperties = {
  width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: 'var(--txt1)', outline: 'none', fontFamily: 'inherit',
}

/* ─────────────────────────── Student panel ─────────────────────────── */

function StudentPanel({ row, isRtl, onClose }: { row: SubRow; isRtl: boolean; onClose: () => void }) {
  const L = isRtl ? T.ar : T.en
  const router = useRouter()
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [renewOpen, setRenewOpen] = useState(false)
  const [flash, setFlash] = useState('')

  async function load() {
    const r = await getStudentDetail(row.studentId, row.classId)
    if (r.error || !r.data) setError(r.error || L.error)
    else { setDetail(r.data); setError('') }
  }

  useEffect(() => {
    let cancelled = false
    getStudentDetail(row.studentId, row.classId).then(r => {
      if (cancelled) return
      if (r.error || !r.data) setError(r.error || L.error)
      else setDetail(r.data)
    })
    return () => { cancelled = true }
  }, [row.studentId, row.classId, L.error])

  async function mark(sessionId: string, status: AttendanceStatus) {
    setBusy(sessionId); setError('')
    const r = await setAttendanceMark({ studentId: row.studentId, sessionId, status })
    if (r.error) setError(r.error)
    await load()
    setBusy(null)
    router.refresh()
  }

  const sub = detail?.sub
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, height: '100%', overflowY: 'auto', background: 'var(--bg-page)',
        direction: isRtl ? 'rtl' : 'ltr', padding: '18px 16px 40px', boxShadow: '0 0 30px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt1)' }}>{name(row, isRtl)}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{row.className || L.noGroup}</div>
          </div>
          <button onClick={onClose} aria-label={L.cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt2)', padding: 4 }}><X size={20} /></button>
        </div>

        {!detail && !error && <p style={{ color: 'var(--txt2)', fontSize: 13 }}>{L.loading}</p>}
        {error && <p style={{ color: '#e04040', fontSize: 13, margin: '0 0 12px' }}>⚠ {error}</p>}
        {flash && <p style={{ color: '#3dab7e', fontSize: 13, margin: '0 0 12px', fontWeight: 600 }}>{flash}</p>}

        {detail && (
          <>
            {!detail.canEdit && <p style={{ fontSize: 12, color: 'var(--txt2)', margin: '0 0 12px' }}>{L.readOnly}</p>}

            {/* Package */}
            <section style={box}>
              <div style={label}>{L.package}</div>
              {sub ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: sub.remaining_sessions === 0 ? '#e04040' : 'var(--txt1)' }}>
                    {sub.remaining_sessions}<span style={{ fontSize: 16, color: 'var(--txt2)', fontWeight: 600 }}> / {sub.total_sessions}</span>
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--txt2)' }}>{L.sessionsLeft}</span>
                  <div style={{ width: '100%', fontSize: 12, color: 'var(--txt2)' }}>
                    {sub.start_date > detail.today ? L.starts : L.started}: {fmt(sub.start_date)}{sub.planName ? ` · ${sub.planName}` : ''}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>{L.noPackage}</p>
              )}
              {detail.canEdit && !renewOpen && (
                <button onClick={() => { setRenewOpen(true); setFlash('') }} style={{ ...primaryBtn, marginTop: 14 }}>
                  <RefreshCw size={15} /> {L.renew}
                </button>
              )}
              {detail.canEdit && renewOpen && (
                <RenewForm detail={detail} row={row} isRtl={isRtl} onCancel={() => setRenewOpen(false)} onDone={async () => {
                  setRenewOpen(false); setFlash(L.renewed); await load(); router.refresh()
                }} />
              )}
            </section>

            {/* Attendance */}
            <section style={box}>
              <div style={label}>{L.attendance}</div>
              <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '0 0 10px' }}>{L.attHint}</p>
              {detail.sessions.length === 0 && <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>{L.noSessions}</p>}
              {detail.sessions.map(s => {
                const tag = s.holiday ? L.holiday
                  : !sub || s.date < sub.start_date ? L.beforePkg
                  : s.counts && (s.status === 'present' || s.status === 'absent') ? L.counted
                  : null
                return (
                  <div key={s.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)', opacity: busy === s.id ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', flex: 1 }}>{fmt(s.date)}</span>
                      {tag && <span style={{ fontSize: 10, color: 'var(--txt2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 7px' }}>{tag}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {([['present', L.present, '#3dab7e'], ['absent', L.absent, '#e04040'], ['make_up', L.makeup, '#4a90d9']] as const).map(([v, text, c]) => {
                        const on = s.status === v
                        return (
                          <button key={v} disabled={!detail.canEdit || !!busy}
                            onClick={() => mark(s.id, on ? null : v)}
                            style={{
                              flex: '1 1 0', minWidth: 70, padding: '7px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              border: `1px solid ${on ? c : 'var(--border)'}`, background: on ? c + '22' : 'var(--bg-card)',
                              color: on ? c : 'var(--txt2)', cursor: detail.canEdit ? 'pointer' : 'default',
                            }}>
                            {text}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {detail.makeups.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...label, marginBottom: 6 }}>{L.makeupsElsewhere}</div>
                  {detail.makeups.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--txt2)', padding: '3px 0' }}>{fmt(m.date)} · {m.className}</div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function RenewForm({ detail, row, isRtl, onCancel, onDone }: {
  detail: StudentDetail; row: SubRow; isRtl: boolean; onCancel: () => void; onDone: () => void
}) {
  const L = isRtl ? T.ar : T.en
  const defaultPlan = detail.plans.find(p => p.id === detail.sub?.plan_id) ?? detail.plans[0]
  const [planId, setPlanId] = useState(defaultPlan?.id ?? '')
  const [startDate, setStartDate] = useState(detail.suggestedStart)
  const [pay, setPay] = useState(true)
  const [amount, setAmount] = useState(String(detail.student.fee ?? defaultPlan?.price ?? ''))
  const [method, setMethod] = useState<'cash' | 'instapay'>('cash')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    setSaving(true); setErr('')
    const r = await renewSubscription({
      studentId: row.studentId, classId: row.classId, planId, startDate,
      recordPayment: pay, amount: Number(amount), method,
    })
    setSaving(false)
    if (r.error) setErr(r.error)
    else onDone()
  }

  return (
    <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
      <label style={field}>
        <span style={label}>{L.plan}</span>
        <select value={planId} onChange={e => {
          setPlanId(e.target.value)
          if (detail.student.fee == null) setAmount(String(detail.plans.find(p => p.id === e.target.value)?.price ?? ''))
        }} className="lss-select">
          {detail.plans.map(p => <option key={p.id} value={p.id}>{p.name} · {p.sessions_count} {L.sessions}</option>)}
        </select>
      </label>
      <label style={field}>
        <span style={label}>{L.startDate}</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...input, direction: 'ltr' }} />
        <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{L.startHint}</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--txt1)', cursor: 'pointer' }}>
        <input type="checkbox" checked={pay} onChange={e => setPay(e.target.checked)} style={{ width: 16, height: 16, accentColor: ACCENT }} />
        {L.recordPayment}
      </label>
      {pay && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ ...field, flex: '1 1 140px' }}>
            <span style={label}>{L.amount}</span>
            <input type="number" min={0} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...input, direction: 'ltr' }} />
          </label>
          <div style={{ ...field, flex: '1 1 160px' }}>
            <span style={label}>{L.method}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['cash', 'instapay'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)} style={{
                  flex: 1, padding: '9px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${method === m ? ACCENT : 'var(--border)'}`, background: method === m ? ACCENT + '18' : 'var(--bg-card)',
                  color: method === m ? ACCENT : 'var(--txt2)',
                }}>{L[m]}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      {err && <p style={{ color: '#e04040', fontSize: 12, margin: 0 }}>⚠ {err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={saving || !planId || !startDate} style={{ ...primaryBtn, flex: 1, opacity: saving ? 0.6 : 1 }}>
          {saving ? '…' : L.confirmRenew}
        </button>
        <button onClick={onCancel} disabled={saving} style={{ ...primaryBtn, background: 'var(--bg-card)', color: 'var(--txt2)', border: '1px solid var(--border)' }}>
          {L.cancel}
        </button>
      </div>
    </div>
  )
}

const box: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 14 }
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--txt2)', marginBottom: 8 }
const field: React.CSSProperties = { display: 'grid', gap: 4 }
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 10,
  border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

// Themed dropdowns (same approach as the inventory page): no native look,
// readable options in light and dark mode, arrow on the correct side for RTL.
const SELECT_CSS = `
.lss-select{appearance:none;-webkit-appearance:none;width:100%;min-width:0;height:40px;cursor:pointer;
  font-family:inherit;font-size:13px;color:var(--txt1);background-color:var(--bg-card);
  border:1px solid var(--border);border-radius:10px;outline:none;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a8f95' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;padding:0 34px 0 12px;transition:border-color .15s}
[dir=rtl] .lss-select,.lss-rtl .lss-select{background-position:left 12px center;padding:0 12px 0 34px}
.lss-select:hover{border-color:#d4667a99}
.lss-select:focus{border-color:#d4667a}
.lss-select option{background:var(--bg-popup);color:var(--txt1)}
`
