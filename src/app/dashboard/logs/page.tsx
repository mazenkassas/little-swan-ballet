import { createClient } from '@/lib/supabase/server'
import { getLocale, getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ScrollText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const TZ = 'Africa/Cairo'

type Log = {
  id: number
  created_at: string
  actor_id: string | null
  actor_email: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_fields: string[] | null
}

/** A row snapshot from the log, read only for its id / name columns. */
type Row = Record<string, string | null | undefined>
type Named = { id?: string; email?: string | null; name?: string | null; name_ar?: string | null; name_en?: string | null }

type Search ={ from?: string; to?: string; table?: string; action?: string; user?: string; page?: string }

/** Human names for each table, by locale. Unknown tables fall back to their raw name. */
const TABLES: Record<string, { en: string; ar: string }> = {
  students:                { en: 'Students',              ar: 'الطالبات' },
  classes:                 { en: 'Groups',                ar: 'المجموعات' },
  class_students:          { en: 'Group members',         ar: 'أعضاء المجموعات' },
  sessions:                { en: 'Sessions',              ar: 'الحصص' },
  attendance:              { en: 'Attendance',            ar: 'الحضور' },
  subscriptions:           { en: 'Subscriptions',         ar: 'الاشتراكات' },
  subscription_plans:      { en: 'Subscription plans',    ar: 'خطط الاشتراك' },
  payments:                { en: 'Payments',              ar: 'المدفوعات' },
  payment_methods:         { en: 'Payment methods',       ar: 'طرق الدفع' },
  expenses:                { en: 'Expenses',              ar: 'المصروفات' },
  staff:                   { en: 'Staff',                 ar: 'الموظفون' },
  staff_attendance:        { en: 'Staff attendance',      ar: 'حضور الموظفين' },
  coaches:                 { en: 'Coaches',               ar: 'المدربات' },
  coach_attendance:        { en: 'Coach check-in',        ar: 'حضور المدربات' },
  coach_manual_sessions:   { en: 'Coach manual sessions', ar: 'حصص المدربات اليدوية' },
  exams:                   { en: 'Exams',                 ar: 'الامتحانات' },
  student_exams:           { en: 'Exam results',          ar: 'نتائج الامتحانات' },
  exam_targets:            { en: 'Exam targets',          ar: 'أهداف الامتحانات' },
  events:                  { en: 'Events',                ar: 'الفعاليات' },
  event_enrollments:       { en: 'Event enrollments',     ar: 'التسجيل في الفعاليات' },
  products:                { en: 'Inventory',             ar: 'المخزون' },
  product_orders:          { en: 'Product orders',        ar: 'طلبات المنتجات' },
  leotard_orders:          { en: 'Leotard orders',        ar: 'طلبات الليوتارد' },
  private_sessions:        { en: 'Private sessions',      ar: 'البرايفيت' },
  freezes:                 { en: 'Freezes',               ar: 'التجميد' },
  student_transfers:       { en: 'Transfers',             ar: 'التحويلات' },
  holidays:                { en: 'Holidays',              ar: 'الإجازات' },
  levels:                  { en: 'Levels',                ar: 'المستويات' },
  grades:                  { en: 'Grades',                ar: 'الدرجات' },
  terms:                   { en: 'Terms',                 ar: 'الترمات' },
  halls:                   { en: 'Halls',                 ar: 'القاعات' },
  role_permissions:        { en: 'Role permissions',      ar: 'صلاحيات الأدوار' },
  system_settings:         { en: 'Settings',              ar: 'الإعدادات' },
  daily_attendance_import: { en: 'Attendance import',     ar: 'استيراد الحضور' },
  daily_payment_import:    { en: 'Payment import',        ar: 'استيراد المدفوعات' },
}

const ACTION_STYLE: Record<Log['action'], { color: string; bg: string }> = {
  INSERT: { color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  UPDATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  DELETE: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
}

/** e.g. "+02:00" / "+03:00" — Cairo's UTC offset on a given day (handles DST). */
function cairoOffset(date: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(new Date(date + 'T12:00:00Z'))
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT+02:00'
  const m = part.match(/GMT([+-]\d{2}:\d{2})/)
  return m ? m[1] : '+00:00'
}

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default async function LogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale === 'ar'
  const t = await getTranslations('logs')
  const params = await searchParams

  // ── Super admins only ────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login')
  const { data: me } = await supabase
    .from('staff')
    .select('role, is_active')
    .ilike('email', user.email.trim().replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  if (!me || me.role !== 'super_admin' || me.is_active === false) redirect('/dashboard')

  // ── Filters ──────────────────────────────────────────────────────────
  const page   = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const table  = params.table || ''
  const action = ['INSERT', 'UPDATE', 'DELETE'].includes(params.action || '') ? params.action! : ''
  const actor  = params.user || ''
  const from   = isDate(params.from) ? params.from! : ''
  const to     = isDate(params.to) ? params.to! : ''

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (table)  query = query.eq('table_name', table)
  if (action) query = query.eq('action', action)
  if (actor === '__system') query = query.is('actor_email', null)
  else if (actor) query = query.ilike('actor_email', actor.replace(/[\\%_]/g, '\\$&'))
  if (from) query = query.gte('created_at', `${from}T00:00:00${cairoOffset(from)}`)
  if (to)   query = query.lte('created_at', `${to}T23:59:59.999${cairoOffset(to)}`)

  const [{ data: logsData, count, error }, { data: staffList }, { data: coachList }] = await Promise.all([
    query,
    supabase.from('staff').select('name, name_en, email, role').order('name'),
    supabase.from('coaches').select('name_ar, name_en, email').order('name_ar'),
  ])
  const logs = (logsData ?? []) as Log[]

  // ── Who: email → display name ────────────────────────────────────────
  const pickName = (r: Named) =>
    (isAr ? r.name_ar || r.name : r.name_en || r.name) || r.name_ar || r.name || r.name_en || ''
  const people = new Map<string, string>()
  for (const p of [...(staffList ?? []), ...(coachList ?? [])] as Named[]) {
    const email = p.email?.toLowerCase()
    if (email && !people.has(email)) people.set(email, pickName(p) || email)
  }
  const actorName = (email: string | null) =>
    email ? people.get(email.toLowerCase()) ?? email : t('system')

  // ── What: resolve student / group / coach / staff ids to names ───────
  const ids = { students: new Set<string>(), classes: new Set<string>(), coaches: new Set<string>(), staff: new Set<string>() }
  for (const l of logs) {
    const row = (l.new_data ?? l.old_data ?? {}) as Row
    if (row.student_id) ids.students.add(row.student_id)
    if (row.class_id)   ids.classes.add(row.class_id)
    if (row.coach_id)   ids.coaches.add(row.coach_id)
    if (row.staff_id)   ids.staff.add(row.staff_id)
  }
  const lookup = async (tbl: string, cols: string, set: Set<string>): Promise<Named[]> =>
    set.size ? ((await supabase.from(tbl).select(cols).in('id', [...set])).data as Named[] | null) ?? [] : []
  const looked = await Promise.all([
    lookup('students', 'id, name_ar, name_en', ids.students),
    lookup('classes',  'id, name',             ids.classes),
    lookup('coaches',  'id, name_ar, name_en', ids.coaches),
    lookup('staff',    'id, name, name_en',    ids.staff),
  ])
  const names = new Map<string, string>()
  looked.flat().forEach(r => r.id && names.set(r.id, pickName(r)))

  function recordLabel(l: Log): string {
    const r = (l.new_data ?? l.old_data ?? {}) as Row
    const own = pickName(r) || r.title || r.key
    if (own) return String(own)
    if (l.table_name === 'role_permissions' && r.role) return `${r.role} → ${r.page}`
    const linked = [r.student_id, r.class_id, r.coach_id, r.staff_id]
      .map(id => (id ? names.get(id) : undefined)).filter(Boolean)
    if (linked.length) return linked.join(' · ')
    return l.record_id ? `#${l.record_id.slice(0, 8)}` : '—'
  }

  const tableLabel = (name: string) => TABLES[name]?.[isAr ? 'ar' : 'en'] ?? name
  const fmtTime = (iso: string) => new Date(iso).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const total = count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageHref = (p: number) => {
    const q = new URLSearchParams()
    if (table) q.set('table', table)
    if (action) q.set('action', action)
    if (actor) q.set('user', actor)
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return `/dashboard/logs${s ? `?${s}` : ''}`
  }

  // User filter: only admin / staff accounts (no super admins, no coaches).
  const actorOptions = ((staffList ?? []) as (Named & { role?: string })[])
    .filter(s => s.email && (s.role === 'admin' || s.role === 'staff'))
    .map(s => [s.email!.toLowerCase(), pickName(s) || s.email!] as [string, string])
    .filter(([email], i, arr) => arr.findIndex(([e]) => e === email) === i)
    .sort((a, b) => a[1].localeCompare(b[1]))
  const tableOptions = Object.keys(TABLES).sort((a, b) => tableLabel(a).localeCompare(tableLabel(b)))

  const label: React.CSSProperties = {
    flex: '1 1 150px', minWidth: 0, fontSize: 11, fontWeight: 500, color: 'var(--txt2)',
    display: 'flex', flexDirection: 'column', gap: 6,
  }
  const btn: React.CSSProperties = {
    boxSizing: 'border-box', height: 40, padding: '0 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
    cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: 32, background: 'var(--bg-page)', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <ScrollText size={20} style={{ color: '#C8788A' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 4 }}>{t('subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <form
        method="get"
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16,
        }}
      >
        <label style={label}>{t('from')}
          <input type="date" name="from" defaultValue={from} className="logs-field" />
        </label>
        <label style={label}>{t('to')}
          <input type="date" name="to" defaultValue={to} className="logs-field" />
        </label>
        <label style={label}>{t('section')}
          <select name="table" defaultValue={table} className="logs-field logs-select">
            <option value="">{t('all')}</option>
            {tableOptions.map(k => <option key={k} value={k}>{tableLabel(k)}</option>)}
          </select>
        </label>
        <label style={label}>{t('action')}
          <select name="action" defaultValue={action} className="logs-field logs-select">
            <option value="">{t('all')}</option>
            <option value="INSERT">{t('actions.INSERT')}</option>
            <option value="UPDATE">{t('actions.UPDATE')}</option>
            <option value="DELETE">{t('actions.DELETE')}</option>
          </select>
        </label>
        <label style={label}>{t('user')}
          <select name="user" defaultValue={actor} className="logs-field logs-select">
            <option value="">{t('all')}</option>
            {actorOptions.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
            <option value="__system">{t('system')}</option>
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
          <button type="submit" className="logs-apply" style={{ ...btn, background: '#C8788A', color: '#fff', border: '1px solid #C8788A' }}>
            {t('apply')}
          </button>
          <Link href="/dashboard/logs" className="logs-reset" style={{ ...btn, background: 'transparent', color: 'var(--txt2)', border: '1px solid var(--border)' }}>
            {t('reset')}
          </Link>
        </div>
      </form>

      <p style={{ fontSize: 12, color: 'var(--txt2)', margin: '0 4px 10px' }}>
        {t('count', { count: total })}
      </p>

      {/* Entries */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', fontSize: 13, color: 'var(--txt2)' }}>
            {t('notSetUp')}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', fontSize: 13, color: 'var(--txt2)', opacity: 0.6 }}>
            {t('empty')}
          </div>
        ) : logs.map(l => {
          const st = ACTION_STYLE[l.action]
          const fields: { key: string; before?: unknown; after?: unknown }[] =
            l.action === 'UPDATE'
              ? (l.changed_fields ?? []).map(k => ({ key: k, before: l.old_data?.[k], after: l.new_data?.[k] }))
              : Object.entries((l.action === 'INSERT' ? l.new_data : l.old_data) ?? {})
                  .filter(([, v]) => v !== null && v !== '')
                  .map(([k, v]) => (l.action === 'INSERT' ? { key: k, after: v } : { key: k, before: v }))
          return (
            <details key={l.id} className="audit-row" style={{ borderBottom: '1px solid var(--border)' }}>
              <summary style={{
                listStyle: 'none', cursor: 'pointer', padding: '12px 16px',
                display: 'grid', gridTemplateColumns: 'minmax(150px, 1.1fr) minmax(110px, 1fr) 90px minmax(110px, 1fr) minmax(120px, 1.4fr) 16px',
                gap: 12, alignItems: 'center', fontSize: 13,
              }}>
                <span style={{ color: 'var(--txt2)', fontSize: 12 }}>{fmtTime(l.created_at)}</span>
                <span style={{ color: 'var(--txt1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {actorName(l.actor_email)}
                </span>
                <span style={{ color: st.color, background: st.bg, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, width: 'fit-content' }}>
                  {t(`actions.${l.action}`)}
                </span>
                <span style={{ color: 'var(--txt2)' }}>{tableLabel(l.table_name)}</span>
                <span style={{ color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recordLabel(l)}
                  {l.action === 'UPDATE' && l.changed_fields?.length ? (
                    <span style={{ color: 'var(--txt2)', fontSize: 11 }}> · {l.changed_fields.join(', ')}</span>
                  ) : null}
                </span>
                <ChevronDown size={14} className="audit-chevron" style={{ color: 'var(--txt2)' }} />
              </summary>

              <div style={{ padding: '4px 16px 16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: 'var(--txt2)', textAlign: 'start' }}>
                      <th style={{ textAlign: 'start', padding: '6px 8px', fontWeight: 500 }}>{t('field')}</th>
                      {l.action !== 'INSERT' && <th style={{ textAlign: 'start', padding: '6px 8px', fontWeight: 500 }}>{t('before')}</th>}
                      {l.action !== 'DELETE' && <th style={{ textAlign: 'start', padding: '6px 8px', fontWeight: 500 }}>{t('after')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(f => (
                      <tr key={f.key} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--txt2)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{f.key}</td>
                        {l.action !== 'INSERT' && (
                          <td style={{ padding: '6px 8px', color: l.action === 'UPDATE' ? '#ef4444' : 'var(--txt1)', wordBreak: 'break-word' }}>
                            {formatValue(f.before)}
                          </td>
                        )}
                        {l.action !== 'DELETE' && (
                          <td style={{ padding: '6px 8px', color: l.action === 'UPDATE' ? '#10b981' : 'var(--txt1)', wordBreak: 'break-word' }}>
                            {formatValue(f.after)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '10px 8px 0', opacity: 0.7 }}>
                  {l.actor_email ?? t('system')} · {l.table_name} · {l.record_id ?? '—'}
                </p>
              </div>
            </details>
          )
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16, fontSize: 13 }}>
          {page > 1
            ? <Link href={pageHref(page - 1)} style={{ color: '#C8788A', textDecoration: 'none' }}>{t('prev')}</Link>
            : <span style={{ color: 'var(--txt2)', opacity: 0.4 }}>{t('prev')}</span>}
          <span style={{ color: 'var(--txt2)' }}>{t('pageOf', { page, pages })}</span>
          {page < pages
            ? <Link href={pageHref(page + 1)} style={{ color: '#C8788A', textDecoration: 'none' }}>{t('next')}</Link>
            : <span style={{ color: 'var(--txt2)', opacity: 0.4 }}>{t('next')}</span>}
        </div>
      )}

      <style>{`
        .logs-field {
          display: block; width: 100%; min-width: 0; height: 40px; padding: 0 12px;
          font-family: inherit; font-size: 13px; color: var(--txt1);
          background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          outline: none; cursor: pointer; transition: border-color .15s;
        }
        .logs-field:hover { border-color: #d4667a99; }
        .logs-field:focus { border-color: #d4667a; }
        .logs-select {
          appearance: none; -webkit-appearance: none;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a8f95' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center; padding: 0 34px 0 12px;
        }
        [dir=rtl] .logs-select { background-position: left 12px center; padding: 0 12px 0 34px; }
        .logs-select option { background: var(--bg-popup); color: var(--txt1); }
        .logs-apply:hover { filter: brightness(0.94); }
        .logs-reset:hover { background: var(--bg2) !important; color: var(--txt1) !important; }
        .audit-row summary::-webkit-details-marker { display: none; }
        .audit-row summary:hover { background: var(--bg2); }
        .audit-row[open] summary { background: var(--bg2); }
        .audit-row[open] .audit-chevron { transform: rotate(180deg); }
        .audit-row:last-child { border-bottom: none !important; }
        @media (max-width: 760px) {
          .audit-row summary { grid-template-columns: 1fr auto !important; }
          .audit-row summary > span:nth-child(1) { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  )
}
