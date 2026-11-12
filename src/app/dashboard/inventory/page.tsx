import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import LeotardOrders, { type LeotardOrder, type ClassSlot } from './LeotardOrders'
import StockPanel, { type StockProduct } from './StockPanel'
import { LEOTARD_ORDER_COLUMNS } from './leotardColumns'

export default async function InventoryPage() {
  const locale  = await getLocale()
  const isRtl   = locale === 'ar'
  const t       = await getTranslations('inventory')
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products').select('*').eq('is_active', true).order('name')

  // Selecting the columns by name makes this fail (and show the setup notice)
  // until supabase/add_leotard_orders.sql has been run.
  const [ordersRes, studentsRes, classesRes] = await Promise.all([
    supabase.from('leotard_orders').select(LEOTARD_ORDER_COLUMNS).order('created_at').limit(5000),
    supabase.from('students').select('id, name_ar').order('name_ar'),
    supabase.from('classes').select('days_of_week, start_time, end_time').eq('is_active', true).order('start_time'),
  ])
  const leotardOrders = (ordersRes.data || []) as unknown as LeotardOrder[]
  const setupNeeded   = !!ordersRes.error

  // Active class time slots per weekday, written the way the sheet does: "12 - 2", "5.30 - 7.30"
  const hour = (time: string) => {
    const [h, m] = String(time).split(':').map(Number)
    const h12 = h % 12 || 12
    return m ? `${h12}.${String(m).padStart(2, '0')}` : `${h12}`
  }
  const slots: ClassSlot[] = []
  for (const c of classesRes.data || []) {
    if (!c.start_time || !c.end_time) continue
    const label = `${hour(c.start_time)} - ${hour(c.end_time)}`
    for (const d of (Array.isArray(c.days_of_week) ? c.days_of_week : [])) {
      slots.push({ day: String(d).trim().toLowerCase().slice(0, 3), label })
    }
  }

  // Current month in the academy's timezone (YYYY-MM)
  const currentMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).slice(0, 7)

  // Only the fields the stock tab shows are sent to the browser
  const stockProducts: StockProduct[] = (products || []).map(p => ({
    id: p.id,
    name: p.name,
    size: p.size ?? null,
    type: p.type,
    stock_qty: Number(p.stock_qty) || 0,
    selling_price: Number(p.selling_price) || 0,
  }))

  return (
    <div className={`lsw-page${isRtl ? ' rtl' : ''}`} style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Monthly leotard sheets; the stock tab shows everything passed as `stock` */}
      <LeotardOrders
        orders={leotardOrders}
        students={studentsRes.data || []}
        slots={slots}
        currentMonth={currentMonth}
        setupNeeded={setupNeeded}
        isRtl={isRtl}
        stock={
          <StockPanel
            products={stockProducts}
            isRtl={isRtl}
            title={t('title')}
            subtitle={t('subtitle')}
            addLabel={t('add')}
          />
        }
      />
    </div>
  )
}
