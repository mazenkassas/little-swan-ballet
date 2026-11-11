'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Package, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface StockProduct {
  id: string
  name: string
  size: string | null
  type: string
  stock_qty: number
  selling_price: number
}

interface Props {
  products: StockProduct[]
  isRtl: boolean
  title: string
  subtitle: string
  addLabel: string
}

const LOW = 2 // a ready product with this many pieces or fewer is low on stock

const LABELS = {
  ar: {
    readyStock: 'المخزون الجاهز', mtoProducts: 'منتجات حسب الطلب', mtoBadge: 'حسب الطلب',
    noReady: 'لا توجد منتجات جاهزة', noMto: 'لا توجد منتجات حسب الطلب', noMatch: 'لا توجد نتائج مطابقة',
    size: 'مقاس', price: 'سعر البيع', pieces: 'قطعة', sell: 'بيع',
    search: 'بحث باسم المنتج…', allSizes: 'كل المقاسات', lowOnly: 'المخزون المنخفض فقط',
    lowTitle: 'تنبيه: مخزون منخفض',
    lowHint: (n: number) => n === 1 ? 'منتج واحد يحتاج إلى إعادة تخزين' : n === 2 ? 'منتجان يحتاجان إلى إعادة تخزين' : `${n} منتجات تحتاج إلى إعادة تخزين`,
    left: (n: number) => n <= 0 ? 'نفذ من المخزون' : n === 1 ? 'باقي قطعة واحدة' : n === 2 ? 'باقي قطعتان' : `باقي ${n} قطع`,
  },
  en: {
    readyStock: 'Ready Stock', mtoProducts: 'Made to Order Products', mtoBadge: 'Made to order',
    noReady: 'No ready stock products', noMto: 'No made-to-order products', noMatch: 'No matching products',
    size: 'Size', price: 'Selling price', pieces: 'pcs', sell: 'Sell',
    search: 'Search by product name…', allSizes: 'All sizes', lowOnly: 'Low stock only',
    lowTitle: 'Low stock alert',
    lowHint: (n: number) => n === 1 ? '1 product needs restocking' : `${n} products need restocking`,
    left: (n: number) => n <= 0 ? 'Out of stock' : n === 1 ? '1 piece left' : `${n} pieces left`,
  },
}

const CSS = `
.lst-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px}
.lst-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:20px}
.lst-tools input[type=search],.lst-tools select{height:38px;border:1px solid var(--border);border-radius:8px;padding:0 12px;font:inherit;font-size:13px;background:var(--bg-page);color:var(--txt1)}
.lst-tools input[type=search]{width:240px}
.lst-low{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--txt1);cursor:pointer;user-select:none}
.lst-low input{accent-color:#e8960a}
.lst-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:20px}
.lst-list{display:flex;flex-direction:column;gap:8px}
.lst-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.lst-card.low{border-color:#e8960a55}
.lst-card.out{border-color:#e0404055}
.lst-count{color:var(--txt2);font-size:12px;font-weight:600}
.lst-none{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:32px 0;text-align:center;color:var(--txt2);font-size:13px}
@media (max-width:640px){
.lst-tools input[type=search]{width:100%}
.lst-tools select,.lst-low{flex:1;min-width:0}
.lst-card{padding:12px}
}
`

// Numeric sizes first in numeric order, then lettered sizes in their usual order
const LETTER_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
function sizeRank(s: string) {
  const n = Number(s)
  if (!Number.isNaN(n)) return n
  const i = LETTER_ORDER.indexOf(s.toUpperCase())
  return 1000 + (i === -1 ? LETTER_ORDER.length : i)
}

function SectionTitle({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${color}18`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Package size={15} color={color} />
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{label}</p>
      <span className="lst-count">{count}</span>
    </div>
  )
}

export default function StockPanel({ products, isRtl, title, subtitle, addLabel }: Props) {
  const L = LABELS[isRtl ? 'ar' : 'en']
  const [query, setQuery] = useState('')
  const [size, setSize] = useState('')
  const [lowOnly, setLowOnly] = useState(false)

  const sizes = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => { if (p.size) set.add(p.size) })
    return Array.from(set).sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b))
  }, [products])

  const allReady = useMemo(() => products.filter(p => p.type === 'ready_stock'), [products])
  const lowStock = useMemo(
    () => allReady.filter(p => p.stock_qty <= LOW).sort((a, b) => a.stock_qty - b.stock_qty),
    [allReady])

  const { ready, madeToOrder } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (p: StockProduct) =>
      (!q || p.name.toLowerCase().includes(q)) && (!size || p.size === size)
    const isLow = (p: StockProduct) => p.stock_qty <= LOW
    return {
      // Low-stock products first (emptiest at the top), then the rest by name
      ready: allReady
        .filter(p => match(p) && (!lowOnly || isLow(p)))
        .sort((a, b) =>
          Number(isLow(b)) - Number(isLow(a)) ||
          (isLow(a) ? a.stock_qty - b.stock_qty : 0) ||
          a.name.localeCompare(b.name)),
      madeToOrder: lowOnly ? [] : products.filter(p => p.type === 'made_to_order' && match(p)),
    }
  }, [products, allReady, query, size, lowOnly])

  const filtering = !!query.trim() || !!size || lowOnly

  const details = (p: StockProduct) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{p.name}</p>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
        {L.size}: {p.size || '—'} · {L.price}:{' '}
        <span style={{ color: '#3dab7e', fontWeight: 700 }}>{formatCurrency(p.selling_price)}</span>
      </p>
    </div>
  )

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Header */}
      <div className="lst-head">
        <div>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{subtitle}</p>
          <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h1>
        </div>
        <Link
          href="/dashboard/inventory/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#d4667a', color: '#fff',
            padding: '8px 16px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          <Plus size={15} />
          {addLabel}
        </Link>
      </div>

      {/* Low stock alert (always shows every low product, whatever the filters are) */}
      {lowStock.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: '#e8960a12', border: '1px solid #e8960a30',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        }}>
          <AlertTriangle size={16} color="#e8960a" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#e8960a', fontWeight: 700, fontSize: 13, margin: 0 }}>{L.lowTitle}</p>
            <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '2px 0 10px' }}>{L.lowHint(lowStock.length)}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lowStock.map(p => {
                const c = p.stock_qty <= 0 ? '#e04040' : '#e8960a'
                return (
                  <span key={p.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    background: 'var(--bg-card)', border: `1px solid ${c}40`,
                    borderRadius: 999, padding: '4px 6px', paddingInlineStart: 12, fontSize: 12,
                  }}>
                    <bdi style={{ color: 'var(--txt1)', fontWeight: 600 }}>{p.name}</bdi>
                    {p.size && <span style={{ color: 'var(--txt2)', fontSize: 11 }}>{L.size}: {p.size}</span>}
                    <span style={{
                      background: `${c}1f`, color: c, fontWeight: 700, fontSize: 11,
                      borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap',
                    }}>{L.left(p.stock_qty)}</span>
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search and filters */}
      {products.length > 0 && (
        <div className="lst-tools">
          <input type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={L.search} aria-label={L.search} />
          {sizes.length > 0 && (
            <select value={size} onChange={e => setSize(e.target.value)} aria-label={L.allSizes}>
              <option value="">{L.allSizes}</option>
              {sizes.map(s => <option key={s} value={s}>{L.size}: {s}</option>)}
            </select>
          )}
          {lowStock.length > 0 && (
            <label className="lst-low">
              <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
              {L.lowOnly}
            </label>
          )}
        </div>
      )}

      <div className="lst-grid">

        {/* Ready stock */}
        <div>
          <SectionTitle color="#3dab7e" label={L.readyStock} count={ready.length} />
          <div className="lst-list">
            {ready.map(p => {
              const out = p.stock_qty <= 0
              const low = p.stock_qty <= LOW
              return (
                <div key={p.id} className={`lst-card${out ? ' out' : low ? ' low' : ''}`}>
                  {details(p)}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 22, fontWeight: 800,
                      color: out ? '#e04040' : low ? '#e8960a' : 'var(--txt1)',
                    }}>{p.stock_qty}</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--txt2)' }}>{L.pieces}</p>
                  </div>
                  <Link href={`/dashboard/inventory/sell/${p.id}`} style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 600,
                    color: '#d4667a', textDecoration: 'none',
                    border: '1px solid #d4667a40', background: '#d4667a12',
                    borderRadius: 8, padding: '5px 12px',
                  }}>
                    {L.sell}
                  </Link>
                </div>
              )
            })}
            {ready.length === 0 && <div className="lst-none">{filtering ? L.noMatch : L.noReady}</div>}
          </div>
        </div>

        {/* Made to order */}
        {!lowOnly && (
          <div>
            <SectionTitle color="#8e5fd9" label={L.mtoProducts} count={madeToOrder.length} />
            <div className="lst-list">
              {madeToOrder.map(p => (
                <div key={p.id} className="lst-card">
                  {details(p)}
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#8e5fd9',
                    background: '#8e5fd918', border: '1px solid #8e5fd928',
                    borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
                  }}>{L.mtoBadge}</span>
                </div>
              ))}
              {madeToOrder.length === 0 && <div className="lst-none">{filtering ? L.noMatch : L.noMto}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
