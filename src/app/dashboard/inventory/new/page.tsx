'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'

const LABELS = {
  en: {
    back: 'Back', title: 'New Product', sub: 'Add a product to inventory',
    name: 'Product Name', namePlaceholder: 'e.g. Ballet Leotard',
    type: 'Product Type',
    readyStock: 'Ready Stock', madeToOrder: 'Made to Order',
    size: 'Size', sizeDefault: 'Select size…',
    costPrice: 'Cost Price (EGP)', sellingPrice: 'Selling Price (EGP)',
    stockQty: 'Initial Stock Qty',
    save: 'Save Product', saving: 'Saving…', cancel: 'Cancel',
    nameRequired: 'Product name is required',
    sizeRequired: 'Size is required',
    costRequired: 'Cost price is required',
    sellingRequired: 'Selling price is required',
    stockRequired: 'Stock quantity is required',
  },
  ar: {
    back: 'رجوع', title: 'منتج جديد', sub: 'إضافة منتج إلى المخزون',
    name: 'اسم المنتج', namePlaceholder: 'مثال: مايوه باليه',
    type: 'نوع المنتج',
    readyStock: 'مخزون جاهز', madeToOrder: 'حسب الطلب',
    size: 'المقاس', sizeDefault: 'اختر المقاس…',
    costPrice: 'سعر التكلفة (جنيه)', sellingPrice: 'سعر البيع (جنيه)',
    stockQty: 'الكمية الأولية',
    save: 'حفظ المنتج', saving: 'جارٍ الحفظ…', cancel: 'إلغاء',
    nameRequired: 'اسم المنتج مطلوب',
    sizeRequired: 'المقاس مطلوب',
    costRequired: 'سعر التكلفة مطلوب',
    sellingRequired: 'سعر البيع مطلوب',
    stockRequired: 'الكمية مطلوبة',
  },
}

export default function NewProductPage() {
  const router   = useRouter()
  const locale   = useLocale()
  const isRtl    = locale === 'ar'
  const L        = LABELS[isRtl ? 'ar' : 'en']
  const supabase = createClient()

  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    name: '', type: 'ready_stock', size: '',
    cost_price: '', selling_price: '', stock_qty: '0',
  })

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    if (submitted) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.name.trim())         errs.name         = L.nameRequired
    if (!form.size)                errs.size         = L.sizeRequired
    if (!form.cost_price.trim())   errs.cost_price   = L.costRequired
    if (!form.selling_price.trim()) errs.selling_price = L.sellingRequired
    if (form.type === 'ready_stock' && !form.stock_qty.trim()) errs.stock_qty = L.stockRequired
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    await supabase.from('products').insert({
      name:          form.name.trim(),
      type:          form.type,
      size:          form.size || null,
      cost_price:    parseFloat(form.cost_price)    || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      stock_qty:     form.type === 'ready_stock' ? (parseInt(form.stock_qty) || 0) : 0,
    })
    router.push('/dashboard/inventory')
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6,
  }
  const field = (hasErr = false): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${hasErr ? '#e04040' : 'var(--border)'}`,
    background: 'var(--bg-page)', color: 'var(--txt1)',
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    direction: isRtl ? 'rtl' : 'ltr', boxSizing: 'border-box',
  })
  const req: React.CSSProperties    = { color: '#e04040', marginInlineStart: 3 }
  const errTxt: React.CSSProperties = { margin: '4px 0 0', color: '#e04040', fontSize: 11 }

  const TYPES = [
    { value: 'ready_stock',   label: L.readyStock,   color: '#3dab7e' },
    { value: 'made_to_order', label: L.madeToOrder,  color: '#8e5fd9' },
  ]

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 28px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => router.back()} style={{
          background: '#d4667a', border: 'none', borderRadius: 8,
          padding: '7px 16px', color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {L.back}
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div>
          <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{L.sub}</p>
          <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 14, fontWeight: 700 }}>{L.title}</p>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: 28, maxWidth: 620 }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
          }}>

            {/* Product Name */}
            <div>
              <label style={lbl}>{L.name}<span style={req}>*</span></label>
              <input
                value={form.name}
                placeholder={L.namePlaceholder}
                onChange={e => setField('name', e.target.value)}
                style={field(!!errors.name)}
              />
              {errors.name && <p style={errTxt}>{errors.name}</p>}
            </div>

            {/* Product Type */}
            <div>
              <label style={lbl}>{L.type}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPES.map(t => {
                  const active = form.type === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setField('type', t.value)}
                      style={{
                        flex: 1, padding: '8px 16px', borderRadius: 8,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                        background: active ? t.color + '18' : 'transparent',
                        border: `1px solid ${active ? t.color : 'var(--border)'}`,
                        color: active ? t.color : 'var(--txt2)',
                      }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Size */}
            <div>
              <label style={lbl}>{L.size}<span style={req}>*</span></label>
              <select
                value={form.size}
                onChange={e => setField('size', e.target.value)}
                style={field(!!errors.size)}
              >
                <option value="">{L.sizeDefault}</option>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.size && <p style={errTxt}>{errors.size}</p>}
            </div>

            {/* Cost + Selling Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>{L.costPrice}<span style={req}>*</span></label>
                <input
                  type="number" min="0"
                  value={form.cost_price} placeholder="0"
                  onChange={e => setField('cost_price', e.target.value)}
                  style={{ ...field(!!errors.cost_price), direction: 'ltr' }}
                />
                {errors.cost_price && <p style={errTxt}>{errors.cost_price}</p>}
              </div>
              <div>
                <label style={lbl}>{L.sellingPrice}<span style={req}>*</span></label>
                <input
                  type="number" min="0"
                  value={form.selling_price} placeholder="0"
                  onChange={e => setField('selling_price', e.target.value)}
                  style={{ ...field(!!errors.selling_price), direction: 'ltr' }}
                />
                {errors.selling_price && <p style={errTxt}>{errors.selling_price}</p>}
              </div>
            </div>

            {/* Initial Stock (ready_stock only) */}
            {form.type === 'ready_stock' && (
              <div>
                <label style={lbl}>{L.stockQty}<span style={req}>*</span></label>
                <input
                  type="number" min="0"
                  value={form.stock_qty}
                  onChange={e => setField('stock_qty', e.target.value)}
                  style={{ ...field(!!errors.stock_qty), direction: 'ltr' }}
                />
                {errors.stock_qty && <p style={errTxt}>{errors.stock_qty}</p>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={loading} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: '#d4667a', border: 'none', borderRadius: 10,
              padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, fontFamily: 'inherit',
            }}>
              <Save size={14} />
              {loading ? L.saving : L.save}
            </button>
            <button type="button" onClick={() => router.back()} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 24px', color: 'var(--txt2)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {L.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
