'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { deleteExam } from './actions'

interface Props {
  id: string
  name: string
  isRtl: boolean
}

function DeleteModal({
  name, isRtl, onConfirm, onCancel, pending,
}: {
  name: string; isRtl: boolean; onConfirm: () => void; onCancel: () => void; pending: boolean
}) {
  const L = isRtl
    ? { title: 'تأكيد الحذف', body: 'هل أنت متأكد أنك تريد حذف', warn: 'سيتم حذف جميع نتائج الطالبات المرتبطة بهذا الامتحان.', cancel: 'إلغاء', confirm: 'حذف', deleting: 'جارٍ الحذف...' }
    : { title: 'Confirm Delete', body: 'Are you sure you want to delete', warn: 'All student results for this exam will also be deleted.', cancel: 'Cancel', confirm: 'Delete', deleting: 'Deleting...' }

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
        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--txt1)' }}>{L.title}</p>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5 }}>
          {L.body} <span style={{ fontWeight: 700, color: 'var(--txt1)' }}>{name}</span>?
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: '#e04040', fontWeight: 500 }}>{L.warn}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel} disabled={pending}
            style={{
              flex: 1, background: 'var(--bg-page)', border: '1px solid var(--border)',
              borderRadius: 9, padding: '10px', fontSize: 13, fontWeight: 600,
              color: 'var(--txt2)', cursor: 'pointer',
            }}
          >
            {L.cancel}
          </button>
          <button
            onClick={onConfirm} disabled={pending}
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

export default function ExamCardActions({ id, name, isRtl }: Props) {
  const [pending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [delErr, setDelErr] = useState('')

  const L = isRtl
    ? { view: 'عرض', edit: 'تعديل', del: 'حذف', errPfx: 'تعذر الحذف: ' }
    : { view: 'View', edit: 'Edit', del: 'Delete', errPfx: 'Cannot delete: ' }

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
      const r = await deleteExam(id)
      setShowConfirm(false)
      if (r.error) setDelErr(r.error)
    })
  }

  return (
    <div>
      {showConfirm && (
        <DeleteModal
          name={name} isRtl={isRtl}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
          pending={pending}
        />
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <Link href={`/dashboard/exams/${id}`} style={{ ...btnBase, color: '#4a90d9', borderColor: '#4a90d928' }}>
          <Eye size={11} />{L.view}
        </Link>
        <Link href={`/dashboard/exams/${id}/edit`} style={btnBase}>
          <Pencil size={11} />{L.edit}
        </Link>
        <button
          onClick={() => setShowConfirm(true)} disabled={pending}
          style={{ ...btnBase, background: '#e0404012', color: '#e04040', borderColor: '#e0404028' }}
        >
          <Trash2 size={11} />{L.del}
        </button>
      </div>

      {delErr && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#e04040' }}>⚠ {L.errPfx}{delErr}</p>}
    </div>
  )
}
