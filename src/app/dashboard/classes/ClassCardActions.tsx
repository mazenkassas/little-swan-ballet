'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { deleteClass } from './actions'

interface Props {
  id: string
  name: string
  isRtl: boolean
}

export default function ClassCardActions({ id, name, isRtl }: Props) {
  const [pending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [delErr, setDelErr] = useState('')

  const L = isRtl
    ? { view: 'عرض', edit: 'تعديل', del: 'حذف', title: 'تأكيد الحذف', body: 'هل أنت متأكد أنك تريد حذف', warn: 'لا يمكن التراجع عن هذا الإجراء.', cancel: 'إلغاء', confirm: 'حذف', deleting: 'جارٍ الحذف...', errPfx: 'تعذر الحذف: ' }
    : { view: 'View', edit: 'Edit', del: 'Delete', title: 'Confirm Delete', body: 'Are you sure you want to delete', warn: 'This action cannot be undone.', cancel: 'Cancel', confirm: 'Delete', deleting: 'Deleting...', errPfx: 'Cannot delete: ' }

  const btn: React.CSSProperties = {
    flex: 1, border: '1px solid var(--border)', borderRadius: 7,
    padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    opacity: pending ? 0.6 : 1, background: 'var(--bg-page)',
    color: 'var(--txt2)', textDecoration: 'none', transition: 'opacity 0.15s',
  }

  function handleConfirm() {
    startTransition(async () => {
      setDelErr('')
      const r = await deleteClass(id)
      setShowConfirm(false)
      if (r.error) setDelErr(r.error)
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
              {L.body} <span style={{ fontWeight: 700, color: 'var(--txt1)' }}>{name}</span>?
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

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Link href={`/dashboard/classes/${id}`} style={{ ...btn, color: '#4a90d9', borderColor: '#4a90d928' }}>
            <Eye size={11} />{L.view}
          </Link>
          <Link href={`/dashboard/classes/${id}/edit`} style={btn}>
            <Pencil size={11} />{L.edit}
          </Link>
          <button
            onClick={() => { setDelErr(''); setShowConfirm(true) }}
            disabled={pending}
            style={{ ...btn, background: '#e0404012', color: '#e04040', borderColor: '#e0404028' }}
          >
            <Trash2 size={11} />{L.del}
          </button>
        </div>
        {delErr && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#e04040' }}>⚠ {L.errPfx}{delErr}</p>}
      </div>
    </>
  )
}
