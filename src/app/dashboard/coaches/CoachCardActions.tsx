'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { deleteCoach, toggleCoachActive } from './actions'

interface Props {
  id: string
  displayName: string
  isActive: boolean
  isRtl: boolean
}

function DeleteModal({
  name, isRtl, onConfirm, onCancel, pending,
}: {
  name: string; isRtl: boolean; onConfirm: () => void; onCancel: () => void; pending: boolean
}) {
  const L = isRtl
    ? { title: 'تأكيد الحذف', body: 'هل أنت متأكد أنك تريد حذف', warn: 'لا يمكن التراجع عن هذا الإجراء.', cancel: 'إلغاء', confirm: 'حذف', deleting: 'جارٍ الحذف...' }
    : { title: 'Confirm Delete', body: 'Are you sure you want to delete', warn: 'This action cannot be undone.', cancel: 'Cancel', confirm: 'Delete', deleting: 'Deleting...' }

  return (
    <div
      onClick={onCancel}
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
            onClick={onCancel}
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
            onClick={onConfirm}
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
  )
}

export default function CoachCardActions({ id, displayName, isActive, isRtl }: Props) {
  const [pending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [delErr, setDelErr] = useState('')

  const L = isRtl
    ? { view: 'عرض', edit: 'تعديل', del: 'حذف', active: 'نشط', inactive: 'غير نشط', errPfx: 'تعذر الحذف: ' }
    : { view: 'View', edit: 'Edit', del: 'Delete', active: 'Active', inactive: 'Inactive', errPfx: 'Cannot delete: ' }

  const btnBase: React.CSSProperties = {
    flex: 1, border: '1px solid var(--border)', borderRadius: 7,
    padding: '5px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    opacity: pending ? 0.6 : 1, transition: 'opacity 0.15s', textDecoration: 'none',
    background: 'var(--bg-page)', color: 'var(--txt2)',
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      setDelErr('')
      const r = await deleteCoach(id)
      setShowConfirm(false)
      if (r.error) setDelErr(r.error)
    })
  }

  return (
    <div>
      {showConfirm && (
        <DeleteModal
          name={displayName}
          isRtl={isRtl}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
          pending={pending}
        />
      )}

      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => startTransition(() => toggleCoachActive(id, isActive))}
          disabled={pending}
          style={{
            background: isActive ? '#3dab7e18' : '#e0404018',
            color: isActive ? '#3dab7e' : '#e04040',
            border: `1px solid ${isActive ? '#3dab7e28' : '#e0404028'}`,
            borderRadius: 20, padding: '3px 12px',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {isActive ? L.active : L.inactive}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Link href={`/dashboard/coaches/${id}`} style={{ ...btnBase, color: '#4a90d9', borderColor: '#4a90d928' }}>
          <Eye size={11} />{L.view}
        </Link>
        <Link href={`/dashboard/coaches/${id}/edit`} style={btnBase}>
          <Pencil size={11} />{L.edit}
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={pending}
          style={{ ...btnBase, background: '#e0404012', color: '#e04040', borderColor: '#e0404028' }}
        >
          <Trash2 size={11} />{L.del}
        </button>
      </div>

      {delErr && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#e04040' }}>⚠ {L.errPfx}{delErr}</p>}
    </div>
  )
}
