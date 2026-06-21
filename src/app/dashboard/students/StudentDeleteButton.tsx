'use client'

import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deleteStudent } from './actions'

export default function StudentDeleteButton({
  studentId,
  studentName,
  isRtl,
}: {
  studentId: string
  studentName: string
  isRtl: boolean
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const L = isRtl
    ? { del: 'حذف', title: 'تأكيد الحذف', body: 'هل أنت متأكد أنك تريد حذف', warn: 'لا يمكن التراجع عن هذا الإجراء.', cancel: 'إلغاء', confirm: 'حذف', deleting: 'جارٍ الحذف...' }
    : { del: 'Delete', title: 'Confirm Delete', body: 'Are you sure you want to delete', warn: 'This action cannot be undone.', cancel: 'Cancel', confirm: 'Delete', deleting: 'Deleting...' }

  function handleConfirm() {
    startTransition(async () => {
      setError('')
      const r = await deleteStudent(studentId)
      if (r.error) {
        setError(r.error)
        setShowConfirm(false)
      }
    })
  }

  return (
    <>
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-popup)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 28px 24px',
              width: '100%', maxWidth: 380,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              direction: isRtl ? 'rtl' : 'ltr',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: '#e0404014', border: '1px solid #e0404030',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <AlertTriangle size={22} color="#e04040" />
            </div>

            <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--txt1)' }}>
              {L.title}
            </p>
            <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5 }}>
              {L.body} <span style={{ fontWeight: 700, color: 'var(--txt1)' }}>{studentName}</span>?
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 12, color: '#e04040', fontWeight: 500 }}>
              {L.warn}
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={pending}
                style={{
                  flex: 1, background: 'var(--bg-page)', border: '1px solid var(--border)',
                  borderRadius: 9, padding: '10px', fontSize: 13, fontWeight: 600,
                  color: 'var(--txt2)', cursor: 'pointer',
                }}
              >
                {L.cancel}
              </button>
              <button
                onClick={handleConfirm}
                disabled={pending}
                style={{
                  flex: 1, background: '#e04040', border: 'none',
                  borderRadius: 9, padding: '10px', fontSize: 13, fontWeight: 700,
                  color: '#fff', cursor: pending ? 'wait' : 'pointer',
                  opacity: pending ? 0.7 : 1,
                }}
              >
                {pending ? L.deleting : L.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => { setError(''); setShowConfirm(true) }}
        disabled={pending}
        style={{
          background: '#e0404012', border: '1px solid #e0404028',
          borderRadius: 8, padding: '4px 10px', color: '#e04040',
          fontSize: 10, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          opacity: pending ? 0.5 : 1,
        }}
      >
        <Trash2 size={10} />{L.del}
      </button>

      {error && (
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#e04040' }}>⚠ {error}</p>
      )}
    </>
  )
}
