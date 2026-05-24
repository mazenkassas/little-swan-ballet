'use client'

import { useState, useTransition } from 'react'
import { deleteHoliday } from './actions'
import { Trash2 } from 'lucide-react'

export default function DeleteHolidayButton({
  id, name, isRtl,
}: {
  id: string; name: string; isRtl: boolean
}) {
  const [open,    setOpen]    = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      await deleteHoliday(id)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: '#e0404012', color: '#e04040', border: '1px solid #e0404028',
          borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        <Trash2 size={12} />
        {isRtl ? 'حذف' : 'Delete'}
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{
            background: 'var(--bg-popup)', border: '1px solid var(--border)',
            borderRadius: 16, width: '100%', maxWidth: 400,
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            direction: isRtl ? 'rtl' : 'ltr',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, marginBottom: 12,
                background: '#e0404015', border: '1px solid #e0404030',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={18} color="#e04040" />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--txt1)' }}>
                {isRtl ? 'حذف الإجازة' : 'Delete Holiday'}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5 }}>
                {isRtl
                  ? <>هل أنت متأكد من حذف إجازة <strong style={{ color: 'var(--txt1)' }}>{name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.</>
                  : <>Are you sure you want to delete <strong style={{ color: 'var(--txt1)' }}>{name}</strong>? This action cannot be undone.</>
                }
              </p>
            </div>

            {/* Actions */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                style={{
                  background: 'var(--bg-page)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '9px 20px', color: 'var(--txt2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirm}
                disabled={pending}
                style={{
                  background: '#e04040', border: 'none', borderRadius: 10,
                  padding: '9px 20px', color: '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: pending ? 'not-allowed' : 'pointer',
                  opacity: pending ? 0.6 : 1, fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Trash2 size={13} />
                {pending ? (isRtl ? 'جارٍ الحذف…' : 'Deleting…') : (isRtl ? 'تأكيد الحذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
