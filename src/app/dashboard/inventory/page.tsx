import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const { data: orders } = await supabase
    .from('product_orders')
    .select('*, student:students(name_ar), product:products(name)')
    .neq('status', 'delivered')
    .order('order_date', { ascending: false })

  const ready = products?.filter(p => p.type === 'ready_stock') || []
  const madeToOrder = products?.filter(p => p.type === 'made_to_order') || []
  const lowStock = ready.filter(p => p.stock_qty <= 2)

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">المخزون</h1>
          <p className="text-white/40 text-sm mt-1">إدارة المايوهات والطلبات المخصصة</p>
        </div>
        <Link
          href="/dashboard/inventory/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          إضافة منتج
        </Link>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-amber-400 font-medium text-sm">مخزون منخفض</p>
            <p className="text-amber-400/60 text-xs mt-0.5">
              {lowStock.map(p => `${p.name} (${p.stock_qty} قطعة)`).join(' • ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Ready Stock */}
        <div>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Package size={18} className="text-emerald-400" />
            المخزون الجاهز
          </h2>
          <div className="space-y-3">
            {ready.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{p.name}</p>
                  <p className="text-white/40 text-sm">مقاس: {p.size || '—'} • تكلفة: {formatCurrency(p.cost_price)}</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${p.stock_qty <= 2 ? 'text-amber-400' : 'text-white'}`}>
                    {p.stock_qty}
                  </p>
                  <p className="text-white/30 text-xs">قطعة</p>
                </div>
                <div className="text-center">
                  <p className="text-emerald-400 font-semibold">{formatCurrency(p.selling_price)}</p>
                  <Link href={`/dashboard/inventory/sell/${p.id}`} className="text-rose-400 text-xs hover:text-rose-300 mt-1 block">
                    بيع
                  </Link>
                </div>
              </div>
            ))}
            {ready.length === 0 && <p className="text-white/20 text-sm text-center py-8">لا توجد منتجات جاهزة</p>}
          </div>
        </div>

        {/* Active Orders */}
        <div>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-violet-400" />
            طلبات حسب الطلب
          </h2>
          <div className="space-y-3">
            {orders?.map((order: any) => (
              <div key={order.id} className="bg-white/5 border border-white/8 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{order.student?.name_ar}</p>
                    <p className="text-white/40 text-sm">{order.product?.name} • مقاس: {order.size}</p>
                  </div>
                  <select
                    defaultValue={order.status}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/60 text-xs focus:outline-none"
                    onChange={async (e) => {
                      const { createClient: cc } = await import('@/lib/supabase/client')
                      await cc().from('product_orders').update({ status: e.target.value }).eq('id', order.id)
                    }}
                  >
                    <option value="pending" className="bg-[#1a1a2e]">قيد الانتظار</option>
                    <option value="in_production" className="bg-[#1a1a2e]">في الإنتاج</option>
                    <option value="done" className="bg-[#1a1a2e]">جاهز</option>
                    <option value="delivered" className="bg-[#1a1a2e]">تم التسليم</option>
                  </select>
                </div>
              </div>
            ))}
            {(!orders || orders.length === 0) && (
              <p className="text-white/20 text-sm text-center py-8">لا توجد طلبات نشطة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
