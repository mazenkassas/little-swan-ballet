'use client'

import { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { updatePaymentMethod, deletePaymentMethod, togglePaymentMethod } from './actions'

const COLORS = [
  '#3dab7e', '#4a90d9', '#d4667a', '#e8960a',
  '#7c5cdb', '#e04040', '#888888', '#2c3e50',
]
const ICONS = ['💵', '💳', '📱', '🏦', '💰', '💎', '🔑', '✅', '🧾', '🪙']

type Method = {
  id: string; name: string; name_ar: string; slug: string
  color: string; icon: string; is_active: boolean; usage: number
}

export default function PaymentTypeCard({ method, isRtl }: { method: Method; isRtl: boolean }) {
  const [editing,     setEditing]     = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [toggling,    setToggling]    = useState(false)
  const [error,       setError]       = useState('')

  const [eName,    setEName]    = useState(method.name)
  const [eNameAr,  setENameAr]  = useState(method.name_ar)
  const [eColor,   setEColor]   = useState(method.color)
  const [eIcon,    setEIcon]    = useState(method.icon)
  const [eActive,  setEActive]  = useState(method.is_active)

  async function handleSave() {
    setError('')
    if (!eName.trim() || !eNameAr.trim()) { setError(isRtl ? 'الاسمان مطلوبان' : 'Both names required'); return }
    setSaving(true)
    const res = await updatePaymentMethod(method.id, { name: eName, name_ar: eNameAr, color: eColor, icon: eIcon, is_active: eActive })
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setEditing(false)
  }

  function handleCancel() {
    setEName(method.name); setENameAr(method.name_ar)
    setEColor(method.color); setEIcon(method.icon); setEActive(method.is_active)
    setError(''); setEditing(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await deletePaymentMethod(method.id)
    setDeleting(false)
    setConfirmDel(false)
  }

  async function handleToggle() {
    setToggling(true)
    await togglePaymentMethod(method.id, !method.is_active)
    setToggling(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--txt1)', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  if (editing) {
    return (
      <div style={{ background: 'var(--bg-card)', border: `2px solid ${eColor}50`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ height: 4, background: eColor }} />
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: eColor + '10', border: `1px solid ${eColor}30` }}>
            <span style={{ fontSize: 22 }}>{eIcon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--txt1)' }}>{eName || '…'}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>{eNameAr || '…'}</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: eColor + '18', color: eColor, border: `1px solid ${eColor}30` }}>
              {method.slug}
            </span>
          </div>

          {/* Names */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={eName} onChange={e => setEName(e.target.value)} placeholder="English name" style={inp} />
            <input value={eNameAr} onChange={e => setENameAr(e.target.value)} placeholder="الاسم بالعربي" style={{ ...inp, direction: 'rtl' }} />
          </div>

          {/* Icon */}
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--txt2)' }}>{isRtl ? 'الأيقونة' : 'Icon'}</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setEIcon(ic)} style={{
                  width: 32, height: 32, borderRadius: 7, fontSize: 16,
                  border: `2px solid ${eIcon === ic ? eColor : 'var(--border)'}`,
                  background: eIcon === ic ? eColor + '18' : 'var(--bg-page)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{ic}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--txt2)' }}>{isRtl ? 'اللون' : 'Color'}</p>
            <div style={{ display: 'flex', gap: 5 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setEColor(c)} style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: `3px solid ${eColor === c ? 'var(--txt1)' : 'transparent'}`,
                  cursor: 'pointer', outline: eColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                }} />
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div
              onClick={() => setEActive(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
                background: eActive ? eColor : 'var(--border)', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', background: '#fff',
                transition: 'inset-inline-start 0.2s',
                insetInlineStart: eActive ? 'calc(100% - 17px)' : 3,
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)' }}>
              {eActive ? (isRtl ? 'مفعّل' : 'Active') : (isRtl ? 'معطّل' : 'Inactive')}
            </span>
          </label>

          {error && <p style={{ margin: 0, fontSize: 11, color: '#e04040', fontWeight: 600 }}>⚠ {error}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, background: eColor, color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Check size={13} />
              {saving ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'حفظ' : 'Save')}
            </button>
            <button onClick={handleCancel} style={{
              background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--txt2)', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <X size={13} />
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{
        background: 'var(--bg-card)', border: `1px solid ${method.is_active ? 'var(--border)' : 'var(--border)'}`,
        borderRadius: 14, overflow: 'hidden',
        opacity: method.is_active ? 1 : 0.55,
        transition: 'opacity 0.2s',
      }}>
        {/* Color bar */}
        <div style={{ height: 4, background: method.color }} />

        <div style={{ padding: '14px 16px' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Icon bubble */}
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: method.color + '18', border: `1px solid ${method.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>
              {method.icon}
            </div>

            {/* Name + slug */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>
                  {isRtl ? method.name_ar : method.name}
                </p>
                {!method.is_active && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: '#88888818', color: '#888', border: '1px solid #88888830' }}>
                    {isRtl ? 'معطّل' : 'Inactive'}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
                {isRtl ? method.name : method.name_ar}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => setEditing(true)}
                title={isRtl ? 'تعديل' : 'Edit'}
                style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--txt2)', display: 'flex', alignItems: 'center' }}
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => setConfirmDel(true)}
                title={isRtl ? 'حذف' : 'Delete'}
                style={{ background: '#e0404012', border: '1px solid #e0404030', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#e04040', display: 'flex', alignItems: 'center' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--txt2)', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
              🧾 {method.usage} {isRtl ? (method.usage === 1 ? 'معاملة' : 'معاملات') : (method.usage === 1 ? 'transaction' : 'transactions')}
            </span>

            {/* Toggle */}
            <div style={{ marginInlineStart: 'auto' }}>
              <button
                onClick={handleToggle}
                disabled={toggling}
                style={{
                  background: 'none', border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, padding: 0,
                }}
              >
                <div style={{
                  width: 32, height: 18, borderRadius: 9, position: 'relative',
                  background: method.is_active ? method.color : 'var(--border)',
                  transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff',
                    transition: 'inset-inline-start 0.2s',
                    insetInlineStart: method.is_active ? 'calc(100% - 16px)' : 2,
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>
                  {method.is_active ? (isRtl ? 'مفعّل' : 'Active') : (isRtl ? 'معطّل' : 'Inactive')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setConfirmDel(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--bg-popup)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '20px 22px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, marginBottom: 12, background: '#e0404018', border: '1px solid #e0404030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                <Trash2 size={18} color="#e04040" />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--txt1)' }}>
                {isRtl ? 'حذف نوع الدفع' : 'Delete Payment Type'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)', lineHeight: 1.6 }}>
                {isRtl
                  ? <>سيتم حذف <strong style={{ color: 'var(--txt1)' }}>{method.name_ar}</strong> نهائياً. المعاملات السابقة لن تتأثر.</>
                  : <>Delete <strong style={{ color: 'var(--txt1)' }}>{method.name}</strong> permanently. Existing transactions won't be affected.</>}
              </p>
              {method.usage > 0 && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#e8960a10', border: '1px solid #e8960a30' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#e8960a', fontWeight: 600 }}>
                    ⚠ {isRtl ? `مستخدم في ${method.usage} معاملة` : `Used in ${method.usage} transaction(s)`}
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 22px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleDelete} disabled={deleting}
                style={{ background: '#e04040', border: 'none', borderRadius: 10, padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, fontFamily: 'inherit' }}
              >
                {deleting ? '…' : (isRtl ? 'حذف' : 'Delete')}
              </button>
              <button
                onClick={() => setConfirmDel(false)} disabled={deleting}
                style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', color: 'var(--txt2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
