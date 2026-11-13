'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search, Trash2, Upload, Plus, House, CreditCard, Shirt, Scissors, UsersRound,
  ShoppingCart, Wallet, HandCoins, Clock, UserRound, CalendarDays, ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LEOTARD_ORDER_COLUMNS } from './leotardColumns'
import { LEOTARD_CSS } from './leotardStyles'
import { parseLeotardSheet, type ImportedOrder } from './leotardImport'

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
    addRow: 'Add row', home: 'Dashboard', prevTabs: 'Previous months', nextTabs: 'Next months',
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
    importXlsx: 'Import', clear: 'Clear filters', filterHint: 'Click to show only these rows',
    all: 'All', fPay: 'Payment', fSize: 'Size', fTailor: 'From tailor', fDelivery: 'To customer',
    showing: (n: number, of: number) => `Showing ${n} of ${of}`,
    addMonth: 'Add month', addMonthTitle: 'Add a month sheet', month: 'Month', year: 'Year', add: 'Add',
    saveFailed: 'Some changes could not be saved. Check your connection, then press Retry.',
    actionFailed: 'That action failed. Check your connection and try again.',
    saving: 'Saving…', saved: 'All changes saved', notSaved: 'Not saved', retry: 'Retry',
    autoPay: 'Set automatically from the paid and total amounts',
    importTitle: (n: number, sheet: string) => `Import ${n} ${n === 1 ? 'row' : 'rows'} into ${sheet}?`,
    importBody: 'The rows are added to this sheet; rows already on it stay as they are.',
    importDo: 'Import', importing: 'Importing…',
    importDone: (n: number) => `${n} ${n === 1 ? 'row' : 'rows'} imported.`,
    importNotExcel: 'Only Excel files (.xlsx) can be imported.',
    importUnreadable: 'This file could not be read. Open it in Excel, save it as .xlsx and try again.',
    importNoHeader: 'No "Name" column was found. The first row of the sheet should hold the column titles (Name, Date, Paid, Total…).',
    importNoRows: 'The file has no rows to import.',
    importFailed: 'The import failed, nothing was added. Check your connection and try again.',
    setupTitle: 'Leotard orders are not set up yet',
    setupBody: 'Run the file supabase/add_leotard_orders.sql in the Supabase SQL Editor, then refresh this page.',
  },
  ar: {
    title: 'مايوهات', stockTab: 'ستوك المايوهات', monthTab: 'مايوهات شهر',
    search: 'بحث بالاسم…', allBranches: 'كل الفروع', allPay: 'كل حالات الدفع',
    addRow: 'إضافة صف', home: 'لوحة التحكم', prevTabs: 'الشهور السابقة', nextTabs: 'الشهور التالية',
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
    importXlsx: 'استيراد', clear: 'مسح الفلاتر', filterHint: 'اضغط لعرض هذه الصفوف فقط',
    all: 'الكل', fPay: 'الدفع', fSize: 'المقاس', fTailor: 'من الخياط', fDelivery: 'للعميل',
    showing: (n: number, of: number) => `عرض ${n} من ${of}`,
    addMonth: 'إضافة شهر', addMonthTitle: 'إضافة شيت شهر جديد', month: 'الشهر', year: 'السنة', add: 'إضافة',
    saveFailed: 'تعذر حفظ بعض التعديلات. تأكد من الاتصال ثم اضغط إعادة المحاولة.',
    actionFailed: 'تعذر تنفيذ العملية. تأكد من الاتصال وحاول مرة أخرى.',
    saving: 'جارٍ الحفظ…', saved: 'تم حفظ كل التعديلات', notSaved: 'لم يُحفظ', retry: 'إعادة المحاولة',
    autoPay: 'تتحدد تلقائياً من المدفوع والاجمالي',
    importTitle: (n: number, sheet: string) => `استيراد ${n} صف إلى ${sheet}؟`,
    importBody: 'هتتضاف الصفوف للشيت ده، والصفوف الموجودة هتفضل زي ما هي.',
    importDo: 'استيراد', importing: 'جارٍ الاستيراد…',
    importDone: (n: number) => `تم استيراد ${n} صف.`,
    importNotExcel: 'يمكن استيراد ملفات Excel بصيغة xlsx فقط.',
    importUnreadable: 'تعذر قراءة الملف. افتحه في Excel واحفظه بصيغة xlsx وحاول مرة أخرى.',
    importNoHeader: 'مفيش عمود "الاسم" في الملف. أول صف في الشيت لازم يكون عناوين الأعمدة (الاسم، التاريخ، المدفوع، الاجمالي…).',
    importNoRows: 'الملف مفيهوش صفوف للاستيراد.',
    importFailed: 'فشل الاستيراد ولم يُضف أي صف. تأكد من الاتصال وحاول مرة أخرى.',
    setupTitle: 'طلبات المايوهات غير مفعّلة بعد',
    setupBody: 'شغّل الملف supabase/add_leotard_orders.sql في Supabase SQL Editor ثم حدّث الصفحة.',
  },
}

const STOCK = 'stock'
const EXTRA_MONTHS_KEY = 'lsw-extra-months'
const ACTIVE_TAB_KEY = 'lsw-active-tab'

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

/** A pill-shaped filter: a caption and a dropdown; it turns pink while a value is chosen */
function Filter({ label, all, value, options, isRtl, icon: Icon, onChange }: {
  label: string; all: string; value: string; options: Opt[]; isRtl: boolean; icon: LucideIcon
  onChange: (v: string) => void
}) {
  return (
    <label className={`lsw-filter${value ? ' on' : ''}`}>
      <Icon size={14} aria-hidden />
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map(o => <option key={o.v} value={o.v}>{isRtl ? o.ar : o.en}</option>)}
      </select>
    </label>
  )
}

/** Soft silk ribbon drawn behind the header (decorative) */
function Ribbon() {
  return (
    <svg className="lsw-ribbon" viewBox="0 0 440 150" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lsw-rb1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6c4d1" stopOpacity="0" />
          <stop offset=".45" stopColor="#f3b3c4" stopOpacity=".75" />
          <stop offset="1" stopColor="#fbd9e2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lsw-rb2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e8a3b6" stopOpacity="0" />
          <stop offset=".6" stopColor="#e8a3b6" stopOpacity=".5" />
          <stop offset="1" stopColor="#f4c9d5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 118C70 70 120 132 190 92S300 10 360 40s60 70 80 40" stroke="url(#lsw-rb1)" strokeWidth="26" strokeLinecap="round" />
      <path d="M20 132C90 96 140 140 210 104S310 34 370 58s50 58 70 30" stroke="url(#lsw-rb2)" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 96C100 60 150 112 214 76S318 6 380 26" stroke="url(#lsw-rb2)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Empty-sheet illustration: an open pink box with leaves and sparkles */
function EmptyBox() {
  return (
    <svg viewBox="0 0 220 150" aria-hidden>
      <ellipse cx="110" cy="138" rx="74" ry="8" fill="#d4667a" opacity=".1" />
      {/* leaves */}
      <g fill="#f2b8c6" opacity=".85">
        <path d="M40 132c-14-10-18-28-10-40 10 8 14 24 10 40z" />
        <path d="M44 134c-18-2-30-14-30-28 14 2 26 14 30 28z" />
        <path d="M180 132c14-10 18-28 10-40-10 8-14 24-10 40z" />
        <path d="M176 134c18-2 30-14 30-28-14 2-26 14-30 28z" />
      </g>
      {/* box body */}
      <path d="M62 72l48 18v46l-48-18z" fill="#f4a9bb" />
      <path d="M158 72l-48 18v46l48-18z" fill="#eb93a8" />
      {/* inside */}
      <path d="M62 72l48-16 48 16-48 18z" fill="#d97890" />
      {/* flaps */}
      <path d="M62 72l-18-22 48-14 18 20z" fill="#f8c3cf" />
      <path d="M158 72l18-22-48-14-18 20z" fill="#f6b6c6" />
      <path d="M62 72l48 18-14 20-50-20z" fill="#fbd3dc" />
      <path d="M158 72l-48 18 14 20 50-20z" fill="#f7c1ce" />
      {/* sparkles */}
      <g fill="#e58fa0">
        <path d="M110 6l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" />
        <path d="M150 22l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" />
        <path d="M66 26l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" />
        <circle cx="182" cy="48" r="2" /><circle cx="38" cy="54" r="2" />
      </g>
    </svg>
  )
}

export default function LeotardOrders({ orders, students, slots, currentMonth, setupNeeded, isRtl, stock }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const L = LABELS[isRtl ? 'ar' : 'en']

  const [rows, setRows] = useState<LeotardOrder[]>(() =>
    orders.map(o => ({ ...o, total_amount: Number(o.total_amount) || 0, paid_amount: Number(o.paid_amount) || 0 })))
  const [active, setActive] = useState(currentMonth)
  const [query, setQuery] = useState('')
  const [fPay, setFPay] = useState('')
  const [fSize, setFSize] = useState('')
  const [fTailor, setFTailor] = useState('')    // 'received' | 'pending'
  const [fDelivery, setFDelivery] = useState('') // 'delivered' | 'pending'
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [toImport, setToImport] = useState<ImportedOrder[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(EXTRA_MONTHS_KEY) || '[]')
      if (Array.isArray(saved)) setExtraMonths(saved.filter(x => /^\d{4}-\d{2}$/.test(String(x))))
    } catch { /* storage unavailable */ }
    // Reopen the tab that was open before a refresh
    try {
      const last = sessionStorage.getItem(ACTIVE_TAB_KEY)
      if (last && (last === STOCK || /^\d{4}-\d{2}$/.test(last))) setActive(last)
    } catch { /* storage unavailable */ }
  }, [])

  useEffect(() => {
    try { sessionStorage.setItem(ACTIVE_TAB_KEY, active) } catch { /* storage unavailable */ }
  }, [active])
  const dirty = useRef(new Set<string>())
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  // Month tabs: two months back to three ahead, plus any month that has rows
  const months = useMemo(() => {
    const set = new Set<string>()
    for (let d = -2; d <= 3; d++) set.add(addMonths(currentMonth, d))
    rows.forEach(r => { if (r.sheet_month) set.add(r.sheet_month) })
    extraMonths.forEach(m => set.add(m))
    if (active !== STOCK) set.add(active)
    return Array.from(set).sort()
  }, [rows, currentMonth, extraMonths, active])

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

  // Arrow buttons scroll the month tabs; dir -1 = towards the start (left in English, right in Arabic)
  function scrollTabs(dir: 1 | -1) {
    tabsRef.current?.scrollBy({ left: dir * (isRtl ? -1 : 1) * 260, behavior: 'smooth' })
  }

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
        (!fPay || payOf(r) === fPay) &&
        (!fSize || r.size === fSize) &&
        // "pending" also covers rows where the status was never chosen
        (!fTailor || (r.tailor_status === 'received') === (fTailor === 'received')) &&
        (!fDelivery || (r.delivery_status === 'delivered') === (fDelivery === 'delivered')))
  }, [sheetRows, query, fPay, fSize, fTailor, fDelivery])
  const filtering = !!query.trim() || !!fPay || !!fSize || !!fTailor || !!fDelivery
  const clearFilters = () => { setQuery(''); setFPay(''); setFSize(''); setFTailor(''); setFDelivery('') }

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
    clearFilters()
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

  // Enter saves the cell and moves down to the same column of the next row, like a spreadsheet
  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const el = e.currentTarget
    const next = el.closest('tr')?.nextElementSibling
      ?.querySelector<HTMLInputElement>(`input[aria-label="${el.getAttribute('aria-label')}"]`)
    if (next) { next.focus(); next.select() } else el.blur()
  }

  // Read an Excel file and ask before adding its rows to the open month sheet
  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // so the same file can be picked again
    if (!file) return
    setImportMsg(null)
    if (!/\.xlsx$/i.test(file.name)) { setImportMsg({ ok: false, text: L.importNotExcel }); return }
    let data: unknown[][]
    try {
      const { readSheet } = await import('read-excel-file/browser')
      data = await readSheet(file) as unknown[][]
    } catch {
      setImportMsg({ ok: false, text: L.importUnreadable }); return
    }
    const res = parseLeotardSheet(data, OPTIONS, [LABELS.en.footTotal, LABELS.ar.footTotal])
    if (!res.ok) { setImportMsg({ ok: false, text: res.reason === 'noHeader' ? L.importNoHeader : L.importNoRows }); return }
    setToImport(res.orders)
  }

  async function confirmImport() {
    if (!toImport || importing) return
    setImporting(true)
    const { data, error } = await supabase
      .from('leotard_orders')
      .insert(toImport.map(o => ({ ...o, sheet_month: active })))
      .select(LEOTARD_ORDER_COLUMNS)
    setImporting(false)
    setToImport(null)
    if (error || !data) { setImportMsg({ ok: false, text: L.importFailed }); return }
    const added = (data as unknown as LeotardOrder[])
      .map(r => ({ ...r, total_amount: Number(r.total_amount) || 0, paid_amount: Number(r.paid_amount) || 0 }))
    clearFilters()
    setRows(rs => [...rs, ...added])
    setImportMsg({ ok: true, text: L.importDone(added.length) })
  }

  // Number of orders on each month sheet, shown on its tab
  const monthCounts = useMemo(() => {
    const map: Record<string, number> = {}
    rows.forEach(r => { if (r.sheet_month) map[r.sheet_month] = (map[r.sheet_month] || 0) + 1 })
    return map
  }, [rows])

  const tabs = [{ id: STOCK, label: L.stockTab }, ...months.map(m => ({ id: m, label: monthLabel(m) }))]
  const activeLabel = tabs.find(t => t.id === active)?.label || ''

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: LEOTARD_CSS }} />

      {/* Top bar */}
      <div className="lsw-top">
        <Ribbon />
        <div className="lsw-brand">
          <div className="lsw-logo" aria-hidden>{isRtl ? 'م' : 'L'}</div>
          <div>
            <h1>{L.title}</h1>
            <div className="lsw-crumb">
              <Link href="/dashboard" aria-label={L.home} title={L.home}><House size={13} /></Link>
              <span>{activeLabel}</span>
            </div>
          </div>
        </div>
        {!setupNeeded && (pending > 0 || unsaved > 0 || savedOnce) && (
          <span role="status" className={`lsw-sync${pending ? '' : unsaved ? ' bad' : ' ok'}`}>
            {pending ? L.saving : unsaved ? `${L.notSaved} (${unsaved})` : `✓ ${L.saved}`}
          </span>
        )}
        {!isStock && !setupNeeded && (
          <div className="lsw-tools">
            <input ref={fileRef} type="file" hidden onChange={pickFile}
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
            <button className="lsw-btn ghost" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload size={14} aria-hidden />{importing ? L.importing : L.importXlsx}
            </button>
            <button className="lsw-btn" onClick={addRow} disabled={adding}>
              <Plus size={14} aria-hidden />{L.addRow}
            </button>
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
          {/* Search and filters */}
          <div className="lsw-filters">
            <label className="lsw-search">
              <Search size={14} aria-hidden />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={L.search} aria-label={L.search} />
            </label>
            <Filter icon={CreditCard} label={L.fPay} all={L.all} value={fPay} options={OPTIONS.payStatus} isRtl={isRtl} onChange={setFPay} />
            <Filter icon={Shirt} label={L.fSize} all={L.all} value={fSize} options={OPTIONS.size} isRtl={isRtl} onChange={setFSize} />
            <Filter icon={Scissors} label={L.fTailor} all={L.all} value={fTailor} options={OPTIONS.tailor} isRtl={isRtl} onChange={setFTailor} />
            <Filter icon={UsersRound} label={L.fDelivery} all={L.all} value={fDelivery} options={OPTIONS.delivery} isRtl={isRtl} onChange={setFDelivery} />
            {filtering && <button className="lsw-clear" onClick={clearFilters}>✕ {L.clear}</button>}
            {filtering && <span className="lsw-fcount">{L.showing(visible.length, sheetRows.length)}</span>}
          </div>

          {/* Summary */}
          <div className="lsw-stats">
            <div className="lsw-stat pink">
              <i className="ic"><ShoppingCart size={17} aria-hidden /></i>
              <span className="tx"><span>{L.statCount}</span><b>{visible.length}</b></span>
            </div>
            <div className="lsw-stat info">
              <i className="ic"><Wallet size={17} aria-hidden /></i>
              <span className="tx"><span>{L.statTotal}</span><b>{fmt(total)}</b></span>
            </div>
            <div className="lsw-stat ok">
              <i className="ic"><HandCoins size={17} aria-hidden /></i>
              <span className="tx"><span>{L.statPaid}</span><b>{fmt(paid)}</b></span>
            </div>
            <button type="button" title={L.filterHint} aria-pressed={fPay === 'remaining'}
              className={`lsw-stat click amber${rem > 0 ? '' : ' calm'}`}
              onClick={() => setFPay(fPay === 'remaining' ? '' : 'remaining')}>
              <i className="ic"><Clock size={17} aria-hidden /></i>
              <span className="tx"><span>{L.statRemaining}</span><b>{fmt(rem)}</b></span>
            </button>
            <button type="button" title={L.filterHint} aria-pressed={fDelivery === 'pending'}
              className="lsw-stat click lav calm"
              onClick={() => setFDelivery(fDelivery === 'pending' ? '' : 'pending')}>
              <i className="ic"><UserRound size={17} aria-hidden /></i>
              <span className="tx"><span>{L.statNotDelivered}</span><b>{notDelivered}</b></span>
            </button>
          </div>

          {unsaved > 0 && (
            <p className="lsw-err">
              <span>{L.saveFailed}</span>
              <button onClick={retry} disabled={pending > 0}>{L.retry}</button>
            </p>
          )}
          {failed && <p className="lsw-err">{L.actionFailed}</p>}
          {importMsg && (
            <p role="status" className={importMsg.ok ? 'lsw-ok' : 'lsw-err'}>
              <span>{importMsg.text}</span>
              <button className="x" onClick={() => setImportMsg(null)} aria-label={L.cancel}>✕</button>
            </p>
          )}

          {/* Sheet */}
          <div className="lsw-wrap">
            <table>
              <thead>
                <tr>
                  <th className="idx" aria-label={L.num}><span className="lsw-hash">{L.num}</span></th>
                  <th>{L.name}</th>
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
                        <input type="date" aria-label={L.date} className={r.order_date ? undefined : 'blank'} defaultValue={r.order_date || ''}
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
                          defaultValue={r.paid_amount || ''} placeholder="0" onKeyDown={onEnter}
                          onChange={e => typing(r.id, 'paid_amount', e.target.value)}
                          onBlur={e => commit(r.id, 'paid_amount', e.target.value)} />
                      </td>
                      <td className={`num${x > 0 ? ' due' : x === 0 ? ' zero' : ''}`}>{fmt(x)}</td>
                      <td className="num">
                        <input type="number" min="0" step="1" aria-label={L.total}
                          defaultValue={r.total_amount || ''} placeholder="0" onKeyDown={onEnter}
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
                        <button type="button" className="lsw-toggle" aria-pressed={r.cash}
                          style={{ '--bg': OPTIONS.cash[0].bg, '--fg': OPTIONS.cash[0].fg } as React.CSSProperties}
                          onClick={() => change(r.id, { cash: !r.cash })}>{L.cash}</button>
                      </td>
                      <td>
                        <button type="button" className="lsw-toggle" aria-pressed={r.instapay}
                          style={{ '--bg': OPTIONS.instapay[0].bg, '--fg': OPTIONS.instapay[0].fg } as React.CSSProperties}
                          onClick={() => change(r.id, { instapay: !r.instapay })}>{L.instapay}</button>
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
                        <button className="lsw-del" title={L.delRow} aria-label={L.delRow} onClick={() => setToDelete(r)}><Trash2 size={16} /></button>
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
                    <td></td><td></td><td></td>
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
              <div className="lsw-empty">
                <EmptyBox />
                <div>{sheetRows.length ? L.emptySearch : L.emptySheet}</div>
                {sheetRows.length
                  ? <button className="lsw-btn ghost" onClick={clearFilters}>{L.clear}</button>
                  : <button className="lsw-btn" onClick={addRow} disabled={adding}><Plus size={14} aria-hidden />{L.addRow}</button>}
              </div>
            )}
          </div>
          <datalist id="lsw-students">
            {students.map(s => <option key={s.id} value={s.name_ar} />)}
          </datalist>
        </>
      )}

      {/* Month tabs */}
      <div className="lsw-tabbar">
        <button type="button" className="lsw-tabnav" aria-label={L.prevTabs} title={L.prevTabs} onClick={() => scrollTabs(-1)}>
          {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <nav className="lsw-tabs" role="tablist" ref={tabsRef}>
          {tabs.map(t => {
            const on = t.id === active
            return (
              <button key={t.id} className="lsw-tab" role="tab" aria-selected={on}
                onClick={() => setActive(t.id)}>
                {on && t.id !== STOCK && <CalendarDays size={14} aria-hidden />}
                {t.label}
                {monthCounts[t.id] > 0 && <span className="lsw-tabn">{monthCounts[t.id]}</span>}
              </button>
            )
          })}
        </nav>
        <button type="button" className="lsw-tabnav" aria-label={L.nextTabs} title={L.nextTabs} onClick={() => scrollTabs(1)}>
          {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        {!setupNeeded && (
          <button className="lsw-addmonth" onClick={openMonthForm}><Plus size={14} aria-hidden />{L.addMonth}</button>
        )}
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

      {/* Import confirmation */}
      {toImport && (
        <div className="lsw-overlay" onClick={() => !importing && setToImport(null)}>
          <div className="lsw-modal" onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>{L.importTitle(toImport.length, activeLabel)}</p>
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--txt2)' }}>{L.importBody}</p>
            <div className="btns">
              <button onClick={confirmImport} disabled={importing}
                style={{ background: '#d4667a', color: '#fff', border: 'none' }}>{importing ? L.importing : L.importDo}</button>
              <button onClick={() => setToImport(null)} disabled={importing}
                style={{ background: 'transparent', color: 'var(--txt1)', border: '1px solid var(--border)' }}>{L.cancel}</button>
            </div>
          </div>
        </div>
      )}

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
