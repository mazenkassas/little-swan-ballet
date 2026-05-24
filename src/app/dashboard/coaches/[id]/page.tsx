import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Clock, AlertTriangle, Users, Star } from 'lucide-react'

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = await params
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const { data: coach } = await supabase.from('coaches').select('*').eq('id', id).single()
  if (!coach) notFound()

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const [{ data: attendance }, { data: privateSessions }] = await Promise.all([
    supabase
      .from('coach_attendance')
      .select('*, session:sessions(date, class:classes(name))')
      .eq('coach_id', id)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
      .order('check_in_time', { ascending: false }),
    supabase
      .from('private_sessions')
      .select('id, date, fee, duration_hours, student:students(name_ar, name_en)')
      .eq('coach_id', id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false }),
  ])

  const classAttendance = (attendance || []).filter(a => a.session_id !== null)
  const classHours      = classAttendance.reduce((s, a) => s + (a.hours_worked || 0), 0)
  const privateHours    = (privateSessions || []).reduce((s, p) => s + (p.duration_hours || 0), 0)
  const totalHours      = classHours + privateHours
  const flaggedCount    = (attendance || []).filter(a => a.location_status === 'invalid').length
  const earnings        = coach.hourly_rate ? totalHours * coach.hourly_rate : null

  const displayName = isRtl ? (coach.name_ar || coach.name_en) : (coach.name_en || coach.name_ar)
  const secondName  = isRtl ? coach.name_en : coach.name_ar
  const initial     = (displayName || '').charAt(0).toUpperCase()
  const h           = isRtl ? 'س' : 'h'
  const monthLabel  = new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric' })

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short' })
  }

  function fmtTime(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const th = (color?: string): React.CSSProperties => ({
    background: color ? color + '08' : 'var(--bg-page)',
    color: 'var(--txt2)', fontSize: 11, fontWeight: 700,
    padding: '9px 14px', textAlign: isRtl ? 'right' : 'left',
    borderBottom: `2px solid ${color ? color + '20' : 'var(--border)'}`,
    whiteSpace: 'nowrap', letterSpacing: '0.02em',
  })
  const td: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border)',
    color: 'var(--txt1)', verticalAlign: 'middle',
  }

  const kpis = [
    {
      label: isRtl ? 'حصص المجموعات' : 'Group Classes',
      value: classHours.toFixed(1), unit: h,
      sub: `${classAttendance.length} ${isRtl ? 'حصة' : 'sessions'}`,
      color: '#7c5cdb', icon: Users,
    },
    {
      label: isRtl ? 'البرايفيت' : 'Private Sessions',
      value: privateHours.toFixed(1), unit: h,
      sub: `${(privateSessions || []).length} ${isRtl ? 'جلسة' : 'sessions'}`,
      color: '#d4667a', icon: Star,
    },
    {
      label: isRtl ? 'إجمالي ساعات الشهر' : 'Total Hours This Month',
      value: totalHours.toFixed(1), unit: h,
      sub: earnings != null ? `${earnings.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}` : (isRtl ? 'لا يوجد سعر ساعة' : 'No hourly rate set'),
      color: '#3dab7e', icon: Clock,
    },
    {
      label: isRtl ? 'تسجيلات مشكوكة' : 'Flagged Check-ins',
      value: String(flaggedCount), unit: '',
      sub: flaggedCount > 0 ? (isRtl ? 'تحتاج مراجعة' : 'Needs review') : (isRtl ? 'لا توجد مشاكل' : 'All clear'),
      color: flaggedCount > 0 ? '#e8960a' : '#3dab7e', icon: AlertTriangle,
    },
  ]

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Sticky top bar ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/dashboard/coaches" style={{
          background: '#d4667a', borderRadius: 8, padding: '7px 16px',
          color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {isRtl ? 'رجوع' : 'Back'}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 18, flexShrink: 0,
            background: '#7c5cdb18', border: '2px solid #7c5cdb30',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#7c5cdb',
          }}>
            {initial}
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 14, fontWeight: 700 }}>{displayName}</p>
            <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>
              {secondName}{coach.email ? ` • ${coach.email}` : ''}
              {coach.hourly_rate ? ` • ${coach.hourly_rate} ${isRtl ? 'ج.م/س' : 'EGP/hr'}` : ''}
            </p>
          </div>
        </div>
        <div style={{ marginInlineStart: 'auto' }}>
          <Link href={`/dashboard/coaches/${id}/edit`} style={{
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 16px', color: 'var(--txt2)',
            fontSize: 12, fontWeight: 600, textDecoration: 'none',
          }}>
            {isRtl ? 'تعديل' : 'Edit'}
          </Link>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: 'var(--bg-card)', border: `1px solid ${k.color}22`,
              borderRadius: 14, padding: '18px 20px',
              borderTop: `3px solid ${k.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 600 }}>{k.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: k.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <k.icon size={14} color={k.color} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>
                {k.value}
                {k.unit && <span style={{ fontSize: 14, fontWeight: 500, marginInlineStart: 3 }}>{k.unit}</span>}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--txt2)' }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Group Classes Log ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20, background: 'var(--bg-card)', border: '1px solid #7c5cdb22', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #7c5cdb20',
            background: '#7c5cdb08',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#7c5cdb18', border: '1px solid #7c5cdb28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} color="#7c5cdb" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#7c5cdb' }}>
                  {isRtl ? 'حصص المجموعات' : 'Group Classes'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>{monthLabel}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {classAttendance.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7c5cdb', background: '#7c5cdb18', border: '1px solid #7c5cdb28', borderRadius: 20, padding: '3px 12px' }}>
                  {classAttendance.length} {isRtl ? 'حصة' : 'sessions'}
                </span>
              )}
              <span style={{ fontSize: 13, fontWeight: 800, color: '#7c5cdb' }}>
                {classHours.toFixed(1)}{h}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th('#7c5cdb')}>{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th style={th('#7c5cdb')}>{isRtl ? 'المجموعة' : 'Class'}</th>
                  <th style={{ ...th('#7c5cdb'), textAlign: 'center' }}>{isRtl ? 'دخول' : 'Check-In'}</th>
                  <th style={{ ...th('#7c5cdb'), textAlign: 'center' }}>{isRtl ? 'خروج' : 'Check-Out'}</th>
                  <th style={{ ...th('#7c5cdb'), textAlign: 'center' }}>{isRtl ? 'الساعات' : 'Hours'}</th>
                  <th style={{ ...th('#7c5cdb'), textAlign: 'center' }}>{isRtl ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {classAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: 'center', padding: '32px', color: 'var(--txt2)', fontSize: 13 }}>
                      {isRtl ? 'لا توجد حصص مجموعات هذا الشهر' : 'No group class sessions this month'}
                    </td>
                  </tr>
                ) : classAttendance.map(a => {
                  const isFlagged = a.location_status === 'invalid'
                  const isActive  = !a.check_out_time
                  return (
                    <tr key={a.id} style={{ borderLeft: `3px solid ${isFlagged ? '#e8960a' : '#7c5cdb30'}` }}>
                      <td style={{ ...td, color: 'var(--txt2)', fontWeight: 500 }}>
                        {fmtDate(a.check_in_time)}
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: 'var(--txt1)' }}>
                        {a.session?.class?.name || '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--txt1)', fontSize: 12 }}>{fmtTime(a.check_in_time) || '—'}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {isActive ? (
                          <span style={{ background: '#e8960a18', color: '#e8960a', border: '1px solid #e8960a28', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                            {isRtl ? 'في الدوام' : 'In Progress'}
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--txt1)', fontSize: 12 }}>{fmtTime(a.check_out_time)}</span>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#7c5cdb' }}>
                          {a.hours_worked != null ? `${a.hours_worked}${h}` : '—'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {isFlagged ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e8960a18', color: '#e8960a', border: '1px solid #e8960a28', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                            ⚠ {isRtl ? 'مشكوك' : 'Flagged'}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e28', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                            ✓ {isRtl ? 'صحيح' : 'Valid'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {classAttendance.length > 0 && (
            <div style={{ padding: '11px 20px', borderTop: '1px solid #7c5cdb20', background: '#7c5cdb06', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{isRtl ? 'إجمالي حصص المجموعات' : 'Group Classes Total'}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#7c5cdb' }}>{classHours.toFixed(1)}{h}</span>
            </div>
          )}
        </div>

        {/* ── Private Sessions Log ─────────────────────────────────────────── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid #d4667a22', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #d4667a20',
            background: '#d4667a08',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#d4667a18', border: '1px solid #d4667a28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={15} color="#d4667a" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#d4667a' }}>
                  {isRtl ? 'البرايفيت' : 'Private Sessions'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--txt2)' }}>{monthLabel}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(privateSessions || []).length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#d4667a', background: '#d4667a18', border: '1px solid #d4667a28', borderRadius: 20, padding: '3px 12px' }}>
                  {(privateSessions || []).length} {isRtl ? 'جلسة' : 'sessions'}
                </span>
              )}
              <span style={{ fontSize: 13, fontWeight: 800, color: '#d4667a' }}>
                {privateHours.toFixed(1)}{h}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th('#d4667a')}>{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th style={th('#d4667a')}>{isRtl ? 'اسم الطالبة' : 'Student Name'}</th>
                  <th style={{ ...th('#d4667a'), textAlign: 'center' }}>{isRtl ? 'سعر الساعة' : 'Fee Per Hour'}</th>
                </tr>
              </thead>
              <tbody>
                {(privateSessions || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ ...td, textAlign: 'center', padding: '32px', color: 'var(--txt2)', fontSize: 13 }}>
                      {isRtl ? 'لا توجد جلسات برايفيت هذا الشهر' : 'No private sessions this month'}
                    </td>
                  </tr>
                ) : (privateSessions || []).map(p => {
                  const student    = p.student as any
                  const studentName = isRtl ? student?.name_ar : (student?.name_en || student?.name_ar)
                  const feePerHour = p.fee > 0 && p.duration_hours > 0
                    ? Math.round(p.fee / p.duration_hours)
                    : coach.hourly_rate ?? null
                  return (
                    <tr key={p.id} style={{ borderLeft: '3px solid #d4667a30' }}>
                      <td style={{ ...td, color: 'var(--txt2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {new Date(p.date + 'T00:00:00').toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: 'var(--txt1)' }}>
                        {studentName || '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {feePerHour != null ? (
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#d4667a' }}>
                            {feePerHour.toLocaleString()} {isRtl ? 'ج.م/س' : 'EGP/hr'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--txt2)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {(privateSessions || []).length > 0 && (
            <div style={{ padding: '11px 20px', borderTop: '1px solid #d4667a20', background: '#d4667a06', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{isRtl ? 'إجمالي البرايفيت' : 'Private Sessions Total'}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#d4667a' }}>{privateHours.toFixed(1)}{h}</span>
            </div>
          )}
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
