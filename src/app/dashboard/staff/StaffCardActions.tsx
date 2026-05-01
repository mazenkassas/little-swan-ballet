'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { deleteStaff, toggleStaffActive } from './actions'

interface Props {
  id: string
  displayName: string
  isActive: boolean
  isSuperAdmin: boolean
  isRtl: boolean
}

export default function StaffCardActions({ id, displayName, isActive, isSuperAdmin, isRtl }: Props) {
  const [pending, startTransition] = useTransition()
  const [delErr, setDelErr] = useState('')

  const L = isRtl
    ? { view: 'عرض', edit: 'تعديل', del: 'حذف', active: 'نشط', inactive: 'غير نشط', confirmDel: `حذف ${displayName}؟`, errPfx: 'تعذر الحذف: ' }
    : { view: 'View', edit: 'Edit', del: 'Delete', active: 'Active', inactive: 'Inactive', confirmDel: `Delete ${displayName}?`, errPfx: 'Cannot delete: ' }

  const btnBase: React.CSSProperties = {
    flex: 1, border: '1px solid var(--border)', borderRadius: 7,
    padding: '5px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    opacity: pending ? 0.6 : 1, transition: 'opacity 0.15s', textDecoration: 'none',
    background: 'var(--bg-page)', color: 'var(--txt2)',
  }

  return (
    <div>
      {!isSuperAdmin && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => startTransition(() => toggleStaffActive(id, isActive))}
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
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <Link href={`/dashboard/staff/${id}`} style={{ ...btnBase, color: '#7c5cdb', borderColor: '#7c5cdb28' }}>
          <Eye size={11} />{L.view}
        </Link>
        <Link href={`/dashboard/staff/${id}/edit`} style={btnBase}>
          <Pencil size={11} />{L.edit}
        </Link>
        <button
          onClick={() => {
            if (!confirm(L.confirmDel)) return
            startTransition(async () => {
              setDelErr('')
              const r = await deleteStaff(id)
              if (r.error) setDelErr(r.error)
            })
          }}
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
