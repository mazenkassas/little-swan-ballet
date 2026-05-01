'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

type PendingRow = {
  id: string
  student_id: string
  exam_id: string
  student: { id: string; name_ar: string; name_en: string | null }
  exam: { id: string; name: string; fee: number; payment_deadline: string }
}

export default function ExamFeesList({
  rows,
  isRtl,
  selectedDate,
}: {
  rows: PendingRow[]
  isRtl: boolean
  selectedDate: string
}) {
  const supabase  = createClient()
  const router    = useRouter()
  const [paying,  setPaying]  = useState<string | null>(null)
  const [paid,    setPaid]    = useState<Set<string>>(new Set())

  const L = isRtl ? {
    title:       'رسوم الامتحانات المعلقة',
    sub:         'طالبات لم يتم سداد رسوم الامتحان حتى اليوم',
    student:     'الطالبة',
    exam:        'الامتحان',
    fee:         'الرسوم',
    deadline:    'آخر موعد للسداد',
    action:      'تسجيل الدفع',
    paying:      'جارٍ…',
    done:        'تم ✓',
    overdue:     'متأخر',
    dueToday:    'اليوم',
    noRows:      'لا توجد رسوم امتحانات مستحقة في هذا اليوم',
  } : {
    title:       'Pending Exam Fees',
    sub:         'Students with unpaid exam fees due by selected date',
    student:     'Student',
    exam:        'Exam',
    fee:         'Fee',
    deadline:    'Payment Deadline',
    action:      'Mark as Paid',
    paying:      'Saving…',
    done:        'Paid ✓',
    overdue:     'Overdue',
    dueToday:    'Due Today',
    noRows:      'No pending exam fees for this date',
  }

  async function markPaid(row: PendingRow) {
    setPaying(row.id)
    const supabaseClient = supabase

    // Get current staff session for created_by
    const { data: { user } } = await supabaseClient.auth.getUser()
    const { data: staffRow } = await supabaseClient
      .from('staff').select('id').eq('id', user?.id ?? '').single()

    await Promise.all([
      // Flip the flag
      supabaseClient
        .from('student_exams')
        .update({ exam_fee_paid: true })
        .eq('id', row.id),
      // Create a payment record
      supabaseClient.from('payments').insert({
        student_id:     row.student_id,
        type:           'exam',
        amount_due:     row.exam.fee,
        amount_paid:    row.exam.fee,
        payment_method: 'cash',
        date:           selectedDate,
        notes:          row.exam.name,
        created_by:     staffRow?.id ?? null,
      }),
    ])

    setPaid(prev => new Set([...prev, row.id]))
    setPaying(null)
    router.refresh()
  }

  if (rows.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#e8960a18', border: '1px solid #e8960a28',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen size={16} color="#e8960a" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{L.title}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>{L.sub}</p>
        </div>
        <span style={{
          marginInlineStart: 'auto', fontSize: 12, fontWeight: 700,
          background: '#e8960a18', color: '#e8960a',
          border: '1px solid #e8960a28', borderRadius: 20, padding: '2px 10px',
        }}>
          {rows.filter(r => !paid.has(r.id)).length}
        </span>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
              {[L.student, L.exam, L.fee, L.deadline, L.action].map(col => (
                <th key={col} style={{
                  textAlign: isRtl ? 'right' : 'left',
                  color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
                  padding: '10px 16px', whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isPaid     = paid.has(row.id)
              const isOverdue  = row.exam.payment_deadline < selectedDate
              const isDueToday = row.exam.payment_deadline === selectedDate
              const statusColor = isOverdue ? '#e04040' : isDueToday ? '#e8960a' : '#3dab7e'
              const statusLabel = isOverdue ? L.overdue : isDueToday ? L.dueToday : ''

              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: isPaid ? 0.45 : 1,
                    background: isPaid ? '#3dab7e06' : isOverdue ? '#e0404006' : 'transparent',
                    transition: 'opacity 0.3s',
                  }}
                >
                  {/* Student */}
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/dashboard/students/${row.student_id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>
                        {row.student.name_ar}
                      </p>
                      {row.student.name_en && (
                        <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>{row.student.name_en}</p>
                      )}
                    </Link>
                  </td>

                  {/* Exam */}
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/dashboard/exams/${row.exam_id}`} style={{ textDecoration: 'none' }}>
                      <span style={{ fontSize: 12, color: '#e8960a', fontWeight: 600 }}>{row.exam.name}</span>
                    </Link>
                  </td>

                  {/* Fee */}
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: 'var(--txt1)' }}>
                    {formatCurrency(row.exam.fee)}
                  </td>

                  {/* Deadline */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: statusColor,
                      background: statusColor + '18',
                      border: `1px solid ${statusColor}28`,
                      borderRadius: 20, padding: '2px 10px',
                    }}>
                      {new Date(row.exam.payment_deadline).toLocaleDateString(
                        isRtl ? 'ar-EG' : 'en-GB',
                        { day: 'numeric', month: 'short' }
                      )}
                      {statusLabel && ` · ${statusLabel}`}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => markPaid(row)}
                      disabled={isPaid || paying === row.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: isPaid || paying === row.id ? 'default' : 'pointer',
                        fontFamily: 'inherit', border: 'none', transition: 'all .15s',
                        background: isPaid ? '#3dab7e22' : paying === row.id ? 'var(--border)' : '#e8960a',
                        color: isPaid ? '#3dab7e' : paying === row.id ? 'var(--txt2)' : '#fff',
                      }}
                    >
                      {isPaid
                        ? <><Check size={12} /> {L.done}</>
                        : paying === row.id
                        ? L.paying
                        : L.action}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
