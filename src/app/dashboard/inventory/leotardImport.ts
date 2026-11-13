// Turns the rows of an Excel sheet into leotard orders.
// Columns are found by their header (Arabic or English), so their order does not matter.

export interface ImportOpt { v: string; ar: string; en: string }

export interface ImportOptions {
  branch: ImportOpt[]; day: ImportOpt[]; payStatus: ImportOpt[]; size: ImportOpt[]
  tailor: ImportOpt[]; delivery: ImportOpt[]
}

export interface ImportedOrder {
  customer_name: string
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
}

type Field = 'name' | 'branch' | 'date' | 'day' | 'group' | 'paid' | 'total' | 'payStatus'
  | 'cash' | 'instapay' | 'size' | 'tailor' | 'delivery'

/** Normalise Arabic and English text so spelling variants compare equal */
export function norm(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // harakat and tatweel
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[\s_\-:.]+/g, ' ')
    .trim()
}

const HEADERS: Record<Field, string[]> = {
  name: ['الاسم', 'اسم', 'اسم الطالبه', 'اسم العميل', 'name', 'customer', 'customer name', 'student'],
  branch: ['الفرع', 'فرع', 'branch'],
  date: ['التاريخ', 'تاريخ', 'date', 'order date'],
  day: ['اليوم', 'يوم', 'day'],
  group: ['الجروب', 'جروب', 'المجموعه', 'group', 'class'],
  paid: ['المدفوع', 'مدفوع', 'paid'],
  total: ['الاجمالي', 'اجمالي', 'السعر', 'total', 'price', 'amount'],
  payStatus: ['حاله الدفع', 'الدفع', 'payment status', 'pay status', 'payment'],
  cash: ['كاش', 'cash'],
  instapay: ['انستاباي', 'انستا باي', 'instapay'],
  size: ['المقاس', 'مقاس', 'size'],
  tailor: ['حاله الاستلام من الخياط', 'الاستلام من الخياط', 'من الخياط', 'الخياط', 'received from tailor', 'from tailor', 'tailor'],
  delivery: ['حاله التسليم للعميل', 'التسليم للعميل', 'للعميل', 'التسليم', 'delivered to customer', 'to customer', 'delivery'],
}
const HEADER_LOOKUP = new Map<string, Field>()
for (const [f, names] of Object.entries(HEADERS) as [Field, string[]][]) {
  for (const n of names) HEADER_LOOKUP.set(norm(n), f)
}

function matchOpt(opts: ImportOpt[], v: unknown): string | null {
  const s = norm(v)
  if (!s) return null
  return opts.find(o => norm(o.v) === s || norm(o.ar) === s || norm(o.en) === s)?.v ?? null
}

function num(v: unknown): number {
  if (typeof v === 'number') return Math.max(v, 0)
  const n = Number(String(v ?? '').replace(/[,\s]/g, '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
  return Number.isFinite(n) ? Math.max(n, 0) : 0
}

const NO = new Set(['', 'no', 'لا', 'false', '0', '✗', '✘', 'n'])
function flag(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  return !NO.has(norm(v))
}

const pad = (n: number) => String(n).padStart(2, '0')
function isoDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) { // Excel day number
    return isoDate(new Date(Math.round((v - 25569) * 86400000)))
  }
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return valid(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/) // day/month/year
  if (m) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1])
  return null
}
function valid(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${y}-${pad(mo)}-${pad(d)}` : null
}

const JS_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export type ImportResult =
  | { ok: true; orders: ImportedOrder[] }
  | { ok: false; reason: 'noHeader' | 'noRows' }

/** Reads the sheet's header row and converts every filled row below it */
export function parseLeotardSheet(data: unknown[][], opts: ImportOptions, totalLabels: string[]): ImportResult {
  // The header row is the first row (within the top 15) that has a name column
  let headerAt = -1
  let cols = new Map<Field, number>()
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const found = new Map<Field, number>()
    data[i].forEach((c, j) => {
      const f = HEADER_LOOKUP.get(norm(c))
      if (f && !found.has(f)) found.set(f, j)
    })
    if (found.has('name')) { headerAt = i; cols = found; break }
  }
  if (headerAt < 0) return { ok: false, reason: 'noHeader' }

  const skipNames = new Set(totalLabels.map(norm))
  const orders: ImportedOrder[] = []
  for (const row of data.slice(headerAt + 1)) {
    const get = (f: Field) => { const j = cols.get(f); return j === undefined ? null : row[j] }
    const name = String(get('name') ?? '').trim()
    const total = num(get('total'))
    const paid = num(get('paid'))
    if (!name && !total && !paid) continue
    if (skipNames.has(norm(name))) continue // a totals row at the bottom

    const date = isoDate(get('date'))
    const [y, m, d] = date ? date.split('-').map(Number) : []
    const day = date ? JS_DAYS[new Date(y, m - 1, d).getDay()] : matchOpt(opts.day, get('day'))
    const sizeRaw = String(get('size') ?? '').trim()
    const groupRaw = get('group')
    const hasAmounts = total > 0 || paid > 0

    orders.push({
      customer_name: name,
      branch: matchOpt(opts.branch, get('branch')),
      order_date: date,
      day_of_week: day,
      group_name: groupRaw == null || String(groupRaw).trim() === '' ? null : String(groupRaw).trim(),
      size: sizeRaw ? (matchOpt(opts.size, sizeRaw) ?? sizeRaw) : null,
      total_amount: total,
      paid_amount: paid,
      pay_status: hasAmounts ? (paid >= total ? 'paid' : 'remaining') : matchOpt(opts.payStatus, get('payStatus')),
      cash: flag(get('cash')),
      instapay: flag(get('instapay')),
      tailor_status: matchOpt(opts.tailor, get('tailor')),
      delivery_status: matchOpt(opts.delivery, get('delivery')),
    })
  }
  return orders.length ? { ok: true, orders } : { ok: false, reason: 'noRows' }
}
