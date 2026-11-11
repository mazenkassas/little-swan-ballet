'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Search, AlertTriangle, ShoppingBag } from 'lucide-react'

export interface LeotardOrder {
  id: string
  customer_name: string
  student_id: string | null
  branch: string | null
  order_date: string | null
  day_of_week: string | null
  group_name: string | null
  size: string | null
  total_amount: number
  paid_amount: number
  payment_method: 'cash' | 'instapay' | null
  tailor_status: 'pending' | 'received'
  delivery_status: 'pending' | 'delivered'
  notes: string | null
  created_at: string
}

interface Props {
  orders: LeotardOrder[]
  students: { id: string; name_ar: string }[]
  groupOptions: string[]
  initialMonth: string
  today: string
  setupNeeded: boolean
  isRtl: boolean
}

const SIZES = ['5', '7', '9', '12', 'S', 'M', 'L', 'XL']
const DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const
const JS_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DEFAULT_BRANCHES = ['ميامي']

const LABELS = {
  en: {
    title: 'Leotard Orders', newOrder: 'New Order', editOrder: 'Edit Order',
    allMonths: 'All months', search: 'Search by name…',
    num: '#', name: 'Name', branch: 'Branch', date: 'Date', day: 'Day', group: 'Group',
    paid: 'Paid', remaining: 'Remaining', total: 'Total', payStatus: 'Payment Status',
    cash: 'Cash', instapay: 'Instapay', size: 'Size',
    tailor: 'Received from Tailor', delivery: 'Delivered to Customer',
    method: 'Payment Method', notes: 'Notes', none: '—', select: 'Select…',
    paidFull: 'Paid', partial: 'Partial', unpaid: 'Unpaid',
    received: 'Received', notReceived: 'Not received',
    delivered: 'Delivered', notDelivered: 'Not delivered',
    totals: 'Total', empty: 'No orders for this month', emptySearch: 'No matching orders',
    save: 'Save', saving: 'Saving…', cancel: 'Cancel', edit: 'Edit', del: 'Delete',
    delTitle: 'Delete this order?', delBody: 'This cannot be undone.',
    nameRequired: 'Name is required', totalRequired: 'Total is required',
    paidTooMuch: 'Paid amount cannot be more than the total',
    saveFailed: 'Could not save. Please try again.',
    setupTitle: 'Leotard orders are not set up yet',
    setupBody: 'Run the file supabase/add_leotard_orders.sql once in the Supabase SQL Editor, then refresh this page.',
    days: { sat: 'Saturday', sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' } as Record<string, string>,
    toggleHint: 'Click to change',
  },
  ar: {
    title: 'طلبات المايوهات', newOrder: 'طلب جديد', editOrder: 'تعديل الطلب',
    allMonths: 'كل الشهور', search: 'بحث بالاسم…',
    num: 'م', name: 'الاسم', branch: 'الفرع', date: 'التاريخ', day: 'اليوم', group: 'الجروب',
    paid: 'المدفوع', remaining: 'الباقي', total: 'الاجمالي', payStatus: 'حالة الدفع',
    cash: 'كاش', instapay: 'انستاباي', size: 'المقاس',
    tailor: 'حالة الاستلام من الخياط', delivery: 'حالة التسليم للعميل',
    method: 'طريقة الدفع', notes: 'ملاحظات', none: '—', select: 'اختر…',
    paidFull: 'خالص', partial: 'جزئي', unpaid: 'لم يدفع',
    received: 'تم الاستلام', notReceived: 'لم يتم الاستلام',
    delivered: 'تم التسليم', notDelivered: 'لم يتم التسليم',
    totals: 'الإجمالي', empty: 'لا توجد طلبات في هذا الشهر', emptySearch: 'لا توجد طلبات مطابقة',
    save: 'حفظ', saving: 'جارٍ الحفظ…', cancel: 'إلغاء', edit: 'تعديل', del: 'حذف',
    delTitle: 'حذف هذا الطلب؟', delBody: 'لا يمكن التراجع عن هذا الإجراء.',
    nameRequired: 'الاسم مطلوب', totalRequired: 'الاجمالي مطلوب',
    paidTooMuch: 'المدفوع لا يمكن أن يكون أكبر من الاجمالي',
    saveFailed: 'تعذر الحفظ. حاول مرة أخرى.',
    setupTitle: 'طلبات المايوهات غير مفعّلة بعد',
    setupBody: 'شغّل الملف supabase/add_leotard_orders.sql مرة واحدة في Supabase SQL Editor ثم حدّث الصفحة.',
    days: { sat: 'السبت', sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة' } as Record<string, string>,
    toggleHint: 'اضغط للتغيير',
  },
}

const GREEN = '#3dab7e'
const AMBER = '#e8960a'
const RED = '#e04040'
const BLUE = '#3b82f6'
const PURPLE = '#8e5fd9'
const PINK = '#d4667a'

function num(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)}/${Number(m)}/${y}`
}

function dayKeyFromDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return JS_DAY_KEYS[new Date(y, m - 1, d).getDay()]
}

function monthOf(o: LeotardOrder) {
  return (o.order_date || o.created_at || '').slice(0, 7)
}

function payState(total: number, paid: number): 'paid' | 'partial' | 'unpaid' {
  if (total > 0 && paid >= total) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

const emptyForm = (today: string) => ({
  customer_name: '', branch: DEFAULT_BRANCHES[0], order_date: today,
  day_of_week: dayKeyFromDate(today), group_name: '', size: '',
  total_amount: '', paid_amount: '', payment_method: 'cash',
  tailor_status: 'pending', delivery_status: 'pending', notes: '',
})
type FormState = ReturnType<typeof emptyForm>

export default function LeotardOrders({
  orders, students, groupOptions, initialMonth, today, setupNeeded, isRtl,
}: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const L = LABELS[isRtl ? 'ar' : 'en']

  const [month, setMonth] = useState(initialMonth)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<LeotardOrder | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(() => emptyForm(today))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<LeotardOrder | null>(null)
  const [failed, setFailed] = useState('')

  const months = useMemo(() => {
    const set = new Set<string>([initialMonth])
    orders.forEach(o => { const m = monthOf(o); if (m) set.add(m) })
    return Array.from(set).sort().reverse()
  }, [orders, initialMonth])

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-').map(Number)
    return new Intl.DateTimeFormat(isRtl ? 'ar-EG-u-nu-latn' : 'en-US', { month: 'long', year: 'numeric' })
      .format(new Date(y, mo - 1, 1))
  }

  const branchOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_BRANCHES)
    orders.forEach(o => { if (o.branch) set.add(o.branch) })
    return Array.from(set)
  }, [orders])

  const allGroupOptions = useMemo(() => {
    const set = new Set<string>(groupOptions)
    orders.forEach(o => { if (o.group_name) set.add(o.group_name) })
    return Array.from(set)
  }, [orders, groupOptions])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders
      .filter(o => month === 'all' || monthOf(o) === month)
      .filter(o => !q || o.customer_name.toLowerCase().includes(q))
      .sort((a, b) =>
        (a.order_date || '9999').localeCompare(b.order_date || '9999') ||
        a.created_at.localeCompare(b.created_at))
  }, [orders, month, query])

  const sums = useMemo(() => rows.reduce(
    (s, o) => ({ paid: s.paid + Number(o.paid_amount), total: s.total + Number(o.total_amount) }),
    { paid: 0, total: 0 },
  ), [rows])

  function openNew() {
    setEditing(null); setForm(emptyForm(today)); setErrors({}); setFailed(''); setShowForm(true)
  }

  function openEdit(o: LeotardOrder) {
    setEditing(o)
    setForm({
      customer_name: o.customer_name, branch: o.branch || '', order_date: o.order_date || '',
      day_of_week: o.day_of_week || '', group_name: o.group_name || '', size: o.size || '',
      total_amount: String(Number(o.total_amount)), paid_amount: String(Number(o.paid_amount)),
      payment_method: o.payment_method || '', tailor_status: o.tailor_status,
      delivery_status: o.delivery_status, notes: o.notes || '',
    })
    setErrors({}); setFailed(''); setShowForm(true)
  }

  function setField(key: keyof FormState, value: string) {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'order_date' && value) next.day_of_week = dayKeyFromDate(value)
      return next
    })
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const formTotal = parseFloat(form.total_amount) || 0
  const formPaid = parseFloat(form.paid_amount) || 0
  const formRemaining = Math.max(formTotal - formPaid, 0)
  const formState = payState(formTotal, formPaid)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.customer_name.trim()) errs.customer_name = L.nameRequired
    if (!form.total_amount.trim()) errs.total_amount = L.totalRequired
    if (formPaid > formTotal) errs.paid_amount = L.paidTooMuch
    if (Object.keys(errs).length) { setErrors(errs); return }

    const name = form.customer_name.trim()
    const payload = {
      customer_name: name,
      student_id: students.find(s => s.name_ar.trim() === name)?.id || null,
      branch: form.branch.trim() || null,
      order_date: form.order_date || null,
      day_of_week: form.day_of_week || null,
      group_name: form.group_name.trim() || null,
      size: form.size || null,
      total_amount: formTotal,
      paid_amount: formPaid,
      payment_method: form.payment_method || null,
      tailor_status: form.tailor_status,
      delivery_status: form.delivery_status,
      notes: form.notes.trim() || null,
    }

    setSaving(true); setFailed('')
    const { error } = editing
      ? await supabase.from('leotard_orders').update(payload).eq('id', editing.id)
      : await supabase.from('leotard_orders').insert(payload)
    setSaving(false)
    if (error) { setFailed(L.saveFailed); return }

    if (month !== 'all') setMonth((payload.order_date || editing?.created_at || today).slice(0, 7))
    setShowForm(false)
    router.refresh()
  }

  async function toggle(o: LeotardOrder, field: 'tailor_status' | 'delivery_status') {
    const next = field === 'tailor_status'
      ? (o.tailor_status === 'received' ? 'pending' : 'received')
      : (o.delivery_status === 'delivered' ? 'pending' : 'delivered')
    setBusyId(o.id)
    await supabase.from('leotard_orders').update({ [field]: next }).eq('id', o.id)
    setBusyId(null)
    router.refresh()
  }

  async function confirmDelete() {
    if (!toDelete) return
    setBusyId(toDelete.id)
    await supabase.from('leotard_orders').delete().eq('id', toDelete.id)
    setBusyId(null); setToDelete(null)
    router.refresh()
  }

  // ── styles ────────────────────────────────────────────────
  const th: React.CSSProperties = {
    padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--txt2)',
    textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-page)',
  }
  const td: React.CSSProperties = {
    padding: '9px 12px', fontSize: 12, color: 'var(--txt1)', textAlign: 'center',
    whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
  }
  const pill = (color: string, clickable = false): React.CSSProperties => ({
    display: 'inline-block', background: `${color}1f`, color, border: `1px solid ${color}40`,
    borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700,
    whiteSpace: 'nowrap', fontFamily: 'inherit', cursor: clickable ? 'pointer' : 'default',
  })
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const field = (hasErr = false): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${hasErr ? RED : 'var(--border)'}`,
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  })
  const errTxt: React.CSSProperties = { margin: '4px 0 0', color: RED, fontSize: 11 }
  const req: React.CSSProperties = { color: RED, marginInlineStart: 3 }
  const iconBtn = (color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 7, border: `1px solid ${color}40`,
    background: `${color}12`, color, cursor: 'pointer',
  })
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }

  const stateColor = { paid: GREEN, partial: AMBER, unpaid: RED }
  const stateLabel = { paid: L.paidFull, partial: L.partial, unpaid: L.unpaid }

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: `${PURPLE}18`, border: `1px solid ${PURPLE}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShoppingBag size={15} color={PURPLE} />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)', flex: 1 }}>{L.title}</p>

        {!setupNeeded && (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={13} color="var(--txt2)" style={{ position: 'absolute', top: 10, insetInlineStart: 10 }} />
              <input
                value={query} onChange={e => setQuery(e.target.value)} placeholder={L.search}
                style={{ ...field(), width: 190, padding: '7px 12px', paddingInlineStart: 30, fontSize: 12 }}
              />
            </div>
            <select value={month} onChange={e => setMonth(e.target.value)}
              style={{ ...field(), width: 'auto', padding: '7px 10px', fontSize: 12, fontWeight: 600 }}>
              <option value="all">{L.allMonths}</option>
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button onClick={openNew} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: PINK, color: '#fff',
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Plus size={14} />{L.newOrder}
            </button>
          </>
        )}
      </div>

      {setupNeeded ? (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, background: `${AMBER}12`,
          border: `1px solid ${AMBER}30`, borderRadius: 12, padding: '14px 16px',
        }}>
          <AlertTriangle size={16} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, color: AMBER, fontWeight: 700, fontSize: 13 }}>{L.setupTitle}</p>
            <p style={{ margin: '3px 0 0', color: 'var(--txt2)', fontSize: 12 }}>{L.setupBody}</p>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>{L.num}</th>
                  <th style={{ ...th, textAlign: 'start' }}>{L.name}</th>
                  <th style={th}>{L.branch}</th>
                  <th style={th}>{L.date}</th>
                  <th style={th}>{L.day}</th>
                  <th style={th}>{L.group}</th>
                  <th style={th}>{L.paid}</th>
                  <th style={th}>{L.remaining}</th>
                  <th style={th}>{L.total}</th>
                  <th style={th}>{L.payStatus}</th>
                  <th style={th}>{L.cash}</th>
                  <th style={th}>{L.instapay}</th>
                  <th style={th}>{L.size}</th>
                  <th style={th}>{L.tailor}</th>
                  <th style={th}>{L.delivery}</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o, i) => {
                  const total = Number(o.total_amount)
                  const paid = Number(o.paid_amount)
                  const remaining = Math.max(total - paid, 0)
                  const st = payState(total, paid)
                  const busy = busyId === o.id
                  return (
                    <tr key={o.id} style={{ opacity: busy ? 0.5 : 1 }}>
                      <td style={{ ...td, color: 'var(--txt2)' }}>{i + 1}</td>
                      <td style={{ ...td, textAlign: 'start', fontWeight: 600 }} title={o.notes || undefined}>{o.customer_name}</td>
                      <td style={td}>{o.branch ? <span style={pill(GREEN)}>{o.branch}</span> : L.none}</td>
                      <td style={td} dir="ltr">{fmtDate(o.order_date) || L.none}</td>
                      <td style={td}>{o.day_of_week ? L.days[o.day_of_week] : L.none}</td>
                      <td style={td}>{o.group_name ? <span style={pill(BLUE)} dir="ltr">{o.group_name}</span> : L.none}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{num(paid)}</td>
                      <td style={{ ...td, fontWeight: 700, color: remaining > 0 ? RED : 'var(--txt1)' }}>{num(remaining)}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{num(total)}</td>
                      <td style={td}><span style={pill(stateColor[st])}>{stateLabel[st]}</span></td>
                      <td style={td}>{o.payment_method === 'cash' ? <span style={pill(BLUE)}>{L.cash}</span> : ''}</td>
                      <td style={td}>{o.payment_method === 'instapay' ? <span style={pill(PURPLE)}>{L.instapay}</span> : ''}</td>
                      <td style={td}>{o.size ? <span style={pill('#8a8fa3')}>{o.size}</span> : L.none}</td>
                      <td style={td}>
                        <button disabled={busy} title={L.toggleHint} onClick={() => toggle(o, 'tailor_status')}
                          style={pill(o.tailor_status === 'received' ? GREEN : AMBER, true)}>
                          {o.tailor_status === 'received' ? L.received : L.notReceived}
                        </button>
                      </td>
                      <td style={td}>
                        <button disabled={busy} title={L.toggleHint} onClick={() => toggle(o, 'delivery_status')}
                          style={pill(o.delivery_status === 'delivered' ? GREEN : AMBER, true)}>
                          {o.delivery_status === 'delivered' ? L.delivered : L.notDelivered}
                        </button>
                      </td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          <button title={L.edit} aria-label={L.edit} onClick={() => openEdit(o)} style={iconBtn(BLUE)}><Pencil size={12} /></button>
                          <button title={L.del} aria-label={L.del} onClick={() => setToDelete(o)} style={iconBtn(RED)}><Trash2 size={12} /></button>
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={16} style={{ ...td, padding: '36px 0', color: 'var(--txt2)', fontSize: 13, borderBottom: 'none' }}>
                      {query.trim() ? L.emptySearch : L.empty}
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: 'start', fontWeight: 700, borderBottom: 'none', background: 'var(--bg-page)' }}>
                      {L.totals} ({rows.length})
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: GREEN, borderBottom: 'none', background: 'var(--bg-page)' }}>{num(sums.paid)}</td>
                    <td style={{ ...td, fontWeight: 800, color: sums.total - sums.paid > 0 ? RED : 'var(--txt1)', borderBottom: 'none', background: 'var(--bg-page)' }}>{num(Math.max(sums.total - sums.paid, 0))}</td>
                    <td style={{ ...td, fontWeight: 800, borderBottom: 'none', background: 'var(--bg-page)' }}>{num(sums.total)}</td>
                    <td colSpan={7} style={{ ...td, borderBottom: 'none', background: 'var(--bg-page)' }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div style={overlay} onClick={() => !saving && setShowForm(false)}>
          <form onSubmit={handleSave} noValidate onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
            width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto',
            direction: isRtl ? 'rtl' : 'ltr',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>
                {editing ? L.editOrder : L.newOrder}
              </p>
              <button type="button" aria-label={L.cancel} onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', color: 'var(--txt2)', cursor: 'pointer', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>{L.name}<span style={req}>*</span></label>
                <input list="leotard-students" value={form.customer_name} autoFocus
                  onChange={e => setField('customer_name', e.target.value)} style={field(!!errors.customer_name)} />
                <datalist id="leotard-students">
                  {students.map(s => <option key={s.id} value={s.name_ar} />)}
                </datalist>
                {errors.customer_name && <p style={errTxt}>{errors.customer_name}</p>}
              </div>

              <div>
                <label style={lbl}>{L.branch}</label>
                <input list="leotard-branches" value={form.branch}
                  onChange={e => setField('branch', e.target.value)} style={field()} />
                <datalist id="leotard-branches">
                  {branchOptions.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>

              <div>
                <label style={lbl}>{L.size}</label>
                <select value={form.size} onChange={e => setField('size', e.target.value)} style={field()}>
                  <option value="">{L.select}</option>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  {form.size && !SIZES.includes(form.size) && <option value={form.size}>{form.size}</option>}
                </select>
              </div>

              <div>
                <label style={lbl}>{L.date}</label>
                <input type="date" value={form.order_date}
                  onChange={e => setField('order_date', e.target.value)} style={field()} />
              </div>

              <div>
                <label style={lbl}>{L.day}</label>
                <select value={form.day_of_week} onChange={e => setField('day_of_week', e.target.value)} style={field()}>
                  <option value="">{L.select}</option>
                  {DAY_KEYS.map(d => <option key={d} value={d}>{L.days[d]}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>{L.group}</label>
                <input list="leotard-groups" value={form.group_name} dir="ltr" placeholder="5 - 7"
                  onChange={e => setField('group_name', e.target.value)}
                  style={{ ...field(), textAlign: isRtl ? 'right' : 'left' }} />
                <datalist id="leotard-groups">
                  {allGroupOptions.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>

              <div>
                <label style={lbl}>{L.total}<span style={req}>*</span></label>
                <input type="number" min="0" value={form.total_amount} placeholder="0"
                  onChange={e => setField('total_amount', e.target.value)} style={field(!!errors.total_amount)} />
                {errors.total_amount && <p style={errTxt}>{errors.total_amount}</p>}
              </div>

              <div>
                <label style={lbl}>{L.paid}</label>
                <input type="number" min="0" value={form.paid_amount} placeholder="0"
                  onChange={e => setField('paid_amount', e.target.value)} style={field(!!errors.paid_amount)} />
                {errors.paid_amount && <p style={errTxt}>{errors.paid_amount}</p>}
              </div>

              <div style={{
                gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{L.remaining}:</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: formRemaining > 0 ? RED : 'var(--txt1)' }}>{num(formRemaining)}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{L.payStatus}:</span>
                <span style={pill(stateColor[formState])}>{stateLabel[formState]}</span>
              </div>

              <div>
                <label style={lbl}>{L.method}</label>
                <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)} style={field()}>
                  <option value="">{L.none}</option>
                  <option value="cash">{L.cash}</option>
                  <option value="instapay">{L.instapay}</option>
                </select>
              </div>

              <div>
                <label style={lbl}>{L.tailor}</label>
                <select value={form.tailor_status} onChange={e => setField('tailor_status', e.target.value)} style={field()}>
                  <option value="pending">{L.notReceived}</option>
                  <option value="received">{L.received}</option>
                </select>
              </div>

              <div>
                <label style={lbl}>{L.delivery}</label>
                <select value={form.delivery_status} onChange={e => setField('delivery_status', e.target.value)} style={field()}>
                  <option value="pending">{L.notDelivered}</option>
                  <option value="delivered">{L.delivered}</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>{L.notes}</label>
                <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)}
                  style={{ ...field(), resize: 'vertical' }} />
              </div>

              {failed && <p style={{ ...errTxt, gridColumn: '1 / -1', fontSize: 12 }}>{failed}</p>}
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <button type="submit" disabled={saving} style={{
                background: PINK, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px',
                fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? L.saving : L.save}
              </button>
              <button type="button" onClick={() => setShowForm(false)} disabled={saving} style={{
                background: 'transparent', color: 'var(--txt1)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {L.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {toDelete && (
        <div style={overlay} onClick={() => setToDelete(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
            padding: 24, width: '100%', maxWidth: 360, textAlign: 'center', direction: isRtl ? 'rtl' : 'ltr',
          }}>
            <AlertTriangle size={26} color={RED} />
            <p style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>{L.delTitle}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--txt1)', fontWeight: 600 }}>{toDelete.customer_name}</p>
            <p style={{ margin: '4px 0 18px', fontSize: 12, color: 'var(--txt2)' }}>{L.delBody}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={confirmDelete} disabled={busyId === toDelete.id} style={{
                background: RED, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>{L.del}</button>
              <button onClick={() => setToDelete(null)} style={{
                background: 'transparent', color: 'var(--txt1)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{L.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
