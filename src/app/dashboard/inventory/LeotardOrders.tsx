'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LEOTARD_ORDER_COLUMNS } from './leotardColumns'

export interface LeotardOrder {
  id: string
  customer_name: string
  sheet_month: string | null
  branch: string | null
  order_date: string | null
  day_of_week: string | null
  group_name: string | null
  size: string | null
  total_amount: number
  paid_amount: number
  pay_status: string | null
  cash: boolean
  instapay: boolean
  tailor_status: string | null
  delivery_status: string | null
  created_at: string
}


interface Props {
  orders: LeotardOrder[]
  students: { id: string; name_ar: string }[]
  currentMonth: string
  setupNeeded: boolean
  isRtl: boolean
  slots: ClassSlot[]
  stock: React.ReactNode
}

/* ── Options: single source for dropdown values, labels and colours ── */
interface Opt { v: string; ar: string; en: string; bg: string; fg: string }
const W = '#ffffff'

const OPTIONS = {
  branch: [
    { v: 'miami',   ar: 'ميامي', en: 'Miami', bg: '#d4edbc', fg: '#11734b' },
    { v: 'branch2', ar: 'كي…',   en: 'K…',    bg: '#c6dbe1', fg: '#215a6c' }, // full name cut off in the sheet
  ],
  day: [
    { v: 'sat', ar: 'السبت',    en: 'Saturday',  bg: '#3d3d3d', fg: W },
    { v: 'sun', ar: 'الاحد',    en: 'Sunday',    bg: '#473822', fg: W },
    { v: 'mon', ar: 'الاثنين',  en: 'Monday',    bg: '#5a3286', fg: W },
    { v: 'tue', ar: 'الثلاثاء', en: 'Tuesday',   bg: '#0a53a8', fg: W },
    { v: 'wed', ar: 'الاربعاء', en: 'Wednesday', bg: '#11734b', fg: W },
    { v: 'thu', ar: 'الخميس',   en: 'Thursday',  bg: '#b10202', fg: W },
    { v: 'fri', ar: 'الجمعة',   en: 'Friday',    bg: '#215a6c', fg: W },
  ],
  group: [
    { v: '12 - 2',      ar: '12 - 2',      en: '12 - 2',      bg: '#ffcfc9', fg: '#b10202' },
    { v: '1 - 3',       ar: '1 - 3',       en: '1 - 3',       bg: '#ffc8aa', fg: '#753800' },
    { v: '4 - 6',       ar: '4 - 6',       en: '4 - 6',       bg: '#d4edbc', fg: '#11734b' },
    { v: '5 - 7',       ar: '5 - 7',       en: '5 - 7',       bg: '#bfe1f6', fg: '#0a53a8' },
    { v: '5.30 - 7.30', ar: '5.30 - 7.30', en: '5.30 - 7.30', bg: '#bfe1f6', fg: '#0a53a8' },
    { v: '6 - 8',       ar: '6 - 8',       en: '6 - 8',       bg: '#c6dbe1', fg: '#215a6c' },
  ],
  payStatus: [
    { v: 'paid',      ar: 'خالص', en: 'Paid',      bg: '#11734b', fg: W },
    { v: 'remaining', ar: 'باقي', en: 'Remaining', bg: '#b10202', fg: W },
  ],
  cash:     [{ v: 'yes', ar: 'كاش',      en: 'Cash',     bg: '#0a53a8', fg: W }],
  instapay: [{ v: 'yes', ar: 'انستاباي', en: 'Instapay', bg: '#5a3286', fg: W }],
  size: [
    { v: '5',  ar: '5',  en: '5',  bg: '#e8eaed', fg: '#3d3d3d' },
    { v: '7',  ar: '7',  en: '7',  bg: '#e6cff2', fg: '#5a3286' },
    { v: '9',  ar: '9',  en: '9',  bg: '#c6dbe1', fg: '#215a6c' },
    { v: '12', ar: '12', en: '12', bg: '#bfe1f6', fg: '#0a53a8' },
    { v: 'S',  ar: 'S',  en: 'S',  bg: '#d4edbc', fg: '#11734b' },
    { v: 'M',  ar: 'M',  en: 'M',  bg: '#ffe5a0', fg: '#473822' },
    { v: 'L',  ar: 'L',  en: 'L',  bg: '#ffc8aa', fg: '#753800' },
    { v: 'XL', ar: 'XL', en: 'XL', bg: '#ffcfc9', fg: '#b10202' },
  ],
  tailor: [
    { v: 'received', ar: 'تم الاستلام',     en: 'Received',     bg: '#11734b', fg: W },
    { v: 'pending',  ar: 'لم يتم الاستلام', en: 'Not received', bg: '#b10202', fg: W },
  ],
  delivery: [
    { v: 'delivered', ar: 'تم الاستلام',     en: 'Received',     bg: '#11734b', fg: W },
    { v: 'pending',   ar: 'لم يتم الاستلام', en: 'Not received', bg: '#b10202', fg: W },
  ],
} satisfies Record<string, Opt[]>

const LABELS = {
  en: {
    title: 'Leotards', stockTab: 'Leotard Stock', monthTab: 'Leotards',
    search: 'Search by name…', allBranches: 'All branches', allPay: 'All payment statuses',
    addRow: '+ Add row',
    num: '#', name: 'Name', branch: 'Branch', date: 'Date', day: 'Day', group: 'Group',
    paid: 'Paid', remaining: 'Remaining', total: 'Total', payStatus: 'Payment Status',
    cash: 'Cash', instapay: 'Instapay', size: 'Size',
    tailor: 'Received from Tailor', delivery: 'Delivered to Customer',
    statCount: 'Orders', statTotal: 'Total', statPaid: 'Paid', statRemaining: 'Remaining',
    statNotDelivered: 'Not delivered to customer', footTotal: 'Total',
    emptySheet: 'This sheet is empty — press "Add row" to start.',
    emptySearch: 'No results match your search.',
    delRow: 'Delete row', delTitle: 'Delete this row?', delBody: 'This cannot be undone.',
    del: 'Delete', cancel: 'Cancel', unnamed: '(no name)',
    addMonth: '+ Add month', addMonthTitle: 'Add a month sheet', month: 'Month', year: 'Year', add: 'Add',
    saveFailed: 'Some changes could not be saved. Check your connection, then press Retry.',
    actionFailed: 'That action failed. Check your connection and try again.',
    saving: 'Saving…', saved: 'All changes saved', notSaved: 'Not saved', retry: 'Retry',
    autoPay: 'Set automatically from the paid and total amounts',
    setupTitle: 'Leotard orders are not set up yet',
    setupBody: 'Run the file supabase/add_leotard_orders.sql in the Supabase SQL Editor, then refresh this page.',
  },
  ar: {
    title: 'مايوهات', stockTab: 'ستوك المايوهات', monthTab: 'مايوهات شهر',
    search: 'بحث بالاسم…', allBranches: 'كل الفروع', allPay: 'كل حالات الدفع',
    addRow: '+ إضافة صف',
    num: 'م', name: 'الاسم', branch: 'الفرع', date: 'التاريخ', day: 'اليوم', group: 'الجروب',
    paid: 'المدفوع', remaining: 'الباقي', total: 'الاجمالي', payStatus: 'حالة الدفع',
    cash: 'كاش', instapay: 'انستاباي', size: 'المقاس',
    tailor: 'حالة الاستلام من الخياط', delivery: 'حالة التسليم للعميل',
    statCount: 'عدد الطلبات', statTotal: 'الاجمالي', statPaid: 'المدفوع', statRemaining: 'الباقي',
    statNotDelivered: 'لم يُسلَّم للعميل', footTotal: 'الاجمالي',
    emptySheet: 'الشيت فاضي — دوس "إضافة صف" عشان تبدأ.',
    emptySearch: 'مفيش نتايج مطابقة للبحث.',
    delRow: 'حذف الصف', delTitle: 'حذف هذا الصف؟', delBody: 'لا يمكن التراجع عن هذا الإجراء.',
    del: 'حذف', cancel: 'إلغاء', unnamed: '(بدون اسم)',
    addMonth: '+ إضافة شهر', addMonthTitle: 'إضافة شيت شهر جديد', month: 'الشهر', year: 'السنة', add: 'إضافة',
    saveFailed: 'تعذر حفظ بعض التعديلات. تأكد من الاتصال ثم اضغط إعادة المحاولة.',
    actionFailed: 'تعذر تنفيذ العملية. تأكد من الاتصال وحاول مرة أخرى.',
    saving: 'جارٍ الحفظ…', saved: 'تم حفظ كل التعديلات', notSaved: 'لم يُحفظ', retry: 'إعادة المحاولة',
    autoPay: 'تتحدد تلقائياً من المدفوع والاجمالي',
    setupTitle: 'طلبات المايوهات غير مفعّلة بعد',
    setupBody: 'شغّل الملف supabase/add_leotard_orders.sql في Supabase SQL Editor ثم حدّث الصفحة.',
  },
}

const CSS = `
.lsw-page{padding:24px 28px;background:var(--bg-page);min-height:100%}
.lsw-sync{font-size:12.5px;font-weight:600;border-radius:999px;padding:5px 12px;white-space:nowrap;border:1px solid var(--border);color:var(--txt2);background:var(--bg-card)}
.lsw-sync.ok{color:#3dab7e;background:#3dab7e14;border-color:#3dab7e30}
.lsw-sync.bad{color:#e04040;background:#e0404014;border-color:#e0404040}
.lsw-top{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:14px}
.lsw-brand{display:flex;align-items:center;gap:10px;margin-inline-end:auto}
.lsw-logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#e58fa0,#c9506a);color:#fff;display:grid;place-items:center;font-weight:700;font-size:17px;box-shadow:0 4px 12px #d4667a40}
.lsw-brand h1{font-size:20px;margin:0;color:var(--txt1);font-weight:800;line-height:1.2}
.lsw-brand small{display:block;color:var(--txt2);font-size:12.5px}
.lsw-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.lsw-tools input,.lsw-tools select{height:38px;border:1px solid var(--border);border-radius:10px;padding:0 12px;font:inherit;font-size:13px;background:var(--bg-card);color:var(--txt1);transition:border-color .15s,box-shadow .15s}
.lsw-tools input:focus,.lsw-tools select:focus{outline:0;border-color:#d4667a;box-shadow:0 0 0 3px #d4667a26}
.lsw-tools input{width:210px}
.lsw-btn{height:38px;padding:0 16px;border:0;border-radius:8px;background:#d4667a;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.lsw-btn:hover{filter:brightness(1.08)}
.lsw-btn:disabled{opacity:.6;cursor:default}
.lsw-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:12px}
.lsw-stat{--tone:var(--border);position:relative;overflow:hidden;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 16px}
.lsw-stat::before{content:"";position:absolute;inset-block:0;inset-inline-start:0;width:4px;background:var(--tone)}
.lsw-stat span{display:block;color:var(--txt2);font-size:12px;font-weight:600}
.lsw-stat b{display:block;margin-top:2px;font-size:22px;line-height:1.25;color:var(--txt1);font-variant-numeric:tabular-nums}
.lsw-stat.pink{--tone:#d4667a}
.lsw-stat.info{--tone:#4a90d9}
.lsw-stat.amber{--tone:#e8960a}
.lsw-stat.amber b{color:#e8960a}
.lsw-stat.warn{--tone:#e04040}
.lsw-stat.warn b{color:#e04040}
.lsw-stat.ok{--tone:#3dab7e}
.lsw-stat.ok b{color:#3dab7e}
.lsw-err{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 10px;padding:8px 12px;border-radius:8px;background:#e0404014;border:1px solid #e0404040;color:#e04040;font-size:12.5px;font-weight:600}
.lsw-err button{border:0;border-radius:6px;background:#e04040;color:#fff;font:inherit;font-weight:700;padding:5px 14px;cursor:pointer}
.lsw-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:10px 10px 0 0;overflow:auto;max-height:calc(100vh - 330px);min-height:220px}
.lsw-wrap table{direction:ltr;border-collapse:separate;border-spacing:0;width:100%;min-width:1560px}
.lsw-wrap th,.lsw-wrap td{border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:0 8px;height:46px;text-align:center;white-space:nowrap;background:var(--bg-card);color:var(--txt1);font-size:14.5px}
.lsw-wrap thead th{position:sticky;top:0;z-index:2;background:#f1c232;color:#1f1f1f;font-weight:700;font-size:14.5px;border-right-color:#00000026;border-bottom:1px solid #00000033}
.lsw-wrap thead th.sm{font-size:12.5px}
.lsw-wrap tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--bg-page) 55%,var(--bg-card))}
.lsw-wrap tbody tr:hover td{background:color-mix(in srgb,#d4667a 10%,var(--bg-card))}
.lsw-wrap td.idx{width:52px;color:var(--txt2);font-variant-numeric:tabular-nums}
.lsw-wrap td.num,.lsw-wrap tfoot td{font-variant-numeric:tabular-nums}
.lsw-wrap td.due{color:#e04040;font-weight:700}
.lsw-wrap tfoot td{position:sticky;bottom:0;background:var(--bg-page);font-weight:700;border-top:1px solid var(--border);border-bottom:0}
.lsw-wrap tfoot td{z-index:2}
.lsw-wrap th:nth-child(2),.lsw-wrap td:nth-child(2){position:sticky;left:0;z-index:1}
.lsw-wrap thead th:nth-child(2),.lsw-wrap tfoot td:nth-child(2){z-index:3}
.lsw-wrap td.act,.lsw-wrap th.act{border-right:0;width:40px;padding:0 4px}
.lsw-del{border:0;background:none;color:#e04040;font-size:18px;line-height:1;cursor:pointer;opacity:0;width:28px;height:28px;border-radius:6px;font-family:inherit}
.lsw-wrap tr:hover .lsw-del,.lsw-del:focus{opacity:1}
.lsw-del:hover{background:#e0404020}
.lsw-wrap td input{width:100%;height:34px;border:1px solid transparent;border-radius:6px;background:transparent;font:inherit;text-align:center;color:inherit;padding:0 4px}
.lsw-wrap td input:hover{border-color:var(--border)}
.lsw-wrap td input:focus,.lsw-wrap td select:focus{outline:2px solid #d4667a;outline-offset:1px;border-color:transparent}
.lsw-wrap td input[type=number]{width:84px;-moz-appearance:textfield;appearance:textfield}
.lsw-wrap td input[type=number]::-webkit-inner-spin-button{display:none}
.lsw-wrap td input[name=name]{min-width:150px}
.lsw-chip{position:relative;display:inline-block;--bg:#e8eaed;--fg:#3d3d3d}
.lsw-chip select{appearance:none;-webkit-appearance:none;border:0;border-radius:999px;background:var(--bg);color:var(--fg);font:inherit;font-weight:600;font-size:14px;height:28px;min-width:104px;padding:0 14px 0 30px;text-align:center;text-align-last:center;cursor:pointer}
.lsw-chip.wide select{min-width:140px}
.lsw-chip::after{content:"";position:absolute;left:12px;top:50%;margin-top:-2px;border:5px solid transparent;border-top-color:var(--fg);border-bottom:0;pointer-events:none}
.lsw-chip.empty select{background:transparent;color:var(--txt2);box-shadow:inset 0 0 0 1px var(--border)}
.lsw-chip.empty::after{border-top-color:var(--txt2);opacity:.7}
.lsw-chip option{background:#fff;color:#1f1f1f}
.lsw-pill{display:inline-block;border-radius:999px;background:var(--bg);color:var(--fg);font-weight:600;font-size:14px;height:28px;line-height:28px;min-width:104px;padding:0 14px;cursor:default}
.lsw-empty{padding:56px 20px;text-align:center;color:var(--txt2);font-size:14px}
.lsw-stockpane{background:var(--bg-card);border:1px solid var(--border);border-radius:10px 10px 0 0;padding:20px}
.lsw-tabbar{display:flex;align-items:stretch;background:var(--bg-page);border:1px solid var(--border);border-top:0;border-radius:0 0 10px 10px}
.lsw-tabs{display:flex;gap:4px;overflow-x:auto;padding:6px;flex:1;min-width:0;scrollbar-width:thin}
.lsw-addmonth{flex-shrink:0;margin:6px;border:1px dashed #d4667a99;border-radius:8px;background:none;color:#d4667a;font:inherit;font-size:13px;font-weight:700;padding:0 14px;cursor:pointer;white-space:nowrap}
.lsw-addmonth:hover{background:#d4667a14;border-style:solid}
.lsw-modal .fields{display:flex;gap:10px;justify-content:center;margin-top:16px}
.lsw-modal label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--txt2);text-align:start}
.lsw-modal select{height:38px;min-width:120px;border:1px solid var(--border);border-radius:8px;padding:0 10px;font:inherit;font-size:13px;background:var(--bg-page);color:var(--txt1)}
.lsw-tab{border:0;background:none;font:inherit;font-size:13.5px;padding:8px 16px;border-radius:8px;cursor:pointer;color:var(--txt2);white-space:nowrap;transition:background .15s,color .15s}
.lsw-tab:hover{background:var(--bg-card);color:var(--txt1)}
.lsw-tab[aria-selected=true]{background:#d4667a;color:#fff;font-weight:700;box-shadow:0 2px 8px #d4667a40}
.lsw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.lsw-modal{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:360px;text-align:center}
.lsw-modal p{margin:0}
.lsw-modal .btns{display:flex;gap:10px;justify-content:center;margin-top:18px}
.lsw-modal button{border-radius:10px;padding:8px 20px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
@media (hover:none){.lsw-del{opacity:1}}
@media (max-width:640px){
.lsw-page{padding:14px 12px}
.lsw-tools{width:100%}
.lsw-tools input{width:100%}
.lsw-tools select{flex:1;min-width:0}
.lsw-tools .lsw-btn{width:100%}
.lsw-stats{grid-template-columns:repeat(2,1fr);gap:8px}
.lsw-stat{padding:10px 12px}
.lsw-stat span{font-size:12px}
.lsw-stat b{font-size:18px}
.lsw-stat:last-child{grid-column:1/-1}
.lsw-wrap{max-height:70vh}
.lsw-wrap th,.lsw-wrap td{height:42px;font-size:13.5px;padding:0 6px}
.lsw-wrap thead th{font-size:14px}
.lsw-wrap td input[name=name]{min-width:120px}
.lsw-stockpane{padding:14px}
.lsw-tab{padding:8px 12px}
.lsw-addmonth{padding:0 10px}
}
`

const STOCK = 'stock'
const EXTRA_MONTHS_KEY = 'lsw-extra-months'

/** A class time slot on one weekday, e.g. { day: 'fri', label: '12 - 2' } */
export interface ClassSlot { day: string; label: string }

const JS_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function dayOfDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? JS_DAYS[new Date(y, m - 1, d).getDay()] : ''
}

// Colours for groups that are not in OPTIONS.group
const GROUP_PALETTE = [
  { bg: '#ffcfc9', fg: '#b10202' }, { bg: '#ffc8aa', fg: '#753800' }, { bg: '#ffe5a0', fg: '#473822' },
  { bg: '#d4edbc', fg: '#11734b' }, { bg: '#bfe1f6', fg: '#0a53a8' }, { bg: '#c6dbe1', fg: '#215a6c' },
  { bg: '#e6cff2', fg: '#5a3286' },
]
function groupOpt(label: string): Opt {
  const known = OPTIONS.group.find(o => o.v === label)
  if (known) return known
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) % 997
  return { v: label, ar: label, en: label, ...GROUP_PALETTE[h % GROUP_PALETTE.length] }
}

// Payment status follows the amounts; it is only chosen by hand while a row has no amounts yet
function hasAmounts(r: LeotardOrder) {
  return r.total_amount > 0 || r.paid_amount > 0
}
function payOf(r: LeotardOrder): string {
  if (!hasAmounts(r)) return r.pay_status || ''
  return r.paid_amount >= r.total_amount ? 'paid' : 'remaining'
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
}

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function Chip({ value, options, label, wide, isRtl, onChange }: {
  value: string; options: Opt[]; label: string; wide?: boolean; isRtl: boolean
  onChange: (v: string) => void
}) {
  const o = options.find(x => x.v === value)
  const style = (o ? { '--bg': o.bg, '--fg': o.fg } : {}) as React.CSSProperties
  return (
    <span className={`lsw-chip${wide ? ' wide' : ''}${value ? '' : ' empty'}`} style={style}>
      <select value={value} aria-label={label} dir={isRtl ? 'rtl' : 'ltr'} onChange={e => onChange(e.target.value)}>
        <option value=""></option>
        {options.map(x => <option key={x.v} value={x.v}>{isRtl ? x.ar : x.en}</option>)}
        {value && !o && <option value={value}>{value}</option>}
      </select>
    </span>
  )
}

function Pill({ value, options, title, isRtl }: { value: string; options: Opt[]; title: string; isRtl: boolean }) {
  const o = options.find(x => x.v === value)
  if (!o) return null
  return (
    <span className="lsw-pill" title={title} style={{ '--bg': o.bg, '--fg': o.fg } as React.CSSProperties}>
      {isRtl ? o.ar : o.en}
    </span>
  )
}

export default function LeotardOrders({ orders, students, slots, currentMonth, setupNeeded, isRtl, stock }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const L = LABELS[isRtl ? 'ar' : 'en']

  const [rows, setRows] = useState<LeotardOrder[]>(() =>
    orders.map(o => ({ ...o, total_amount: Number(o.total_amount) || 0, paid_amount: Number(o.paid_amount) || 0 })))
  const [active, setActive] = useState(currentMonth)
  const [query, setQuery] = useState('')
  const [fBranch, setFBranch] = useState('')
  const [fPay, setFPay] = useState('')
  const [failed, setFailed] = useState(false)   // an add or delete failed
  const [pending, setPending] = useState(0)     // edits being saved right now
  const [unsaved, setUnsaved] = useState(0)     // rows with an edit that failed to save
  const [savedOnce, setSavedOnce] = useState(false)
  const failedPatches = useRef(new Map<string, Partial<LeotardOrder>>())
  const [adding, setAdding] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<LeotardOrder | null>(null)
  // Months added with "Add month". They are remembered in this browser until they hold a row.
  const [extraMonths, setExtraMonths] = useState<string[]>([])
  const [monthForm, setMonthForm] = useState<{ y: number; m: number } | null>(null)
  const tabsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(EXTRA_MONTHS_KEY) || '[]')
      if (Array.isArray(saved)) setExtraMonths(saved.filter(x => /^\d{4}-\d{2}$/.test(String(x))))
    } catch { /* storage unavailable */ }
  }, [])
  const dirty = useRef(new Set<string>())
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  // Month tabs: two months back to three ahead, plus any month that has rows
  const months = useMemo(() => {
    const set = new Set<string>()
    for (let d = -2; d <= 3; d++) set.add(addMonths(currentMonth, d))
    rows.forEach(r => { if (r.sheet_month) set.add(r.sheet_month) })
    extraMonths.forEach(m => set.add(m))
    return Array.from(set).sort()
  }, [rows, currentMonth, extraMonths])

  // "Add month" suggests the month after the last tab
  function openMonthForm() {
    const [y, m] = addMonths(months[months.length - 1], 1).split('-').map(Number)
    setMonthForm({ y, m })
  }

  function addMonth() {
    if (!monthForm) return
    const ym = `${monthForm.y}-${String(monthForm.m).padStart(2, '0')}`
    if (!months.includes(ym)) {
      const list = [...extraMonths, ym]
      setExtraMonths(list)
      try { localStorage.setItem(EXTRA_MONTHS_KEY, JSON.stringify(list)) } catch { /* storage unavailable */ }
    }
    setActive(ym)
    setMonthForm(null)
  }

  // Keep the selected tab in view
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active, months])

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    const year = String(y) === currentMonth.slice(0, 4) ? '' : ` ${y}`
    if (isRtl) return `${L.monthTab} ${m}${year}`
    const name = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(y, m - 1, 1))
    return `${L.monthTab} — ${name}${year}`
  }

  const isStock = active === STOCK
  const sheetRows = useMemo(() => rows.filter(r => r.sheet_month === active), [rows, active])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sheetRows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) =>
        (!q || r.customer_name.toLowerCase().includes(q)) &&
        (!fBranch || r.branch === fBranch) &&
        (!fPay || payOf(r) === fPay))
  }, [sheetRows, query, fBranch, fPay])

  const paid = visible.reduce((s, { r }) => s + r.paid_amount, 0)
  const total = visible.reduce((s, { r }) => s + r.total_amount, 0)
  const rem = total - paid
  const notDelivered = visible.filter(({ r }) => r.delivery_status !== 'delivered').length

  useEffect(() => {
    if (!focusId) return
    const tr = bodyRef.current?.querySelector(`tr[data-id="${focusId}"]`)
    tr?.scrollIntoView({ block: 'nearest' })
    tr?.querySelector<HTMLInputElement>('input[name=name]')?.focus()
    setFocusId(null)
  }, [focusId, rows])

  function patchLocal(id: string, patch: Partial<LeotardOrder>) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  // A failed edit is kept per row and sent again with the row's next save or with Retry
  async function save(id: string, patch: Partial<LeotardOrder>) {
    const full = { ...failedPatches.current.get(id), ...patch }
    failedPatches.current.delete(id)
    setPending(n => n + 1)
    let ok = false
    try {
      const { error } = await supabase.from('leotard_orders').update(full).eq('id', id)
      ok = !error
    } catch { /* network failure */ }
    if (ok) setSavedOnce(true)
    else failedPatches.current.set(id, { ...full, ...failedPatches.current.get(id) })
    setUnsaved(failedPatches.current.size)
    setPending(n => n - 1)
  }

  function retry() {
    for (const id of Array.from(failedPatches.current.keys())) save(id, {})
  }

  // Warn before leaving while edits are still unsaved
  useEffect(() => {
    if (!pending && !unsaved) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending, unsaved])

  // Dropdowns and dates save immediately
  function change(id: string, patch: Partial<LeotardOrder>) {
    patchLocal(id, patch)
    save(id, patch)
  }

  // Typed cells update the screen while typing and save when the cell loses focus
  type TypedField = 'customer_name' | 'paid_amount' | 'total_amount'
  function typedPatch(field: TypedField, raw: string): Partial<LeotardOrder> {
    if (field === 'customer_name') return { customer_name: raw }
    const n = Math.max(Number(raw) || 0, 0)
    return field === 'paid_amount' ? { paid_amount: n } : { total_amount: n }
  }

  // Changing an amount also sets the payment status
  function withAmountStatus(r: LeotardOrder, patch: Partial<LeotardOrder>): Partial<LeotardOrder> {
    const next = { ...r, ...patch }
    return { ...patch, pay_status: hasAmounts(next) ? payOf(next) : null }
  }

  function typing(id: string, field: TypedField, raw: string) {
    dirty.current.add(`${id}:${field}`)
    const patch = typedPatch(field, raw)
    setRows(rs => rs.map(r => r.id !== id ? r
      : { ...r, ...(field === 'customer_name' ? patch : withAmountStatus(r, patch)) }))
  }

  function commit(id: string, field: TypedField, raw: string) {
    const key = `${id}:${field}`
    if (!dirty.current.has(key)) return
    dirty.current.delete(key)
    if (field === 'customer_name') { save(id, typedPatch(field, raw.trim())); return }
    const r = rows.find(x => x.id === id)
    const patch = typedPatch(field, raw)
    save(id, r ? withAmountStatus(r, patch) : patch)
  }

  async function addRow() {
    if (isStock || adding) return
    setQuery(''); setFBranch(''); setFPay('')
    setAdding(true)
    const { data, error } = await supabase
      .from('leotard_orders')
      .insert({ customer_name: '', sheet_month: active, total_amount: 0, paid_amount: 0 })
      .select(LEOTARD_ORDER_COLUMNS)
      .single()
    setAdding(false)
    if (error || !data) { setFailed(true); return }
    const row = data as unknown as LeotardOrder
    setFailed(false)
    setRows(rs => [...rs, { ...row, total_amount: Number(row.total_amount) || 0, paid_amount: Number(row.paid_amount) || 0 }])
    setFocusId(row.id)
  }

  async function confirmDelete() {
    if (!toDelete) return
    const id = toDelete.id
    setToDelete(null)
    const { error } = await supabase.from('leotard_orders').delete().eq('id', id)
    if (error) { setFailed(true); return }
    setFailed(false)
    failedPatches.current.delete(id)
    setUnsaved(failedPatches.current.size)
    setRows(rs => rs.filter(r => r.id !== id))
  }

  // Groups offered in a row: the classes held on the weekday of the row's date
  // (or of its day, when no date is set). With neither, every group is offered.
  const groupsByDay = useMemo(() => {
    const map: Record<string, Opt[]> = { all: [] }
    for (const s of slots) {
      const list = (map[s.day] ||= [])
      if (!list.some(o => o.v === s.label)) list.push(groupOpt(s.label))
      if (!map.all.some(o => o.v === s.label)) map.all.push(groupOpt(s.label))
    }
    return map
  }, [slots])

  function groupsFor(r: LeotardOrder): Opt[] {
    const day = (r.order_date && dayOfDate(r.order_date)) || r.day_of_week || ''
    if (!day) return groupsByDay.all.length ? groupsByDay.all : OPTIONS.group
    return groupsByDay[day] || []
  }

  // Picking a date also sets the day, and clears a group that is not held on that day
  function changeDate(r: LeotardOrder, value: string) {
    const patch: Partial<LeotardOrder> = { order_date: value || null }
    const day = value ? dayOfDate(value) : ''
    if (day) {
      patch.day_of_week = day
      const allowed = groupsByDay[day] || []
      if (r.group_name && !allowed.some(o => o.v === r.group_name)) patch.group_name = null
    }
    change(r.id, patch)
  }

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  const tabs = [{ id: STOCK, label: L.stockTab }, ...months.map(m => ({ id: m, label: monthLabel(m) }))]
  const activeLabel = tabs.find(t => t.id === active)?.label || ''

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Top bar */}
      <div className="lsw-top">
        <div className="lsw-brand">
          <div className="lsw-logo">{isRtl ? 'م' : 'L'}</div>
          <div><h1>{L.title}</h1><small>{activeLabel}</small></div>
        </div>
        {!setupNeeded && (pending > 0 || unsaved > 0 || savedOnce) && (
          <span role="status" className={`lsw-sync${pending ? '' : unsaved ? ' bad' : ' ok'}`}>
            {pending ? L.saving : unsaved ? `${L.notSaved} (${unsaved})` : `✓ ${L.saved}`}
          </span>
        )}
        {!isStock && !setupNeeded && (
          <div className="lsw-tools">
            <input type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={L.search} aria-label={L.search} />
            <select value={fBranch} onChange={e => setFBranch(e.target.value)} aria-label={L.allBranches}>
              <option value="">{L.allBranches}</option>
              {OPTIONS.branch.map(o => <option key={o.v} value={o.v}>{isRtl ? o.ar : o.en}</option>)}
            </select>
            <select value={fPay} onChange={e => setFPay(e.target.value)} aria-label={L.allPay}>
              <option value="">{L.allPay}</option>
              {OPTIONS.payStatus.map(o => <option key={o.v} value={o.v}>{isRtl ? o.ar : o.en}</option>)}
            </select>
            <button className="lsw-btn" onClick={addRow} disabled={adding}>{L.addRow}</button>
          </div>
        )}
      </div>

      {isStock ? (
        <div className="lsw-stockpane">{stock}</div>
      ) : setupNeeded ? (
        <div className="lsw-stockpane">
          <p style={{ margin: 0, color: '#e8960a', fontWeight: 700, fontSize: 14 }}>{L.setupTitle}</p>
          <p style={{ margin: '4px 0 0', color: 'var(--txt2)', fontSize: 13 }}>{L.setupBody}</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="lsw-stats">
            <div className="lsw-stat pink"><span>{L.statCount}</span><b>{visible.length}</b></div>
            <div className="lsw-stat info"><span>{L.statTotal}</span><b>{fmt(total)}</b></div>
            <div className="lsw-stat ok"><span>{L.statPaid}</span><b>{fmt(paid)}</b></div>
            <div className={`lsw-stat${rem > 0 ? ' warn' : ''}`}><span>{L.statRemaining}</span><b>{fmt(rem)}</b></div>
            <div className={`lsw-stat${notDelivered > 0 ? ' amber' : ''}`}><span>{L.statNotDelivered}</span><b>{notDelivered}</b></div>
          </div>

          {unsaved > 0 && (
            <p className="lsw-err">
              <span>{L.saveFailed}</span>
              <button onClick={retry} disabled={pending > 0}>{L.retry}</button>
            </p>
          )}
          {failed && <p className="lsw-err">{L.actionFailed}</p>}

          {/* Sheet */}
          <div className="lsw-wrap">
            <table>
              <thead>
                <tr>
                  <th>{L.num}</th>
                  <th>{L.name}</th>
                  <th>{L.branch}</th>
                  <th>{L.date}</th>
                  <th>{L.day}</th>
                  <th>{L.group}</th>
                  <th>{L.paid}</th>
                  <th>{L.remaining}</th>
                  <th>{L.total}</th>
                  <th>{L.payStatus}</th>
                  <th>{L.cash}</th>
                  <th>{L.instapay}</th>
                  <th>{L.size}</th>
                  <th className="sm">{L.tailor}</th>
                  <th className="sm">{L.delivery}</th>
                  <th className="act"></th>
                </tr>
              </thead>
              <tbody ref={bodyRef}>
                {visible.map(({ r, i }) => {
                  const x = r.total_amount - r.paid_amount
                  return (
                    <tr key={r.id} data-id={r.id}>
                      <td className="idx">{i + 1}</td>
                      <td>
                        <input name="name" dir="auto" list="lsw-students" aria-label={L.name}
                          defaultValue={r.customer_name} onKeyDown={onEnter}
                          onChange={e => typing(r.id, 'customer_name', e.target.value)}
                          onBlur={e => commit(r.id, 'customer_name', e.target.value)} />
                      </td>
                      <td>
                        <Chip value={r.branch || ''} options={OPTIONS.branch} label={L.branch} isRtl={isRtl}
                          onChange={v => change(r.id, { branch: v || null })} />
                      </td>
                      <td>
                        <input type="date" aria-label={L.date} defaultValue={r.order_date || ''}
                          onChange={e => changeDate(r, e.target.value)} />
                      </td>
                      <td>
                        <Chip value={r.day_of_week || ''} options={OPTIONS.day} label={L.day} isRtl={isRtl}
                          onChange={v => change(r.id, { day_of_week: v || null })} />
                      </td>
                      <td>
                        <Chip value={r.group_name || ''} options={groupsFor(r)} label={L.group} isRtl={false}
                          onChange={v => change(r.id, { group_name: v || null })} />
                      </td>
                      <td className="num">
                        <input type="number" min="0" step="1" aria-label={L.paid}
                          defaultValue={r.paid_amount} onKeyDown={onEnter}
                          onChange={e => typing(r.id, 'paid_amount', e.target.value)}
                          onBlur={e => commit(r.id, 'paid_amount', e.target.value)} />
                      </td>
                      <td className={`num${x > 0 ? ' due' : ''}`}>{fmt(x)}</td>
                      <td className="num">
                        <input type="number" min="0" step="1" aria-label={L.total}
                          defaultValue={r.total_amount} onKeyDown={onEnter}
                          onChange={e => typing(r.id, 'total_amount', e.target.value)}
                          onBlur={e => commit(r.id, 'total_amount', e.target.value)} />
                      </td>
                      <td>
                        {hasAmounts(r)
                          ? <Pill value={payOf(r)} options={OPTIONS.payStatus} title={L.autoPay} isRtl={isRtl} />
                          : <Chip value={r.pay_status || ''} options={OPTIONS.payStatus} label={L.payStatus} isRtl={isRtl}
                              onChange={v => change(r.id, { pay_status: v || null })} />}
                      </td>
                      <td>
                        <Chip value={r.cash ? 'yes' : ''} options={OPTIONS.cash} label={L.cash} isRtl={isRtl}
                          onChange={v => change(r.id, { cash: v === 'yes' })} />
                      </td>
                      <td>
                        <Chip value={r.instapay ? 'yes' : ''} options={OPTIONS.instapay} label={L.instapay} isRtl={isRtl}
                          onChange={v => change(r.id, { instapay: v === 'yes' })} />
                      </td>
                      <td>
                        <Chip value={r.size || ''} options={OPTIONS.size} label={L.size} isRtl={false}
                          onChange={v => change(r.id, { size: v || null })} />
                      </td>
                      <td>
                        <Chip wide value={r.tailor_status || ''} options={OPTIONS.tailor} label={L.tailor} isRtl={isRtl}
                          onChange={v => change(r.id, { tailor_status: v || null })} />
                      </td>
                      <td>
                        <Chip wide value={r.delivery_status || ''} options={OPTIONS.delivery} label={L.delivery} isRtl={isRtl}
                          onChange={v => change(r.id, { delivery_status: v || null })} />
                      </td>
                      <td className="act">
                        <button className="lsw-del" title={L.delRow} aria-label={L.delRow} onClick={() => setToDelete(r)}>×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {visible.length > 0 && (
                <tfoot>
                  <tr>
                    <td></td>
                    <td>{L.footTotal}</td>
                    <td></td><td></td><td></td><td></td>
                    <td>{fmt(paid)}</td>
                    <td>{fmt(rem)}</td>
                    <td>{fmt(total)}</td>
                    <td></td><td></td><td></td><td></td><td></td><td></td>
                    <td className="act"></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {visible.length === 0 && (
              <div className="lsw-empty">{sheetRows.length ? L.emptySearch : L.emptySheet}</div>
            )}
          </div>
          <datalist id="lsw-students">
            {students.map(s => <option key={s.id} value={s.name_ar} />)}
          </datalist>
        </>
      )}

      {/* Month tabs */}
      <div className="lsw-tabbar">
        <nav className="lsw-tabs" role="tablist" ref={tabsRef}>
          {tabs.map(t => (
            <button key={t.id} className="lsw-tab" role="tab" aria-selected={t.id === active}
              onClick={() => setActive(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        {!setupNeeded && <button className="lsw-addmonth" onClick={openMonthForm}>{L.addMonth}</button>}
      </div>

      {/* Add month */}
      {monthForm && (() => {
        const thisYear = Number(currentMonth.slice(0, 4))
        const years = Array.from(new Set([thisYear - 1, thisYear, thisYear + 1, thisYear + 2, monthForm.y])).sort()
        const monthName = (m: number) => isRtl ? String(m)
          : new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, m - 1, 1))
        return (
          <div className="lsw-overlay" onClick={() => setMonthForm(null)}>
            <div className="lsw-modal" onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>{L.addMonthTitle}</p>
              <div className="fields">
                <label>
                  {L.month}
                  <select value={monthForm.m} onChange={e => setMonthForm({ ...monthForm, m: Number(e.target.value) })}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{monthName(m)}</option>)}
                  </select>
                </label>
                <label>
                  {L.year}
                  <select value={monthForm.y} onChange={e => setMonthForm({ ...monthForm, y: Number(e.target.value) })}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              </div>
              <div className="btns">
                <button onClick={addMonth} style={{ background: '#d4667a', color: '#fff', border: 'none' }}>{L.add}</button>
                <button onClick={() => setMonthForm(null)}
                  style={{ background: 'transparent', color: 'var(--txt1)', border: '1px solid var(--border)' }}>{L.cancel}</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete confirmation */}
      {toDelete && (
        <div className="lsw-overlay" onClick={() => setToDelete(null)}>
          <div className="lsw-modal" onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>{L.delTitle}</p>
            <p style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
              {toDelete.customer_name || L.unnamed}
            </p>
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--txt2)' }}>{L.delBody}</p>
            <div className="btns">
              <button onClick={confirmDelete} style={{ background: '#e04040', color: '#fff', border: 'none' }}>{L.del}</button>
              <button onClick={() => setToDelete(null)}
                style={{ background: 'transparent', color: 'var(--txt1)', border: '1px solid var(--border)' }}>{L.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
