'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type AttStatus = 'present' | 'absent' | 'make_up' | null

export default function DailySessionCard({
  session, students, existingAttendance, allCoaches, isRtl, locale,
}: {
  session: any; students: any[]; existingAttendance: any[]
  allCoaches: any[]; isRtl?: boolean; locale?: string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const t  = useTranslations('attendance')
  const tc = useTranslations('common')

  const initial: Record<string, AttStatus> = {}
  existingAttendance.forEach((a: any) => { initial[a.student_id] = a.status })

  const [attendance,      setAttendance]      = useState<Record<string, AttStatus>>(initial)
  const [notes,           setNotes]           = useState<Record<string, string>>({})
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [showReminder,    setShowReminder]    = useState(false)
  const [confirmPayFor,   setConfirmPayFor]   = useState<any>(null)
  const [paying,          setPaying]          = useState(false)
  const [paidStudentIds,  setPaidStudentIds]  = useState<Set<string>>(new Set())
  const [payMethod,       setPayMethod]       = useState<'cash' | 'instapay'>('cash')
  const [selectedCoachId, setSelectedCoachId] = useState<string>(session.coach_id || '')

  useEffect(() => {
    function check() {
      if (session.status === 'completed') { setShowReminder(false); return }
      const endTime = session.class?.end_time
      if (!endTime) return
      const today = new Date().toISOString().split('T')[0]
      if (session.date !== today) return
      const [h, m] = endTime.split(':').map(Number)
      const classEnd = new Date(); classEnd.setHours(h, m, 0, 0)
      const reminderStart = new Date(classEnd.getTime() - 15 * 60 * 1000)
      setShowReminder(new Date() >= reminderStart)
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [session])

  function getActiveSub(student: any) {
    return student.subscriptions?.find((s: any) => s.status === 'active')
  }

  async function handleCoachChange(coachId: string) {
    setSelectedCoachId(coachId)
    await supabase.from('sessions').update({ coach_id: coachId || null }).eq('id', session.id)
  }

  async function save() {
    setSaving(true)
    const entries = Object.entries(attendance).filter(([, v]) => v !== null)
    for (const [studentId, status] of entries) {
      const existing = existingAttendance.find((a: any) => a.student_id === studentId)
      if (existing) {
        await supabase.from('attendance').update({ status }).eq('id', existing.id)
      } else {
        await supabase.from('attendance').insert({ session_id: session.id, student_id: studentId, status })
      }
      const student = students.find((s: any) => s.id === studentId)
      const sub = getActiveSub(student)
      const prevStatus = initial[studentId]
      const sessionCounts = !sub?.start_date || session.date >= sub.start_date
      if (status === 'present' && sub && sub.remaining_sessions > 0 && sessionCounts) {
        if (prevStatus !== 'present') {
          await supabase.from('subscriptions')
            .update({ remaining_sessions: Math.max(0, sub.remaining_sessions - 1) })
            .eq('id', sub.id)
        }
      } else if (status === 'absent' && prevStatus === 'present' && sub && sessionCounts) {
        await supabase.from('subscriptions')
          .update({ remaining_sessions: Math.min(sub.total_sessions, sub.remaining_sessions + 1) })
          .eq('id', sub.id)
      }
    }
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id)
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  function getNextClassDate(classDays: string[], fromDate: Date): string {
    const DAY_MAP: Record<string, number> = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    }
    const fromDow = fromDate.getDay()
    let minAhead = 8
    for (const day of classDays) {
      const targetDow = DAY_MAP[day]
      if (targetDow === undefined) continue
      let ahead = targetDow - fromDow
      if (ahead <= 0) ahead += 7
      minAhead = Math.min(minAhead, ahead)
    }
    const next = new Date(fromDate)
    next.setDate(next.getDate() + (minAhead === 8 ? 1 : minAhead))
    return next.toISOString().split('T')[0]
  }

  async function handlePay(student: any) {
    setPaying(true)
    const sub      = getActiveSub(student)
    const plan     = sub?.plan
    const classDays: string[] = session.class?.days_of_week || []
    const startDate = getNextClassDate(classDays, new Date())
    await supabase.from('payments').insert({
      student_id: student.id, type: 'subscription',
      amount_due: plan?.price ?? 0, amount_paid: plan?.price ?? 0,
      payment_method: payMethod, date: new Date().toISOString().split('T')[0],
    })
    if (sub) await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id)
    await supabase.from('subscriptions').insert({
      student_id: student.id, plan_id: sub?.plan_id ?? null,
      total_sessions: plan?.sessions_count ?? sub?.total_sessions ?? 4,
      remaining_sessions: plan?.sessions_count ?? sub?.total_sessions ?? 4,
      start_date: startDate, status: 'active',
    })
    setPaying(false)
    setConfirmPayFor(null)
    setPaidStudentIds(prev => new Set([...prev, student.id]))
    setPayMethod('cash')
    router.refresh()
  }

  const visibleStudents   = students   // paid students stay in the list
  const presentCount      = Object.values(attendance).filter(v => v === 'present').length
  const absentCount       = Object.values(attendance).filter(v => v === 'absent').length
  const markedCount       = Object.values(attendance).filter(v => v !== null).length

  const payRequiredCount  = visibleStudents.filter((s: any) => {
    if (paidStudentIds.has(s.id)) return false
    const sub = getActiveSub(s)
    const subStarted = !sub?.start_date || session.date >= sub.start_date
    return !!sub && subStarted && sub.remaining_sessions === 0
  }).length

  const statusColor = session.status === 'completed' ? '#3dab7e' : session.status === 'cancelled' ? '#e04040' : '#e8960a'
  const statusLabel = session.status === 'completed'
    ? tc('sessionStatus.completed')
    : session.status === 'cancelled'
    ? tc('sessionStatus.cancelled')
    : tc('sessionStatus.scheduled')

  const th: React.CSSProperties = {
    background: 'var(--bg-page)', color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
    padding: '8px 10px', textAlign: isRtl ? 'right' : 'left',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  }
  const td = (bold = false, color?: string): React.CSSProperties => ({
    padding: '8px 10px', fontSize: 12, borderBottom: '1px solid var(--border)',
    color: color ?? (bold ? 'var(--txt1)' : 'var(--txt2)'),
    fontWeight: bold ? 600 : 400, verticalAlign: 'middle',
  })

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>

      {/* Session header */}
      <div style={{
        background: 'var(--bg-page)', padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--txt1)', fontSize: 13 }}>
            {session.class?.name}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px',
            background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30`,
          }}>
            {statusLabel}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px',
            background: 'var(--bg-page)', color: 'var(--txt2)', border: '1px solid var(--border)',
          }}>
            👥 {students.length} {isRtl ? 'طالبة' : 'students'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--txt2)', fontSize: 11 }}>
          {session.hall?.name && (
            <span style={{ fontWeight: 600 }}>📍 {session.hall.name}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 13 }}>👩‍🏫</span>
            <select
              value={selectedCoachId}
              onChange={e => handleCoachChange(e.target.value)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600,
                color: 'var(--txt1)', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
              }}
            >
              <option value="">{locale === 'ar' ? 'بدون مدربة' : 'No Coach'}</option>
              {allCoaches.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {isRtl ? c.name_ar : (c.name_en || c.name_ar)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reminder banner */}
      {showReminder && session.status !== 'completed' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#e8960a12', borderBottom: '1px solid #e8960a30',
          padding: '8px 16px',
        }}>
          <span style={{ fontSize: 14 }}>⏰</span>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e8960a' }}>
            {locale === 'ar'
              ? 'الحصة على وشك الانتهاء — يرجى تسجيل الحضور'
              : 'Class ending soon — please submit attendance'}
          </p>
        </div>
      )}

      {/* Attendance table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 28 }}>#</th>
              <th style={th}>{locale === 'ar' ? 'اسم البنت' : 'Student'}</th>
              <th style={{ ...th, width: 95, textAlign: 'center' }}>{locale === 'ar' ? 'الرسوم' : 'Monthly Fees'}</th>
              <th style={{ ...th, width: 90, textAlign: 'center' }}>{locale === 'ar' ? 'الحضور' : 'Attendance'}</th>
              <th style={{ ...th, width: 100, textAlign: 'center' }}>{locale === 'ar' ? 'الحصص' : 'Sessions'}</th>
              <th style={{ ...th, width: 120, textAlign: 'center' }}>{locale === 'ar' ? 'حالة الاشتراك' : 'Status'}</th>
              <th style={th}>{locale === 'ar' ? 'ملاحظات' : 'Notes'}</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td(), textAlign: 'center', padding: '20px' }}>
                  {t('noStudents')}
                </td>
              </tr>
            ) : visibleStudents.map((student: any, i: number) => {
              const sub           = getActiveSub(student)
              const status        = attendance[student.id] ?? null
              const remaining     = sub?.remaining_sessions ?? 0
              const total         = sub?.total_sessions ?? 4
              const subStarted    = !sub?.start_date || session.date >= sub.start_date
              const isPending     = !!sub && !subStarted
              const isLocallyPaid = paidStudentIds.has(student.id)
              const isPay         = !isLocallyPaid && !!sub && subStarted && remaining === 0
              const noSub         = !sub

              function fmtDate(d: string) {
                return new Date(d + 'T00:00:00').toLocaleDateString(
                  locale === 'ar' ? 'ar-EG' : 'en-GB',
                  { day: 'numeric', month: 'short' }
                )
              }

              const statusLabel =
                isLocallyPaid ? (locale === 'ar' ? '✓ تم الدفع' : '✓ Paid')
                : isPending   ? (locale === 'ar' ? `يبدأ ${fmtDate(sub!.start_date)}` : `Starts ${fmtDate(sub!.start_date)}`)
                : isPay       ? (locale === 'ar' ? 'مطلوب الدفع' : 'Payment Required')
                : noSub       ? (locale === 'ar' ? 'بدون اشتراك' : 'No Subscription')
                :               (locale === 'ar' ? 'ساري' : 'Active')
              const statusClr = isLocallyPaid ? '#3dab7e' : isPending ? '#4a90d9' : isPay ? '#e04040' : noSub ? '#888' : '#3dab7e'

              const rowBg = isLocallyPaid
                ? '#3dab7e06'
                : isPay       ? '#e8960a08'
                : status === 'absent' ? '#e0404006'
                : i % 2 === 1 ? 'var(--bg-page)' : 'transparent'

              const mf = student.monthly_fees || 0
              const df = student.discounted_monthly_fees
              const hasDiscount = df && df > 0 && df < mf

              return (
                <tr key={student.id} style={{ background: rowBg }}>
                  <td style={{ ...td(), textAlign: 'center', fontSize: 11 }}>{i + 1}</td>

                  <td style={td(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{locale === 'en' && student.name_en ? student.name_en : student.name_ar}</span>
                      {isLocallyPaid && (
                        <span style={{ background: '#3dab7e15', color: '#3dab7e', border: '1px solid #3dab7e30', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          ✓ {locale === 'ar' ? 'مدفوع' : 'Paid'}
                        </span>
                      )}
                      {isPay && (
                        <span style={{ background: '#e8960a15', color: '#e8960a', border: '1px solid #e8960a30', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          💳 {locale === 'ar' ? 'دفع' : 'Pay'}
                        </span>
                      )}
                      {isPending && (
                        <span style={{ background: '#4a90d915', color: '#4a90d9', border: '1px solid #4a90d930', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          🕐 {fmtDate(sub!.start_date)}
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ ...td(), textAlign: 'center' }}>
                    {mf > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: hasDiscount ? '#3dab7e' : 'var(--txt1)' }}>
                          {hasDiscount ? df : mf}
                        </span>
                        {hasDiscount && (
                          <span style={{ background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e30', borderRadius: 20, padding: '1px 6px', fontSize: 9, fontWeight: 700 }}>
                            Promo
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--txt2)', fontSize: 11 }}>—</span>
                    )}
                  </td>

                  <td style={{ ...td(), textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {([
                        { val: 'present' as AttStatus, label: '✓', on: '#3dab7e' },
                        { val: 'absent'  as AttStatus, label: '✗', on: '#e04040' },
                      ]).map(btn => (
                        <button
                          key={btn.val!}
                          onClick={() => setAttendance(a => ({ ...a, [student.id]: a[student.id] === btn.val ? null : btn.val }))}
                          disabled={isPay}
                          style={{
                            background: status === btn.val ? btn.on : 'var(--bg-page)',
                            color: status === btn.val ? '#fff' : 'var(--txt2)',
                            border: `1px solid ${status === btn.val ? btn.on : 'var(--border)'}`,
                            borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                            cursor: isPay ? 'not-allowed' : 'pointer',
                            opacity: isPay ? 0.35 : 1, fontFamily: 'inherit',
                          }}
                        >{btn.label}</button>
                      ))}
                    </div>
                  </td>

                  <td style={{ ...td(), textAlign: 'center' }}>
                    {sub && subStarted ? (
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                        {Array.from({ length: Math.min(total, 8) }).map((_, j) => (
                          <div key={j} style={{ width: 10, height: 6, borderRadius: 2, background: j < remaining ? '#d4667a' : 'var(--border)' }} />
                        ))}
                        <span style={{ fontSize: 10, fontWeight: 700, color: remaining === 0 ? '#e04040' : 'var(--txt1)', marginInlineStart: 4 }}>
                          {remaining}/{total}
                        </span>
                      </div>
                    ) : sub && isPending ? (
                      <span style={{ fontSize: 10, color: '#4a90d9', fontWeight: 600 }}>
                        {total} {locale === 'ar' ? 'حصص' : 'sessions'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--txt2)', fontSize: 11 }}>—</span>
                    )}
                  </td>

                  <td style={{ ...td(), textAlign: 'center' }}>
                    {isPay ? (
                      <button
                        onClick={() => { setPayMethod('cash'); setConfirmPayFor(student) }}
                        style={{
                          background: '#d4667a', color: '#fff', border: 'none',
                          borderRadius: 6, padding: '4px 14px', fontSize: 11,
                          fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                        }}
                      >
                        {locale === 'ar' ? '💳 دفع' : '💳 Pay'}
                      </button>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px',
                        background: statusClr + '18', color: statusClr, border: `1px solid ${statusClr}30`,
                        whiteSpace: 'nowrap',
                      }}>
                        {statusLabel}
                      </span>
                    )}
                  </td>

                  <td style={td()}>
                    <input
                      type="text"
                      value={notes[student.id] || ''}
                      onChange={e => setNotes(n => ({ ...n, [student.id]: e.target.value }))}
                      placeholder={locale === 'ar' ? 'ملاحظة...' : 'Note...'}
                      style={{
                        width: '100%', border: '1px solid var(--border)', borderRadius: 6,
                        padding: '4px 8px', fontSize: 11, background: 'var(--bg-page)',
                        color: 'var(--txt1)', fontFamily: 'inherit',
                        direction: isRtl ? 'rtl' : 'ltr', outline: 'none',
                      }}
                    />
                  </td>
                </tr>
              )
            })}

            {/* Group footer */}
            <tr style={{ background: 'var(--bg-page)' }}>
              <td colSpan={3} style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3dab7e', background: '#3dab7e14', border: '1px solid #3dab7e28', borderRadius: 20, padding: '2px 10px' }}>
                    ✓ {presentCount} {isRtl ? 'حاضر' : 'present'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#e04040', background: '#e0404014', border: '1px solid #e0404028', borderRadius: 20, padding: '2px 10px' }}>
                    ✗ {absentCount} {isRtl ? 'غائب' : 'absent'}
                  </span>
                  {payRequiredCount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#e8960a', background: '#e8960a14', border: '1px solid #e8960a28', borderRadius: 20, padding: '2px 10px' }}>
                      💳 {payRequiredCount} {isRtl ? 'مطلوب دفع' : 'pay req.'}
                    </span>
                  )}
                  {visibleStudents.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--txt2)' }}>
                      {markedCount}/{visibleStudents.length} {isRtl ? 'مسجل' : 'marked'}
                    </span>
                  )}
                </div>
              </td>
              <td colSpan={4} style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', textAlign: isRtl ? 'left' : 'right' }}>
                <button
                  onClick={save}
                  disabled={saving || saved || markedCount === 0}
                  style={{
                    background: saved ? '#3dab7e' : '#d4667a', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '7px 20px', fontSize: 12, fontWeight: 700,
                    cursor: saving || saved || markedCount === 0 ? 'default' : 'pointer',
                    opacity: markedCount === 0 ? 0.4 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {saving ? t('saving') : saved ? t('saved') : t('saveAttendance')}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pay confirmation modal */}
      {confirmPayFor && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setConfirmPayFor(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{
            background: 'var(--bg-popup)', border: '1px solid var(--border)',
            borderRadius: 16, width: '100%', maxWidth: 420,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            direction: isRtl ? 'rtl' : 'ltr',
          }}>
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, marginBottom: 12, background: '#d4667a18', border: '1px solid #d4667a30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                💳
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--txt1)' }}>
                {locale === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)' }}>
                {locale === 'ar'
                  ? `تأكيد دفع ${confirmPayFor.name_ar || confirmPayFor.name_en} رسوم الاشتراك`
                  : `Confirm that ${confirmPayFor.name_en || confirmPayFor.name_ar} has paid the subscription fee`}
              </p>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {getActiveSub(confirmPayFor)?.plan && (
                <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--txt2)', fontWeight: 500 }}>
                    {locale === 'ar' ? 'الخطة' : 'Plan'}: {getActiveSub(confirmPayFor).plan.name}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#3dab7e' }}>
                    {getActiveSub(confirmPayFor).plan.price} {locale === 'ar' ? 'جنيه' : 'EGP'}
                  </span>
                </div>
              )}
              {/* Payment method selector */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(['cash', 'instapay'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${payMethod === m ? '#d4667a' : 'var(--border)'}`,
                      background: payMethod === m ? '#d4667a18' : 'var(--bg-page)',
                      color: payMethod === m ? '#d4667a' : 'var(--txt2)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {m === 'cash' ? (locale === 'ar' ? '💵 كاش' : '💵 Cash') : '📱 Instapay'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => handlePay(confirmPayFor)}
                disabled={paying}
                style={{
                  background: '#d4667a', border: 'none', borderRadius: 10,
                  padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {paying ? '…' : (locale === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment')}
              </button>
              <button
                onClick={() => setConfirmPayFor(null)}
                disabled={paying}
                style={{
                  background: 'var(--bg-page)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '9px 18px', color: 'var(--txt2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
