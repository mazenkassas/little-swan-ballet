import { createClient } from '@/lib/supabase/server'
import { getLocale, getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScrollText } from 'lucide-react'

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
type Named = { id?: string; email?: string | null; name?: string | null; name_ar?: string | null; name_en?: string | null; role?: string | null; date?: string | null }
type L = { en: string; ar: string }

type Search = { from?: string; to?: string; table?: string; action?: string; user?: string; page?: string }

/** Human names for each table (plural, for the Section filter). */
const TABLES: Record<string, L> = {
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

/** Singular noun for each table, used in "Changed subscription". Falls back to TABLES. */
const THING: Record<string, L> = {
  students: { en: 'student', ar: 'طالبة' }, classes: { en: 'group', ar: 'مجموعة' },
  class_students: { en: 'group member', ar: 'عضوية مجموعة' }, sessions: { en: 'session', ar: 'حصة' },
  attendance: { en: 'attendance', ar: 'حضور' }, subscriptions: { en: 'subscription', ar: 'اشتراك' },
  subscription_plans: { en: 'subscription plan', ar: 'خطة اشتراك' }, payments: { en: 'payment', ar: 'دفعة' },
  payment_methods: { en: 'payment method', ar: 'طريقة دفع' }, expenses: { en: 'expense', ar: 'مصروف' },
  staff: { en: 'staff member', ar: 'موظف' }, staff_attendance: { en: 'staff check-in', ar: 'حضور موظف' },
  coaches: { en: 'coach', ar: 'مدربة' }, coach_attendance: { en: 'coach check-in', ar: 'حضور مدربة' },
  coach_manual_sessions: { en: 'coach manual session', ar: 'حصة يدوية لمدربة' },
  exams: { en: 'exam', ar: 'امتحان' }, student_exams: { en: 'exam result', ar: 'نتيجة امتحان' },
  exam_targets: { en: 'exam target', ar: 'هدف امتحان' },
  events: { en: 'event', ar: 'فعالية' }, event_enrollments: { en: 'event enrollment', ar: 'تسجيل في فعالية' },
  products: { en: 'product', ar: 'منتج' }, product_orders: { en: 'product order', ar: 'طلب منتج' },
  leotard_orders: { en: 'leotard order', ar: 'طلب ليوتارد' }, private_sessions: { en: 'private session', ar: 'حصة برايفيت' },
  freezes: { en: 'freeze', ar: 'تجميد' }, student_transfers: { en: 'transfer', ar: 'تحويل' },
  holidays: { en: 'holiday', ar: 'إجازة' }, levels: { en: 'level', ar: 'مستوى' }, grades: { en: 'grade', ar: 'درجة' },
  terms: { en: 'term', ar: 'ترم' }, halls: { en: 'hall', ar: 'قاعة' },
  role_permissions: { en: 'permission', ar: 'صلاحية' }, system_settings: { en: 'setting', ar: 'إعداد' },
}

const VERB: Record<Log['action'], L & { color: string; bg: string }> = {
  INSERT: { en: 'Added',   ar: 'إضافة', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  UPDATE: { en: 'Changed', ar: 'تعديل', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  DELETE: { en: 'Deleted', ar: 'حذف',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

/** Friendly field names. Anything not listed is shown with its underscores turned into spaces. */
const FIELDS: Record<string, L> = {
  name: { en: 'Name', ar: 'الاسم' }, name_ar: { en: 'Arabic name', ar: 'الاسم بالعربي' }, name_en: { en: 'English name', ar: 'الاسم بالإنجليزي' },
  phone: { en: 'Phone', ar: 'الهاتف' }, parent_phone: { en: 'Parent phone', ar: 'هاتف ولي الأمر' }, email: { en: 'Email', ar: 'البريد' },
  status: { en: 'Status', ar: 'الحالة' }, date: { en: 'Date', ar: 'التاريخ' }, notes: { en: 'Notes', ar: 'ملاحظات' }, note: { en: 'Note', ar: 'ملاحظة' },
  start_date: { en: 'Start date', ar: 'تاريخ البداية' }, end_date: { en: 'End date', ar: 'تاريخ الانتهاء' },
  total_sessions: { en: 'Total sessions', ar: 'إجمالي الحصص' }, remaining_sessions: { en: 'Remaining sessions', ar: 'الحصص المتبقية' },
  sessions_count: { en: 'Sessions', ar: 'عدد الحصص' },
  amount: { en: 'Amount', ar: 'المبلغ' }, amount_paid: { en: 'Paid', ar: 'المدفوع' }, amount_due: { en: 'Due', ar: 'المستحق' },
  paid_amount: { en: 'Paid', ar: 'المدفوع' }, total_amount: { en: 'Total', ar: 'الإجمالي' }, remaining_balance: { en: 'Remaining', ar: 'المتبقي' },
  price: { en: 'Price', ar: 'السعر' }, selling_price: { en: 'Selling price', ar: 'سعر البيع' }, cost_price: { en: 'Cost price', ar: 'سعر التكلفة' },
  fee: { en: 'Fee', ar: 'الرسوم' }, cost: { en: 'Cost', ar: 'التكلفة' },
  cash: { en: 'Cash', ar: 'كاش' }, instapay: { en: 'InstaPay', ar: 'إنستاباي' }, payment_method: { en: 'Payment method', ar: 'طريقة الدفع' },
  payment_status: { en: 'Payment status', ar: 'حالة الدفع' }, pay_status: { en: 'Payment status', ar: 'حالة الدفع' },
  type: { en: 'Type', ar: 'النوع' }, title: { en: 'Title', ar: 'العنوان' }, description: { en: 'Description', ar: 'الوصف' },
  reason: { en: 'Reason', ar: 'السبب' }, result: { en: 'Result', ar: 'النتيجة' }, value: { en: 'Value', ar: 'القيمة' },
  is_active: { en: 'Active', ar: 'نشط' }, role: { en: 'Role', ar: 'الدور' }, can_login: { en: 'Can log in', ar: 'يمكنه الدخول' },
  discounted_monthly_fees: { en: 'Discounted monthly fee', ar: 'الرسوم الشهرية بعد الخصم' },
  discount_end_date: { en: 'Discount ends', ar: 'نهاية الخصم' }, monthly_fees: { en: 'Monthly fee', ar: 'الرسوم الشهرية' },
  date_of_birth: { en: 'Birth date', ar: 'تاريخ الميلاد' },
  student_id: { en: 'Student', ar: 'الطالبة' }, class_id: { en: 'Group', ar: 'المجموعة' }, coach_id: { en: 'Coach', ar: 'المدربة' },
  staff_id: { en: 'Staff', ar: 'الموظف' }, hall_id: { en: 'Hall', ar: 'القاعة' }, session_id: { en: 'Session', ar: 'الحصة' },
  from_class_id: { en: 'From group', ar: 'من مجموعة' }, to_class_id: { en: 'To group', ar: 'إلى مجموعة' },
  default_coach_id: { en: 'Coach', ar: 'المدربة' },
  start_time: { en: 'Start time', ar: 'وقت البداية' }, end_time: { en: 'End time', ar: 'وقت النهاية' },
  check_in_time: { en: 'Check-in', ar: 'وقت الحضور' }, check_out_time: { en: 'Check-out', ar: 'وقت الانصراف' },
  login_time: { en: 'Clock-in', ar: 'وقت الدخول' }, logout_time: { en: 'Clock-out', ar: 'وقت الخروج' },
  hours_worked: { en: 'Hours worked', ar: 'ساعات العمل' }, coach_status: { en: 'Coach status', ar: 'حالة المدربة' },
  stock_qty: { en: 'Stock', ar: 'المخزون' }, size: { en: 'Size', ar: 'المقاس' }, capacity: { en: 'Capacity', ar: 'السعة' },
  max_capacity: { en: 'Max capacity', ar: 'السعة القصوى' }, days_of_week: { en: 'Days', ar: 'الأيام' },
  enrollment_date: { en: 'Enrolled on', ar: 'تاريخ التسجيل' }, enrolled_date: { en: 'Enrolled on', ar: 'تاريخ التسجيل' },
  order_date: { en: 'Order date', ar: 'تاريخ الطلب' },
  delivery_status: { en: 'Delivery', ar: 'التسليم' }, tailor_status: { en: 'Tailor', ar: 'الخياطة' },
}

/** Technical columns never shown to the reader. */
const HIDDEN = /^(id|created_at|updated_at|timestamp|password_hash|recorded_by|created_by|updated_by|original_session_id|location_status|.*_(lat|lng))$/

/** Columns that point at another table, and which lookup resolves them. */
const REFS: Record<string, 'students' | 'classes' | 'coaches' | 'staff' | 'halls' | 'sessions'> = {
  student_id: 'students', class_id: 'classes', from_class_id: 'classes', to_class_id: 'classes',
  coach_id: 'coaches', default_coach_id: 'coaches', staff_id: 'staff', hall_id: 'halls', session_id: 'sessions',
}

const VALUES: Record<string, L> = {
  present: { en: 'Present', ar: 'حاضرة' }, absent: { en: 'Absent', ar: 'غائبة' }, late: { en: 'Late', ar: 'متأخرة' },
  excused: { en: 'Excused', ar: 'بعذر' }, make_up: { en: 'Make-up', ar: 'تعويض' },
  scheduled: { en: 'Scheduled', ar: 'مجدولة' }, completed: { en: 'Completed', ar: 'تمت' }, cancelled: { en: 'Cancelled', ar: 'ملغاة' },
  active: { en: 'Active', ar: 'نشط' }, inactive: { en: 'Inactive', ar: 'غير نشط' }, expired: { en: 'Expired', ar: 'منتهي' },
  frozen: { en: 'Frozen', ar: 'مجمّد' }, paid: { en: 'Paid', ar: 'مدفوع' }, unpaid: { en: 'Unpaid', ar: 'غير مدفوع' },
  partial: { en: 'Partly paid', ar: 'مدفوع جزئيًا' }, pending: { en: 'Pending', ar: 'قيد الانتظار' },
  approved: { en: 'Approved', ar: 'مقبول' }, rejected: { en: 'Rejected', ar: 'مرفوض' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' }, cash: { en: 'Cash', ar: 'كاش' }, instapay: { en: 'InstaPay', ar: 'إنستاباي' },
  admin: { en: 'Admin', ar: 'مدير' }, staff: { en: 'Staff', ar: 'موظف' }, super_admin: { en: 'Super admin', ar: 'مدير عام' },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** e.g. "+02:00" / "+03:00" — Cairo's UTC offset on a given day (handles DST). */
function cairoOffset(date: string): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(new Date(date + 'T12:00:00Z'))
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT+02:00'
  const m = part.match(/GMT([+-]\d{2}:\d{2})/)
  return m ? m[1] : '+00:00'
}

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export default async function LogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale === 'ar'
  const lang: keyof L = isAr ? 'ar' : 'en'
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

  const pickName = (r: Named) =>
    (isAr ? r.name_ar || r.name : r.name_en || r.name) || r.name_ar || r.name || r.name_en || ''

  // ── Only admin / staff activity is shown (no super admin, no system) ─
  const { data: staffList } = await supabase.from('staff').select('name, name_en, email, role').in('role', ['admin', 'staff'])
  const people = new Map<string, string>()   // lower-case email → display name
  const emailVariants = new Set<string>()     // as stored + lower-case, for the .in() filter
  for (const s of (staffList ?? []) as Named[]) {
    if (!s.email) continue
    const lower = s.email.trim().toLowerCase()
    if (!people.has(lower)) people.set(lower, pickName(s) || s.email)
    emailVariants.add(s.email.trim())
    emailVariants.add(lower)
  }

  // ── Filters ──────────────────────────────────────────────────────────
  const page   = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const table  = params.table || ''
  const action = ['INSERT', 'UPDATE', 'DELETE'].includes(params.action || '') ? params.action! : ''
  const actor  = people.has((params.user || '').toLowerCase()) ? params.user!.toLowerCase() : ''
  const from   = isDate(params.from) ? params.from! : ''
  const to     = isDate(params.to) ? params.to! : ''

  let logs: Log[] = []
  let total = 0
  let error: unknown = null
  if (emailVariants.size) {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (actor) query = query.ilike('actor_email', actor.replace(/[\\%_]/g, '\\$&'))
    else query = query.in('actor_email', [...emailVariants])
    if (table)  query = query.eq('table_name', table)
    if (action) query = query.eq('action', action)
    if (from) query = query.gte('created_at', `${from}T00:00:00${cairoOffset(from)}`)
    if (to)   query = query.lte('created_at', `${to}T23:59:59.999${cairoOffset(to)}`)

    const res = await query
    logs = (res.data ?? []) as Log[]
    total = res.count ?? 0
    error = res.error
  }

  const actorName = (email: string | null) => (email ? people.get(email.toLowerCase()) ?? email : '—')

  // ── Resolve ids (student, group, coach, …) to names ──────────────────
  const ids: Record<string, Set<string>> = {
    students: new Set(), classes: new Set(), coaches: new Set(), staff: new Set(), halls: new Set(), sessions: new Set(),
  }
  for (const l of logs) {
    for (const row of [l.new_data, l.old_data] as (Row | null)[]) {
      if (!row) continue
      for (const [col, tbl] of Object.entries(REFS)) {
        const v = row[col]
        if (typeof v === 'string' && UUID.test(v)) ids[tbl].add(v)
      }
    }
  }
  const lookup = async (tbl: string, cols: string, set: Set<string>): Promise<Named[]> =>
    set.size ? ((await supabase.from(tbl).select(cols).in('id', [...set])).data as Named[] | null) ?? [] : []
  const [stu, cls, cch, stf, hls, ses] = await Promise.all([
    lookup('students', 'id, name_ar, name_en', ids.students),
    lookup('classes',  'id, name',             ids.classes),
    lookup('coaches',  'id, name_ar, name_en', ids.coaches),
    lookup('staff',    'id, name, name_en',    ids.staff),
    lookup('halls',    'id, name',             ids.halls),
    lookup('sessions', 'id, date',             ids.sessions),
  ])
  const names = new Map<string, string>()
  ;[...stu, ...cls, ...cch, ...stf, ...hls].forEach(r => r.id && names.set(r.id, pickName(r)))

  const fmtDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
    timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
  })
  ses.forEach(r => r.id && r.date && names.set(r.id, fmtDay(r.date)))

  const fmtTime = (iso: string) => new Date(iso).toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
    timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const fieldLabel = (k: string) => FIELDS[k]?.[lang] ?? k.replace(/_id$/, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

  function show(key: string, v: unknown): string {
    if (v === null || v === undefined || v === '') return '—'
    if (typeof v === 'boolean') return v ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')
    if (Array.isArray(v)) return v.map(x => show(key, x)).join('، ')
    if (typeof v === 'object') return JSON.stringify(v)
    const s = String(v)
    if (UUID.test(s)) return names.get(s) ?? (isAr ? 'غير معروف' : 'unknown')
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fmtDay(s)
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return fmtTime(s)
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.slice(0, 5)
    return VALUES[s]?.[lang] ?? s
  }

  /** Who / what the entry is about, e.g. the student's name. */
  function subject(l: Log): string {
    const r = (l.new_data ?? l.old_data ?? {}) as Row
    if (l.table_name === 'sessions') {
      const parts = [r.class_id && names.get(r.class_id), r.date && fmtDay(r.date)].filter(Boolean)
      if (parts.length) return parts.join(' · ')
    }
    const own = pickName(r) || r.title || r.customer_name
    if (own) return String(own)
    const linked = [r.student_id, r.class_id, r.coach_id, r.staff_id]
      .map(id => (id ? names.get(id) : undefined)).filter(Boolean)
    return linked.join(' · ')
  }

  /** The lines under the headline: what changed, or the key details of what was added / deleted. */
  function details(l: Log): { label: string; before?: string; after?: string }[] {
    const subj = subject(l)
    if (l.action === 'UPDATE') {
      return (l.changed_fields ?? [])
        .filter(k => !HIDDEN.test(k))
        .map(k => ({ label: fieldLabel(k), before: show(k, l.old_data?.[k]), after: show(k, l.new_data?.[k]) }))
    }
    const row = (l.action === 'INSERT' ? l.new_data : l.old_data) ?? {}
    return Object.entries(row)
      .filter(([k, v]) => !HIDDEN.test(k) && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => ({ label: fieldLabel(k), after: show(k, v) }))
      .filter(d => d.after !== subj)          // don't repeat the name already in the headline
      .slice(0, 8)
  }

  const tableLabel = (name: string) => TABLES[name]?.[lang] ?? name
  const thingLabel = (name: string) => THING[name]?.[lang] ?? tableLabel(name)

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

  const actorOptions = [...people.entries()].sort((a, b) => a[1].localeCompare(b[1]))
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
    <div style={{ padding: 32, background: 'var(--bg-page)', minHeight: '100%' }} className="logs-page">
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
          const v = VERB[l.action]
          const subj = subject(l)
          const lines = details(l)
          return (
            <div key={l.id} className="log-row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ fontWeight: 600, color: 'var(--txt1)' }}>{actorName(l.actor_email)}</span>
                <span style={{ color: v.color, background: v.bg, borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                  {v[lang]} {thingLabel(l.table_name)}
                </span>
                {subj && <span style={{ color: 'var(--txt1)' }}>{subj}</span>}
                <span style={{ marginInlineStart: 'auto', color: 'var(--txt2)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTime(l.created_at)}</span>
              </div>
              {lines.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                  {lines.map((d, i) => (
                    <li key={i} style={{ color: 'var(--txt2)', wordBreak: 'break-word' }}>
                      <span>{d.label}: </span>
                      {d.before !== undefined ? (
                        <>
                          <span style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.8 }}>{d.before}</span>
                          <span style={{ margin: '0 6px' }}>{isAr ? '←' : '→'}</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{d.after}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--txt1)' }}>{d.after}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
        .log-row:hover { background: var(--bg2); }
        .log-row:last-child { border-bottom: none !important; }
        @media (max-width: 760px) { .logs-page { padding: 16px !important; } }
      `}</style>
    </div>
  )
}
