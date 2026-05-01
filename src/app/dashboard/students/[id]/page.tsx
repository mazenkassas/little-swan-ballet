import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { calculateAge, formatDate, formatCurrency } from '@/lib/utils'
import StudentActions from './StudentActions'
import BackButton from '@/components/layout/BackButton'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('*, level:levels(*)')
    .eq('id', id)
    .single()

  if (!student) notFound()

  const [
    { data: subscriptions },
    { data: payments },
    { data: enrollments },
    { data: gradeRow },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*, plan:subscription_plans(name)').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('student_id', id).order('date', { ascending: false }),
    supabase.from('class_students')
      .select('*, class:classes(name, days_of_week, start_time, end_time, grade:grades(name), term:terms(name), hall:halls(name))')
      .eq('student_id', id)
      .order('enrolled_date', { ascending: true }),
    student.grade_id
      ? supabase.from('grades').select('name').eq('id', student.grade_id).single()
      : Promise.resolve({ data: null }),
  ])

  const currentClass = enrollments?.[enrollments.length - 1]
  const gradeName    = currentClass?.class?.grade?.name ?? (gradeRow as any)?.name ?? null

  function fmt12h(time: string) {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    const h12 = h % 12 || 12
    const sfx = h < 12 ? 'AM' : 'PM'
    return m === 0 ? `${h12} ${sfx}` : `${h12}:${String(m).padStart(2, '0')} ${sfx}`
  }

  function fmtClass(cls: any) {
    if (!cls) return '—'
    const time = cls.start_time
      ? `${fmt12h(cls.start_time)}${cls.end_time ? ` – ${fmt12h(cls.end_time)}` : ''}`
      : ''
    const day = cls.days_of_week?.[0] || ''
    return [time, day].filter(Boolean).join(' · ') || cls.name || '—'
  }
  const displayName = isRtl && student.name_ar ? student.name_ar : (student.name_en || student.name_ar)
  const initials    = (displayName || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const STATUS_META: Record<string, { label: string; color: string }> = {
    active:   { label: isRtl ? 'نشطة'     : 'Active',   color: '#3dab7e' },
    frozen:   { label: isRtl ? 'مجمدة'    : 'Freeze',   color: '#4a90d9' },
    inactive: { label: isRtl ? 'غير نشطة' : 'Inactive', color: '#e04040' },
  }
  const sc = STATUS_META[student.status] ?? { label: student.status, color: '#b89990' }

  const SUB_STATUS: Record<string, { label: string; color: string }> = {
    active:   { label: isRtl ? 'نشط'     : 'Active',   color: '#3dab7e' },
    expired:  { label: isRtl ? 'منتهي'   : 'Expired',  color: '#b89990' },
    inactive: { label: isRtl ? 'غير نشط' : 'Inactive', color: '#b89990' },
  }

  const PAY_TYPE: Record<string, string> = isRtl
    ? { subscription: 'اشتراك', product: 'منتج', event: 'فعالية', private: 'برايفيت', exam: 'امتحان', enrollment: 'تسجيل جديد' }
    : { subscription: 'Subscription', product: 'Product', event: 'Event', private: 'Private', exam: 'Exam', enrollment: 'Enrollment' }

  const PAY_TYPE_COLOR: Record<string, string> = {
    subscription: '#C8788A', product: '#4A8C6A', event: '#8B6EC8',
    private: '#4a90d9', exam: '#C8A66E', enrollment: '#C8788A',
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
  }
  const th: React.CSSProperties = {
    textAlign: isRtl ? 'right' : 'left', color: 'var(--txt2)', fontSize: 10, fontWeight: 600,
    padding: '10px 12px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-page)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const td: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Back ── */}
      <div style={{ marginBottom: 20 }}>
        <BackButton label={isRtl ? 'رجوع' : 'Back'} fallback="/dashboard/students" variant="primary" />
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 26,
          background: '#d4667a18', border: '1px solid #d4667a30',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#d4667a', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt1)', margin: 0, letterSpacing: -0.3 }}>{displayName}</h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: sc.color + '18', color: sc.color,
              fontSize: 10, fontWeight: 600, padding: '2px 8px',
              borderRadius: 20, border: `1px solid ${sc.color}28`,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: sc.color }} />
              {sc.label}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={`/dashboard/students/${id}/edit`} style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 14px', color: 'var(--txt2)',
            fontSize: 12, fontWeight: 600, textDecoration: 'none',
          }}>
            {isRtl ? 'تعديل' : 'Edit'}
          </Link>
          <StudentActions student={student} />
        </div>
      </div>

      {/* ── Profile card ── */}
      <div style={{ ...card, padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt1)', margin: '0 0 14px', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
          {isRtl ? 'البيانات الأساسية' : 'Profile'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <InfoRow label={isRtl ? 'تاريخ الميلاد'  : 'Date of Birth'} value={`${formatDate(student.date_of_birth)} (${calculateAge(student.date_of_birth)} ${isRtl ? 'سنة' : 'yrs'})`} />
            <InfoRow label={isRtl ? 'هاتف ولي الأمر' : 'Parent Phone'}  value={student.parent_phone || '—'} ltr />
            <InfoRow label={isRtl ? 'اسم ولي الأمر'  : 'Parent Name'}   value={student.parent_name  || '—'} />
            <InfoRow label={isRtl ? 'تاريخ التسجيل'  : 'Enrollment'}    value={formatDate(student.enrollment_date)} last />
          </div>
          <div>
            <InfoRow label={isRtl ? 'الصف الدراسي' : 'Grade'} value={gradeName || '—'} />
            <InfoRow label={isRtl ? 'الفصل الدراسي' : 'Term'}  value={currentClass?.class?.term?.name || '—'} />
            <InfoRow label={isRtl ? 'الحصة'         : 'Class'} value={fmtClass(currentClass?.class)} last />
          </div>
        </div>
        {student.notes && (
          <div style={{ marginTop: 14, background: 'var(--bg2)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 10, color: 'var(--txt2)', margin: '0 0 4px', fontWeight: 600 }}>{isRtl ? 'ملاحظات' : 'Notes'}</p>
            <p style={{ fontSize: 12, color: 'var(--txt1)', margin: 0 }}>{student.notes}</p>
          </div>
        )}
      </div>

      {/* ── Bottom row: Financial History + Study History ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>

        {/* ── Financial History ── */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>
              {isRtl ? 'السجل المالي' : 'Financial History'}
            </p>
          </div>

          {/* Subscriptions sub-section */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt2)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isRtl ? 'الاشتراكات' : 'Subscriptions'}
            </p>
          </div>
          {subscriptions && subscriptions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
                <thead>
                  <tr>
                    <th style={th}>{isRtl ? 'الخطة'       : 'Plan'}</th>
                    <th style={th}>{isRtl ? 'الحصص'       : 'Sessions'}</th>
                    <th style={th}>{isRtl ? 'تاريخ البدء' : 'Start'}</th>
                    <th style={th}>{isRtl ? 'الحالة'      : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s: any) => {
                    const ss = SUB_STATUS[s.status] ?? { label: s.status, color: '#b89990' }
                    return (
                      <tr key={s.id}>
                        <td style={{ ...td, fontSize: 12, fontWeight: 500, color: 'var(--txt1)' }}>
                          {s.plan?.name || (isRtl ? 'اشتراك' : 'Subscription')}
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[1,2,3,4].map(i => (
                                <div key={i} style={{ width: 9, height: 6, borderRadius: 2, background: i <= (s.remaining_sessions ?? 0) ? '#d4667a' : 'var(--border)' }} />
                              ))}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{s.remaining_sessions}/{s.total_sessions}</span>
                          </div>
                        </td>
                        <td style={{ ...td, fontSize: 11, color: 'var(--txt2)' }}>{formatDate(s.start_date)}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: ss.color + '18', color: ss.color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, border: `1px solid ${ss.color}28` }}>
                            <span style={{ width: 4, height: 4, borderRadius: 2, background: ss.color }} />{ss.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--txt2)', fontSize: 12 }}>
              {isRtl ? 'لا توجد اشتراكات' : 'No subscriptions yet'}
            </div>
          )}

          {/* Payments sub-section */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', borderTop: '2px solid var(--border)', background: 'var(--bg-page)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt2)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isRtl ? 'المدفوعات' : 'Payments'}
            </p>
          </div>
          {payments && payments.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                <thead>
                  <tr>
                    <th style={th}>{isRtl ? 'التاريخ' : 'Date'}</th>
                    <th style={th}>{isRtl ? 'النوع'   : 'Type'}</th>
                    <th style={th}>{isRtl ? 'المطلوب' : 'Due'}</th>
                    <th style={th}>{isRtl ? 'المدفوع' : 'Paid'}</th>
                    <th style={th}>{isRtl ? 'المتبقي' : 'Balance'}</th>
                    <th style={th}>{isRtl ? 'الطريقة' : 'Method'}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => {
                    const typeColor = PAY_TYPE_COLOR[p.type] || '#C8788A'
                    return (
                      <tr key={p.id}>
                        <td style={{ ...td, fontSize: 11, color: 'var(--txt2)' }}>{formatDate(p.date)}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-flex', background: typeColor + '18', color: typeColor, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, border: `1px solid ${typeColor}28` }}>
                            {PAY_TYPE[p.type] || p.type}
                          </span>
                        </td>
                        <td style={{ ...td, fontSize: 11, color: 'var(--txt2)' }}>{formatCurrency(p.amount_due)}</td>
                        <td style={{ ...td, fontSize: 12, fontWeight: 700, color: '#4A8C6A' }}>{formatCurrency(p.amount_paid)}</td>
                        <td style={{ ...td, fontSize: 11 }}>
                          <span style={{ color: (p.remaining_balance ?? 0) > 0 ? '#e8960a' : 'var(--txt2)', fontWeight: (p.remaining_balance ?? 0) > 0 ? 600 : 400 }}>
                            {formatCurrency(p.remaining_balance ?? 0)}
                          </span>
                        </td>
                        <td style={{ ...td, fontSize: 11, color: 'var(--txt2)' }}>
                          {p.payment_method === 'cash' ? (isRtl ? 'كاش' : 'Cash') : p.payment_method === 'instapay' ? 'Instapay' : p.payment_method || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--txt2)', fontSize: 12 }}>
              {isRtl ? 'لا توجد مدفوعات' : 'No payments yet'}
            </div>
          )}
        </div>

        {/* ── Study History ── */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>
              {isRtl ? 'السجل الدراسي' : 'Study History'}
            </p>
          </div>

          {enrollments && enrollments.length > 0 ? (
            <div style={{ padding: '20px 16px' }}>
              {enrollments.map((e: any, idx: number) => {
                const isFirst  = idx === 0
                const isLast   = idx === enrollments.length - 1
                const dotColor = isFirst ? '#d4667a' : '#4a90d9'
                return (
                  <div key={e.id} style={{ display: 'flex', gap: 12 }}>

                    {/* Spine */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 11, height: 11, borderRadius: '50%', marginTop: 3, flexShrink: 0,
                        background: dotColor, boxShadow: `0 0 0 3px ${dotColor}22`,
                      }} />
                      {!isLast && <div style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--border)', margin: '3px 0' }} />}
                    </div>

                    {/* Entry */}
                    <div style={{ flex: 1, marginBottom: isLast ? 0 : 16, paddingBottom: isLast ? 0 : 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: dotColor + '18', color: dotColor, border: `1px solid ${dotColor}28`,
                          whiteSpace: 'nowrap',
                        }}>
                          {isFirst
                            ? (isRtl ? 'التسجيل الأول' : 'Initial Enrollment')
                            : (isRtl ? 'تحديث'         : 'Update')}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--txt2)', whiteSpace: 'nowrap' }}>
                          {formatDate(e.enrolled_date)}
                        </span>
                      </div>

                      <div style={{
                        background: 'var(--bg-page)', border: `1px solid ${isFirst ? '#d4667a28' : 'var(--border)'}`,
                        borderRadius: 10, padding: '10px 12px',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px',
                      }}>
                        <Field label={isRtl ? 'الصف الدراسي'  : 'Grade'} value={e.class?.grade?.name || '—'} />
                        <Field label={isRtl ? 'الفصل الدراسي' : 'Term'}  value={e.class?.term?.name  || '—'} />
                        <Field label={isRtl ? 'الحصة'         : 'Class'} value={fmtClass(e.class)} />
                        {e.class?.hall?.name && (
                          <Field label={isRtl ? 'القاعة' : 'Hall'} value={e.class.hall.name} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--txt2)' }}>
              <p style={{ fontSize: 22, marginBottom: 8 }}>📚</p>
              <p style={{ fontSize: 12, fontWeight: 500 }}>{isRtl ? 'لا يوجد سجل دراسي' : 'No study history yet'}</p>
              <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                {isRtl ? 'لم يتم تسجيل الطالبة في أي فصل بعد' : 'Student has not been enrolled in any class yet'}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function InfoRow({ label, value, last, ltr }: { label: string; value: string; last?: boolean; ltr?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--border)', gap: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--txt2)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--txt1)', fontWeight: 500, textAlign: 'end', direction: ltr ? 'ltr' : undefined }}>{value}</span>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--txt2)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--txt1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
