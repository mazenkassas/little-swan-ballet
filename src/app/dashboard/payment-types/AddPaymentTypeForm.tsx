'use client'

import { useState } from 'react'
import { addPaymentMethod } from './actions'

const COLORS = [
  '#3dab7e', '#4a90d9', '#d4667a', '#e8960a',
  '#7c5cdb', '#e04040', '#888888', '#2c3e50',
]
const ICONS = ['💵', '💳', '📱', '🏦', '💰', '💎', '🔑', '✅', '🧾', '🪙']

export default function AddPaymentTypeForm({ isRtl }: { isRtl: boolean }) {
  const [name,    setName]    = useState('')
  const [nameAr,  setNameAr]  = useState('')
  const [slug,    setSlug]    = useState('')
  const [color,   setColor]   = useState(COLORS[0])
  const [icon,    setIcon]    = useState(ICONS[0])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  function autoSlug(val: string) {
    return val.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  }

  function handleNameChange(val: string) {
    setName(val)
    if (!slug || slug === autoSlug(name)) setSlug(autoSlug(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !nameAr.trim()) { setError(isRtl ? 'الاسمان مطلوبان' : 'Both name fields are required'); return }
    setSaving(true)
    const res = await addPaymentMethod({ name, name_ar: nameAr, slug: slug || autoSlug(name), color, icon })
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setName(''); setNameAr(''); setSlug(''); setColor(COLORS[0]); setIcon(ICONS[0])
  }

  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginBottom: 5, letterSpacing: '0.03em' }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--txt1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#d4667a18', border: '1px solid #d4667a28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
          ➕
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>
          {isRtl ? 'إضافة نوع دفع' : 'Add Payment Type'}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-page)', border: `2px solid ${color}40` }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '20', border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {icon}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>{name || (isRtl ? 'الاسم' : 'Name')}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)' }}>{nameAr || (isRtl ? 'الاسم بالعربي' : 'Arabic name')}</p>
          </div>
          <div style={{ marginInlineStart: 'auto' }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: color + '18', color, border: `1px solid ${color}30` }}>
              {slug || autoSlug(name) || 'key'}
            </span>
          </div>
        </div>

        {/* Names */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>{isRtl ? 'الاسم (إنجليزي)' : 'Name (English)'} <span style={{ color: '#e04040' }}>*</span></label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Cash" style={inp} />
          </div>
          <div>
            <label style={lbl}>{isRtl ? 'الاسم (عربي)' : 'Name (Arabic)'} <span style={{ color: '#e04040' }}>*</span></label>
            <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: كاش" style={{ ...inp, direction: 'rtl' }} />
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label style={lbl}>{isRtl ? 'الأيقونة' : 'Icon'}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ICONS.map(ic => (
              <button
                key={ic} type="button" onClick={() => setIcon(ic)}
                style={{
                  width: 36, height: 36, borderRadius: 8, fontSize: 18,
                  border: `2px solid ${icon === ic ? color : 'var(--border)'}`,
                  background: icon === ic ? color + '18' : 'var(--bg-page)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{ic}</button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label style={lbl}>{isRtl ? 'اللون' : 'Color'}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button
                key={c} type="button" onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: `3px solid ${color === c ? 'var(--txt1)' : 'transparent'}`,
                  cursor: 'pointer', outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        {error && <p style={{ margin: 0, fontSize: 12, color: '#e04040', fontWeight: 600 }}>⚠ {error}</p>}

        <button
          type="submit" disabled={saving || !name.trim() || !nameAr.trim()}
          style={{
            background: saving || !name.trim() || !nameAr.trim() ? 'var(--border)' : '#d4667a',
            color: saving || !name.trim() || !nameAr.trim() ? 'var(--txt2)' : '#fff',
            border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700,
            cursor: saving || !name.trim() || !nameAr.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          {saving ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'إضافة نوع الدفع' : 'Add Payment Type')}
        </button>
      </form>
    </div>
  )
}
