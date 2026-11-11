import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function InventoryPage() {
  const locale  = await getLocale()
  const isRtl   = locale === 'ar'
  const t       = await getTranslations('inventory')
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products').select('*').eq('is_active', true).order('name')

  const { data: orders } = await supabase
    .from('product_orders')
    .select('*, student:students(name_ar), product:products(name)')
    .neq('status', 'delivered')
    .order('order_date', { ascending: false })

  const ready      = products?.filter(p => p.type === 'ready_stock')    || []
  const madeToOrder = products?.filter(p => p.type === 'made_to_order') || []
  const lowStock   = ready.filter(p => p.stock_qty <= 2)

  const L = isRtl ? {
    readyStock:   'المخزون الجاهز',
    activeOrders: 'الطلبات النشطة',
    mtoProducts:  'منتجات حسب الطلب',
    mtoBadge:     'حسب الطلب',
    noMto:        'لا توجد منتجات حسب الطلب',
    size:         'مقاس',
    price:        'سعر البيع',
    lowTitle:     'تنبيه: مخزون منخفض',
    lowHint:      (n: number) => n === 1 ? 'منتج واحد يحتاج إلى إعادة تخزين' : n === 2 ? 'منتجان يحتاجان إلى إعادة تخزين' : `${n} منتجات تحتاج إلى إعادة تخزين`,
    left:         (n: number) => n <= 0 ? 'نفذ من المخزون' : n === 1 ? 'باقي قطعة واحدة' : n === 2 ? 'باقي قطعتان' : `باقي ${n} قطع`,
    pieces:       'قطعة',
    sell:         'بيع',
    noReady:      'لا توجد منتجات جاهزة',
    noOrders:     'لا توجد طلبات نشطة',
    pending:      'قيد الانتظار',
    inProd:       'في الإنتاج',
    done:         'جاهز',
    delivered:    'تم التسليم',
  } : {
    readyStock:   'Ready Stock',
    activeOrders: 'Active Orders',
    mtoProducts:  'Made to Order Products',
    mtoBadge:     'Made to order',
    noMto:        'No made-to-order products',
    size:         'Size',
    price:        'Selling price',
    lowTitle:     'Low stock alert',
    lowHint:      (n: number) => n === 1 ? '1 product needs restocking' : `${n} products need restocking`,
    left:         (n: number) => n <= 0 ? 'Out of stock' : n === 1 ? '1 piece left' : `${n} pieces left`,
    pieces:       'pcs',
    sell:         'Sell',
    noReady:      'No ready stock products',
    noOrders:     'No active orders',
    pending:      'Pending',
    inProd:       'In Production',
    done:         'Ready',
    delivered:    'Delivered',
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>{t('subtitle')}</p>
          <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>{t('title')}</h1>
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
          {t('add')}
        </Link>
      </div>

      {/* Low stock alert */}
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
                const out = p.stock_qty <= 0
                const c   = out ? '#e04040' : '#e8960a'
                return (
                  <span key={p.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
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

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Ready Stock */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#3dab7e18', border: '1px solid #3dab7e28',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Package size={15} color="#3dab7e" />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{L.readyStock}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ready.map(p => (
              <div key={p.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{p.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
                    {L.size}: {p.size || '—'} · {L.price}: <span style={{ color: '#3dab7e', fontWeight: 700 }}>{formatCurrency(p.selling_price)}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 22, fontWeight: 800,
                    color: p.stock_qty <= 2 ? '#e8960a' : 'var(--txt1)',
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
            ))}
            {ready.length === 0 && (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '40px 0', textAlign: 'center',
                color: 'var(--txt2)', fontSize: 13,
              }}>
                {L.noReady}
              </div>
            )}
          </div>
        </div>

        {/* Made to Order products + Active Orders */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#8e5fd918', border: '1px solid #8e5fd928',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Package size={15} color="#8e5fd9" />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{L.mtoProducts}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {madeToOrder.map(p => (
              <div key={p.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{p.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
                    {L.size}: {p.size || '—'} · {L.price}: <span style={{ color: '#3dab7e', fontWeight: 700 }}>{formatCurrency(p.selling_price)}</span>
                  </p>
                </div>
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#8e5fd9',
                  background: '#8e5fd918', border: '1px solid #8e5fd928',
                  borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
                }}>{L.mtoBadge}</span>
              </div>
            ))}
            {madeToOrder.length === 0 && (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '24px 0', textAlign: 'center',
                color: 'var(--txt2)', fontSize: 13,
              }}>
                {L.noMto}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#8e5fd918', border: '1px solid #8e5fd928',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingBag size={15} color="#8e5fd9" />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{L.activeOrders}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders?.map((order: any) => (
              <div key={order.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>{order.student?.name_ar}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
                    {order.product?.name} · {L.size}: {order.size}
                  </p>
                </div>
                <select
                  defaultValue={order.status}
                  style={{
                    background: 'var(--bg-page)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600,
                    color: 'var(--txt2)', outline: 'none', fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  <option value="pending">{L.pending}</option>
                  <option value="in_production">{L.inProd}</option>
                  <option value="done">{L.done}</option>
                  <option value="delivered">{L.delivered}</option>
                </select>
              </div>
            ))}
            {(!orders || orders.length === 0) && (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '40px 0', textAlign: 'center',
                color: 'var(--txt2)', fontSize: 13,
              }}>
                {L.noOrders}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
