'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, RefreshCw, Filter as FilterIcon, Check, CalendarDays } from 'lucide-react'
import { getStudentDetail, renewSubscription, setAttendanceMark, updatePackageDates, type StudentDetail } from './actions'
import type { AttendanceStatus } from '@/lib/subscriptionLogic'
import { compareClassNames } from '@/lib/classOrder'

export type SubRow = {
  key: string
  studentId: string
  nameAr: string
  nameEn: string | null
  subscriptionId: string | null
  classId: string | null
  className: string | null
  otherGroups: string[]
  remaining: number | null
  total: number | null
  startDate: string | null
  endDate: string | null
  expectedEnd: string | null
  /** first class after the package ends — when the next package starts */
  renewalDate: string | null
  /** due = on or before today, soon = within 7 days */
  renewalWhen: 'due' | 'soon' | 'later' | null
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
    subtitle: 'Renew packages, set package dates and fix attendance for every student',
    search: 'Search student…',
    groups: 'Groups',
    allGroups: 'All groups',
    searchGroups: 'Search groups…',
    noGroupsFound: 'No groups found',
    filters: { all: 'All', due: 'Renewal due', low: '1 session left', none: 'No package' } as Record<Filter, string>,
    state: { ok: 'Active', upcoming: 'Starts soon', low: '1 left', due: 'Renewal due', none: 'No package' } as Record<SubRow['state'], string>,
    left: (r: number, t: number) => `${r} of ${t} left`,
    noGroup: 'No group',
    alsoIn: 'Also in',
    empty: 'No students match',
    start: 'Start',
    end: 'End',
    renewal: 'Renewal',
    renewalHint: 'Next package starts on this day (first class after the package ends). Click to renew.',
    expected: 'expected',
    setEnd: 'Set end',
    saveDates: 'Save',
    datesHint: 'Classes between these dates become the package sessions.',
    datesSaved: (t: number, r: number) => `Saved: ${t} classes, ${r} left`,
    needPackage: 'Renew first to set dates',
    loading: 'Loading…',
    package: 'Current package',
    noPackage: 'This student has no active package for this group.',
    started: 'Started',
    starts: 'Starts',
    ends: 'Ends',
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
    attHint: 'Every class in the package uses a session once its day has passed, marked or not. Make-up and holidays don’t — the package moves on by one class.',
    noSessions: 'This group has no class days set.',
    used: 'Used', todayTag: 'Today', upcoming: 'Upcoming',
    autoPreview: (r: number, t: number) => `Automatic count: ${r} of ${t} left — not switched on yet`,
    autoOff: 'Automatic session counting is off. Numbers only change when attendance is marked.',
    autoReview: 'Review and switch on',
    present: 'Present', absent: 'Absent', makeup: 'Make-up', clear: 'Clear',
    counted: 'Counts', notCounted: 'Not counted', beforePkg: 'Before package', afterPkg: 'After package', holiday: 'Holiday',
    makeupsElsewhere: 'Make-up sessions in other groups',
    readOnly: 'You can view this page but not make changes.',
    error: 'Something went wrong',
  },
  ar: {
    title: 'الاشتراكات',
    subtitle: 'تجديد الباقات وتحديد تواريخها وتعديل الحضور لكل طالبة',
    search: 'ابحث عن طالبة…',
    groups: 'المجموعات',
    allGroups: 'كل المجموعات',
    searchGroups: 'ابحث عن مجموعة…',
    noGroupsFound: 'لا توجد مجموعات',
    filters: { all: 'الكل', due: 'مطلوب تجديد', low: 'متبقي حصة', none: 'بدون باقة' } as Record<Filter, string>,
    state: { ok: 'نشط', upcoming: 'يبدأ قريباً', low: 'متبقي ١', due: 'مطلوب تجديد', none: 'بدون باقة' } as Record<SubRow['state'], string>,
    left: (r: number, t: number) => `متبقي ${r} من ${t}`,
    noGroup: 'بدون مجموعة',
    alsoIn: 'أيضاً في',
    empty: 'لا توجد نتائج',
    start: 'البداية',
    end: 'النهاية',
    renewal: 'التجديد',
    renewalHint: 'تبدأ الباقة الجديدة في هذا اليوم (أول حصة بعد انتهاء الباقة). اضغط للتجديد.',
    expected: 'متوقع',
    setEnd: 'حدد النهاية',
    saveDates: 'حفظ',
    datesHint: 'الحصص بين هذين التاريخين هي حصص الباقة.',
    datesSaved: (t: number, r: number) => `تم الحفظ: ${t} حصص، متبقي ${r}`,
    needPackage: 'جدّد الباقة أولاً لتحديد التواريخ',
    loading: 'جارٍ التحميل…',
    package: 'الباقة الحالية',
    noPackage: 'لا توجد باقة نشطة لهذه الطالبة في هذه المجموعة.',
    started: 'بدأت',
    starts: 'تبدأ',
    ends: 'تنتهي',
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
    attHint: 'كل حصة في الباقة تُخصم تلقائياً بمجرد مرور يومها، سواء سُجل الحضور أم لا. التعويض والإجازات لا تُخصم وتمتد الباقة حصة.',
    noSessions: 'لم تُحدد أيام الحصص لهذه المجموعة.',
    used: 'تم خصمها', todayTag: 'اليوم', upcoming: 'قادمة',
    autoPreview: (r: number, t: number) => `العد التلقائي: متبقي ${r} من ${t} — لم يُفعّل بعد`,
    autoOff: 'العد التلقائي للحصص غير مفعّل. الأرقام تتغير فقط عند تسجيل الحضور.',
    autoReview: 'مراجعة وتفعيل',
    present: 'حاضرة', absent: 'غائبة', makeup: 'تعويض', clear: 'مسح',
    counted: 'تُحسب', notCounted: 'لا تُحسب', beforePkg: 'قبل الباقة', afterPkg: 'بعد الباقة', holiday: 'إجازة',
    makeupsElsewhere: 'حصص تعويض في مجموعات أخرى',
    readOnly: 'يمكنك عرض الصفحة فقط دون تعديل.',
    error: 'حدث خطأ',
  },
}

function fmtDate(d: string, isRtl: boolean) {
  return new Date(d + 'T00:00:00').toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function SubscriptionsBoard({ rows, isRtl, canEdit, autoCount }: { rows: SubRow[]; isRtl: boolean; canEdit: boolean; autoCount: boolean }) {
  const L = isRtl ? T.ar : T.en
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [groupId, setGroupId] = useState('')
  const [open, setOpen] = useState<SubRow | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const groups = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>()
    rows.forEach(r => {
      if (!r.classId || !r.className) return
      const g = m.get(r.classId) ?? { name: r.className, count: 0 }
      g.count++
      m.set(r.classId, g)
    })
    return [...m].map(([id, g]) => ({ id, ...g })).sort((a, b) => compareClassNames(a.name, b.name))
  }, [rows])

  const inGroup = useMemo(() => rows.filter(r => !groupId || r.classId === groupId), [rows, groupId])
  const counts = useMemo(() => ({
    all: inGroup.length,
    due: inGroup.filter(r => r.state === 'due').length,
    low: inGroup.filter(r => r.state === 'low').length,
    none: inGroup.filter(r => r.state === 'none').length,
  }), [inGroup])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const order: Record<SubRow['state'], number> = { due: 0, low: 1, none: 2, upcoming: 3, ok: 4 }
    return inGroup
      .filter(r => filter === 'all' || r.state === filter)
      .filter(r => !q || r.nameAr.toLowerCase().includes(q) || (r.nameEn || '').toLowerCase().includes(q))
      .sort((a, b) => order[a.state] - order[b.state] || name(a, isRtl).localeCompare(name(b, isRtl)))
  }, [inGroup, query, filter, isRtl])

  return (
    <div className={isRtl ? 'lss-rtl' : undefined} style={{ padding: '20px 16px', maxWidth: 1080, margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
      <style>{SELECT_CSS}</style>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{L.title}</h1>
      <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '4px 0 16px' }}>{L.subtitle}</p>

      {!autoCount && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14, padding: '10px 14px',
          borderRadius: 12, border: '1px solid #e8960a55', background: '#e8960a12', fontSize: 13, color: 'var(--txt1)',
        }}>
          <span style={{ flex: '1 1 240px' }}>{L.autoOff}</span>
          <Link href="/dashboard/subscriptions/review" style={{ ...primaryBtn, padding: '7px 14px', textDecoration: 'none' }}>{L.autoReview}</Link>
        </div>
      )}

      {/* Search + group filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt2)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={L.search} style={{ ...input, height: 40, paddingInlineStart: 34 }} />
        </div>
        <GroupFilter groups={groups} value={groupId} onChange={setGroupId} isRtl={isRtl} />
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
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

      {/* List */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {visible.length === 0 && <p style={{ textAlign: 'center', color: 'var(--txt2)', fontSize: 13, padding: 28, margin: 0 }}>{L.empty}</p>}
        {visible.map((r, i) => {
          const color = STATE_COLOR[r.state]
          return (
            <div key={r.key} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flexWrap: 'wrap' }}>
                {/* Name → opens panel */}
                <button onClick={() => setOpen(r)} style={{ flex: '1 1 200px', minWidth: 0, textAlign: 'start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(r, isRtl)}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.className || L.noGroup}</div>
                  {r.otherGroups.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--txt2)', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L.alsoIn}: {r.otherGroups.join(' · ')}</div>
                  )}
                </button>

                {/* Start / End date buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                  <DateChip label={L.start} value={r.startDate ? fmtDate(r.startDate, isRtl) : '—'} disabled={!r.subscriptionId || !canEdit}
                    title={!r.subscriptionId ? L.needPackage : undefined} onClick={() => setEditing(editing === r.key ? null : r.key)} active={editing === r.key} />
                  <DateChip label={L.end}
                    value={r.endDate ? fmtDate(r.endDate, isRtl) : r.expectedEnd ? `~${fmtDate(r.expectedEnd, isRtl)}` : r.subscriptionId ? L.setEnd : '—'}
                    muted={!r.endDate} disabled={!r.subscriptionId || !canEdit}
                    title={!r.subscriptionId ? L.needPackage : !r.endDate && r.expectedEnd ? L.expected : undefined}
                    onClick={() => setEditing(editing === r.key ? null : r.key)} active={editing === r.key} />
                  {r.subscriptionId && (
                    <RenewalChip label={L.renewal} date={r.renewalDate ? fmtDate(r.renewalDate, isRtl) : '—'} when={r.renewalWhen}
                      title={L.renewalHint} onClick={() => setOpen(r)} />
                  )}
                </div>

                {/* Status */}
                <span style={{ flexShrink: 0, minWidth: 64, textAlign: 'center', fontSize: 11, fontWeight: 700, color, background: color + '18', border: `1px solid ${color}40`, borderRadius: 20, padding: '3px 10px' }}>
                  {r.state === 'ok' && r.total != null ? `${r.remaining}/${r.total}` : L.state[r.state]}
                </span>
              </div>
              {editing === r.key && r.subscriptionId && (
                <DatesEditor row={r} isRtl={isRtl} onClose={() => setEditing(null)} />
              )}
            </div>
          )
        })}
      </div>

      {open && <StudentPanel row={open} isRtl={isRtl} onClose={() => setOpen(null)} />}
    </div>
  )
}

const RENEWAL_COLOR = { due: '#e04040', soon: '#e8960a', later: '#4a90d9' } as const

function RenewalChip({ label, date, when, title, onClick }: {
  label: string; date: string; when: SubRow['renewalWhen']; title: string; onClick: () => void
}) {
  const c = RENEWAL_COLOR[when ?? 'later']
  return (
    <button onClick={onClick} title={title} style={{
      display: 'grid', gap: 1, textAlign: 'start', minWidth: 92, padding: '5px 10px', borderRadius: 10,
      border: `1px solid ${c}55`, background: c + '14', cursor: 'pointer',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: c }}>
        <RefreshCw size={11} /> {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: c, whiteSpace: 'nowrap' }}>{date}</span>
    </button>
  )
}

function DateChip({ label, value, onClick, disabled, muted, active, title }: {
  label: string; value: string; onClick: () => void; disabled?: boolean; muted?: boolean; active?: boolean; title?: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      display: 'grid', gap: 1, textAlign: 'start', minWidth: 92, padding: '5px 10px', borderRadius: 10,
      border: `1px solid ${active ? ACCENT : 'var(--border)'}`, background: active ? ACCENT + '14' : 'var(--bg-page)',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--txt2)' }}>
        <CalendarDays size={11} /> {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: muted ? 'var(--txt2)' : 'var(--txt1)', whiteSpace: 'nowrap' }}>{value}</span>
    </button>
  )
}

function DatesEditor({ row, isRtl, onClose }: { row: SubRow; isRtl: boolean; onClose: () => void }) {
  const L = isRtl ? T.ar : T.en
  const router = useRouter()
  const [start, setStart] = useState(row.startDate ?? '')
  const [end, setEnd] = useState(row.endDate ?? row.expectedEnd ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    if (!row.subscriptionId) return
    setSaving(true); setMsg(null)
    const r = await updatePackageDates({ subscriptionId: row.subscriptionId, startDate: start, endDate: end })
    setSaving(false)
    if (r.error) setMsg({ ok: false, text: r.error })
    else { setMsg({ ok: true, text: L.datesSaved(r.total ?? 0, r.remaining ?? 0) }); router.refresh() }
  }

  return (
    <div style={{ padding: '0 16px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <label style={{ ...field, flex: '1 1 150px' }}>
        <span style={label}>{L.start}</span>
        <input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ ...input, height: 40, direction: 'ltr' }} />
      </label>
      <label style={{ ...field, flex: '1 1 150px' }}>
        <span style={label}>{L.end}</span>
        <input type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} style={{ ...input, height: 40, direction: 'ltr' }} />
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} disabled={saving || !start || !end} style={{ ...primaryBtn, height: 40, opacity: saving || !start || !end ? 0.6 : 1 }}>
          {saving ? '…' : L.saveDates}
        </button>
        <button onClick={onClose} disabled={saving} style={{ ...primaryBtn, height: 40, background: 'var(--bg-card)', color: 'var(--txt2)', border: '1px solid var(--border)' }}>
          {L.cancel}
        </button>
      </div>
      <p style={{ width: '100%', margin: 0, fontSize: 11, color: msg ? (msg.ok ? '#3dab7e' : '#e04040') : 'var(--txt2)', fontWeight: msg ? 600 : 400 }}>
        {msg ? (msg.ok ? '✓ ' : '⚠ ') + msg.text : L.datesHint}
      </p>
    </div>
  )
}

function GroupFilter({ groups, value, onChange, isRtl }: {
  groups: { id: string; name: string; count: number }[]; value: string; onChange: (id: string) => void; isRtl: boolean
}) {
  const L = isRtl ? T.ar : T.en
  const [openList, setOpenList] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = groups.find(g => g.id === value)

  useEffect(() => {
    if (!openList) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpenList(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenList(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [openList])

  const list = groups.filter(g => !q.trim() || g.name.toLowerCase().includes(q.trim().toLowerCase()))
  const pick = (id: string) => { onChange(id); setOpenList(false); setQ('') }

  return (
    <div ref={ref} style={{ position: 'relative', flex: '0 1 300px', minWidth: 0 }}>
      <button onClick={() => setOpenList(o => !o)} title={selected?.name} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 40, padding: '0 12px', borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${value || openList ? ACCENT : 'var(--border)'}`, background: value ? ACCENT + '14' : 'var(--bg-card)',
        color: value ? ACCENT : 'var(--txt1)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      }}>
        <FilterIcon size={15} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, textAlign: 'start', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : `${L.groups}: ${L.allGroups}`}
        </span>
        {value && (
          <span role="button" aria-label={L.allGroups} onClick={e => { e.stopPropagation(); pick('') }} style={{ display: 'flex', flexShrink: 0 }}>
            <X size={15} />
          </span>
        )}
      </button>
      {openList && (
        <div style={{
          position: 'absolute', top: 46, insetInlineEnd: 0, zIndex: 40, width: 'min(360px, calc(100vw - 32px))',
          background: 'var(--bg-popup)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={L.searchGroups} style={{ ...input, height: 36, background: 'var(--bg-page)' }} />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: 4 }}>
            {[{ id: '', name: L.allGroups, count: groups.reduce((n, g) => n + g.count, 0) }, ...list].map(g => {
              const on = g.id === value
              return (
                <button key={g.id || 'all'} onClick={() => pick(g.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: on ? ACCENT + '18' : 'transparent', color: on ? ACCENT : 'var(--txt1)', fontSize: 13, textAlign: 'start', fontFamily: 'inherit',
                }}>
                  <span style={{ width: 16, flexShrink: 0 }}>{on && <Check size={15} />}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--txt2)', flexShrink: 0 }}>{g.count}</span>
                </button>
              )
            })}
            {list.length === 0 && <p style={{ fontSize: 12, color: 'var(--txt2)', textAlign: 'center', margin: 10 }}>{L.noGroupsFound}</p>}
          </div>
        </div>
      )}
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

  async function mark(date: string, status: AttendanceStatus) {
    if (!row.classId) return
    setBusy(date); setError('')
    const r = await setAttendanceMark({ studentId: row.studentId, classId: row.classId, date, status })
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
                    {sub.start_date > detail.today ? L.starts : L.started}: {fmt(sub.start_date)}
                    {sub.expected_end ? ` · ${L.ends}: ${fmt(sub.expected_end)}` : ''}
                    {sub.planName ? ` · ${sub.planName}` : ''}
                  </div>
                  {!detail.autoCount && sub.auto && (sub.auto.remaining !== sub.remaining_sessions || sub.auto.total !== sub.total_sessions) && (
                    <div style={{ width: '100%', marginTop: 6, fontSize: 12, color: '#e8960a', fontWeight: 600 }}>
                      {L.autoPreview(sub.auto.remaining, sub.auto.total)}
                    </div>
                  )}
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
              {detail.sessions.length === 0 && <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>{sub ? L.noSessions : L.noPackage}</p>}
              {detail.sessions.map((s, i) => {
                const n = detail.sessions.slice(0, i + 1).filter(x => x.state !== 'skipped').length
                const tag = s.state === 'skipped'
                  ? { text: s.holiday !== null ? `${L.holiday}${s.holiday ? ` · ${s.holiday}` : ''} — ${L.notCounted}` : `${L.makeup} — ${L.notCounted}`, color: '#4a90d9' }
                  : s.state === 'used' ? { text: L.used, color: '#3dab7e' }
                  : s.state === 'today' ? { text: L.todayTag, color: '#e8960a' }
                  : { text: L.upcoming, color: '#8a8a9a' }
                const future = s.date > detail.today
                const canMark = detail.canEdit && !future && s.holiday === null
                return (
                  <div key={s.date} style={{ padding: '10px 0', borderTop: '1px solid var(--border)', opacity: busy === s.date ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: future ? 0 : 6 }}>
                      {s.state !== 'skipped' && (
                        <span style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tag.color + '22', color: tag.color }}>{n}</span>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', flex: 1 }}>{fmt(s.date)}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: tag.color, border: `1px solid ${tag.color}55`, borderRadius: 10, padding: '1px 7px' }}>{tag.text}</span>
                    </div>
                    {!future && s.holiday === null && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {([['present', L.present, '#3dab7e'], ['absent', L.absent, '#e04040'], ['make_up', L.makeup, '#4a90d9']] as const).map(([v, text, c]) => {
                          const on = s.status === v
                          return (
                            <button key={v} disabled={!canMark || !!busy}
                              onClick={() => mark(s.date, on ? null : v)}
                              style={{
                                flex: '1 1 0', minWidth: 70, padding: '7px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                border: `1px solid ${on ? c : 'var(--border)'}`, background: on ? c + '22' : 'var(--bg-card)',
                                color: on ? c : 'var(--txt2)', cursor: canMark ? 'pointer' : 'default',
                              }}>
                              {text}
                            </button>
                          )
                        })}
                      </div>
                    )}
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
