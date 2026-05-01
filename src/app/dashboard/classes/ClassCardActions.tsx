'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { deleteClass } from './actions'

interface Props {
  id: string
  name: string
  isRtl: boolean
}

export default function ClassCardActions({ id, name, isRtl }: Props) {
  const [pending, startTransition] = useTransition()
  const [delErr, setDelErr] = useState('')

  const L = isRtl
    ? { view: 'عرض', edit: 'تعديل', del: 'حذف', confirm: `حذف "${name}"؟`, errPfx: 'تعذر الحذف: ' }
    : { view: 'View', edit: 'Edit', del: 'Delete', confirm: `Delete "${name}"?`, errPfx: 'Cannot delete: ' }

  const btn: React.CSSProperties = {
    flex: 1, border: '1px solid var(--border)', borderRadius: 7,
    padding: '6px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    opacity: pending ? 0.6 : 1, background: 'var(--bg-page)',
    color: 'var(--txt2)', textDecoration: 'none', transition: 'opacity 0.15s',
  }

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <Link href={`/dashboard/classes/${id}`} style={{ ...btn, color: '#4a90d9', borderColor: '#4a90d928' }}>
          <Eye size={11} />{L.view}
        </Link>
        <Link href={`/dashboard/classes/${id}/edit`} style={btn}>
          <Pencil size={11} />{L.edit}
        </Link>
        <button
          onClick={() => {
            if (!confirm(L.confirm)) return
            startTransition(async () => {
              setDelErr('')
              const r = await deleteClass(id)
              if (r.error) setDelErr(r.error)
            })
          }}
          disabled={pending}
          style={{ ...btn, background: '#e0404012', color: '#e04040', borderColor: '#e0404028' }}
        >
          <Trash2 size={11} />{L.del}
        </button>
      </div>
      {delErr && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#e04040' }}>⚠ {L.errPfx}{delErr}</p>}
    </div>
  )
}
