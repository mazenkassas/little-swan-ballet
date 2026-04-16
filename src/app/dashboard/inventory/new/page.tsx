'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Save } from 'lucide-react'

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'ready_stock', size: '',
    cost_price: '', selling_price: '', stock_qty: '0',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('products').insert({
      name: form.name, type: form.type, size: form.size || null,
      cost_price: parseFloat(form.cost_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      stock_qty: parseInt(form.stock_qty) || 0,
    })
    router.push('/dashboard/inventory')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"

  return (
    <div className="p-8 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/inventory" className="text-white/30 hover:text-white/60"><ArrowRight size={20} /></Link>
        <h1 className="text-2xl font-bold text-white">إضافة منتج جديد</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">اسم المنتج *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مايوه باليه" className={inputClass} />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">النوع</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: 'ready_stock', l: '📦 مخزون جاهز' }, { v: 'made_to_order', l: '✂️ حسب الطلب' }].map(t => (
                <button key={t.v} type="button" onClick={() => setForm(f => ({ ...f, type: t.v }))}
                  className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                    form.type === t.v ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-white/3 border-white/10 text-white/40'
                  }`}>{t.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">المقاس</label>
            <input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="XS / S / M / L / XL" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">سعر التكلفة (جنيه)</label>
              <input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">سعر البيع (جنيه)</label>
              <input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} placeholder="0" className={inputClass} />
            </div>
          </div>
          {form.type === 'ready_stock' && (
            <div>
              <label className="block text-white/60 text-sm mb-2">الكمية الأولية</label>
              <input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} min="0" className={inputClass} />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50">
            <Save size={16} />
            {loading ? 'جارٍ...' : 'حفظ المنتج'}
          </button>
          <Link href="/dashboard/inventory" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-xl transition-all">إلغاء</Link>
        </div>
      </form>
    </div>
  )
}
