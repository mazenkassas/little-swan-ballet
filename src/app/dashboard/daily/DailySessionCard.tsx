'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import {
  computeSubscriptionStartDate,
  computeDeduction,
  sessionCountsForStudent,
  isStudentOnHoliday,
  getActiveSubForClass,
} from '@/lib/subscriptionLogic'

type AttStatus = 'present' | 'absent' | 'make_up' | null

export default function DailySessionCard({
  session, students, existingAttendance, makeupStudents, allStudents, allCoaches, isRtl, locale, activeHoliday, today,
}: {
  session: any; students: any[]; existingAttendance: any[]
  makeupStudents?: any[]; allStudents?: any[]
  allCoaches: any[]; isRtl?: boolean; locale?: string
  activeHoliday?: { name: string; student_ids: string[] | null } | null
  today: string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const t  = useTranslations('attendance')
  const tc = useTranslations('common')

  const initial: Record<string, AttStatus> = {}
  existingAttendance.filter((a: any) => a.status !== 'make_up').forEach((a: any) => { initial[a.student_id] = a.status })

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
  const [saveStatus,       setSaveStatus]       = useState<{ allowed: boolean; reason: string }>({ allowed: false, reason: '' })
  const [attendanceOpen,   setAttendanceOpen]   = useState(true)
  const [makeups,             setMakeups]             = useState<any[]>(makeupStudents || [])
  const [showMakeupAdd,       setShowMakeupAdd]       = useState(false)
  const [makeupSearch,        setMakeupSearch]        = useState('')
  const [makeupSearchOpen,    setMakeupSearchOpen]    = useState(false)
  const [selectedMakeupStud,  setSelectedMakeupStud]  = useState<any>(null)
  const [makeupOriginalClass, setMakeupOriginalClass] = useState('')
  const [fetchingMakeupClass, setFetchingMakeupClass] = useState(false)
  const [addingMakeup,        setAddingMakeup]        = useState(false)
  const [open, setOpen] = useState(session.status !== 'completed')

  useEffect(() => {
    function checkReminder() {
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

    function checkSaveStatus() {
      const today = new Date().toISOString().split('T')[0]
      if (session.date !== today) {
        setSaveStatus({ allowed: false, reason: locale === 'ar' ? 'يمكن تسجيل الحضور فقط في يوم الحصة' : "Attendance can only be saved on the session's day" })
        return
      }
      const startTime = session.class?.start_time
      const endTime   = session.class?.end_time
      if (!startTime || !endTime) { setSaveStatus({ allowed: true, reason: '' }); return }
      const now = new Date()
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const classStart = new Date(); classStart.setHours(sh, sm, 0, 0)
      const classEnd   = new Date(); classEnd.setHours(eh, em, 0, 0)
      const graceEnd   = new Date(classEnd.getTime() + 30 * 60 * 1000)
      if (now < classStart) {
        setSaveStatus({ allowed: false, reason: locale === 'ar' ? `الحصة تبدأ الساعة ${fmt12(startTime)}` : `Class starts at ${fmt12(startTime)}` })
      } else if (now > graceEnd) {
        setSaveStatus({ allowed: false, reason: locale === 'ar' ? 'انتهى وقت تسجيل الحضور' : 'Attendance window has closed' })
      } else {
        setSaveStatus({ allowed: true, reason: '' })
      }
    }

    function checkAttendanceOpen() {
      const today = new Date().toISOString().split('T')[0]
      if (session.date !== today) { setAttendanceOpen(false); return }
      const startTime = session.class?.start_time
      if (!startTime) { setAttendanceOpen(true); return }
      const [sh, sm] = startTime.split(':').map(Number)
      const classStart = new Date(); classStart.setHours(sh, sm, 0, 0)
      setAttendanceOpen(new Date() >= classStart)
    }

    checkReminder()
    checkSaveStatus()
    checkAttendanceOpen()
    const id = setInterval(() => { checkReminder(); checkSaveStatus(); checkAttendanceOpen() }, 60_000)
    return () => clearInterval(id)
  }, [session, locale])

  function fmt12(time: string, arabic = false) {
    const [h, m] = time.split(':').map(Number)
    const h12 = h % 12 || 12
    const suffix = arabic ? (h < 12 ? 'ص' : 'م') : (h < 12 ? 'AM' : 'PM')
    return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
  }

  function getActiveSub(student: any) {
    return getActiveSubForClass(student.subscriptions, session.class_id)
  }

  const enrolledIds = new Set(students.map((s: any) => s.id))
  const makeupIds   = new Set(makeups.map((m: any) => m.id))
  const baseMakeupStudents = (allStudents || []).filter(
    (s: any) => !enrolledIds.has(s.id) && !makeupIds.has(s.id)
  )
  const filteredMakeupStudents = makeupSearch
    ? baseMakeupStudents.filter((s: any) => {
        const q = makeupSearch.toLowerCase()
        return (s.name_ar || '').includes(makeupSearch) || (s.name_en || '').toLowerCase().includes(q)
      })
    : baseMakeupStudents

  async function selectMakeupStudent(student: any) {
    setSelectedMakeupStud(student)
    setMakeupSearch(locale === 'en' && student.name_en ? student.name_en : student.name_ar)
    setMakeupSearchOpen(false)
    setFetchingMakeupClass(true)
    const { data } = await supabase
      .from('class_students')
      .select('class:classes(id, name)')
      .eq('student_id', student.id)
      .limit(1)
      .maybeSingle()
    setMakeupOriginalClass((data as any)?.class?.name || '')
    setFetchingMakeupClass(false)
  }

  async function addMakeup() {
    if (!selectedMakeupStud) return
    setAddingMakeup(true)
    const { data: att } = await supabase.from('attendance').insert({
      session_id: session.id, student_id: selectedMakeupStud.id, status: 'make_up',
    }).select('id').single()
    if (att) {
      setMakeups(prev => [...prev, {
        id: selectedMakeupStud.id,
        name_ar: selectedMakeupStud.name_ar,
        name_en: selectedMakeupStud.name_en,
        attendanceId: att.id,
        originalClass: makeupOriginalClass ? { name: makeupOriginalClass } : null,
      }])
    }
    setMakeupSearch('')
    setSelectedMakeupStud(null)
    setMakeupOriginalClass('')
    setShowMakeupAdd(false)
    setAddingMakeup(false)
  }

  async function removeMakeup(attendanceId: string) {
    await supabase.from('attendance').delete().eq('id', attendanceId)
    setMakeups(prev => prev.filter((m: any) => m.attendanceId !== attendanceId))
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
      const counts = sessionCountsForStudent({
        holiday: activeHoliday,
        studentId,
        subStartDate: sub?.start_date,
        sessionDate: session.date,
      })
      const { shouldDeduct, newRemaining, nextCycleStart } = computeDeduction({
        status,
        prevStatus,
        remainingSessions: sub?.remaining_sessions ?? 0,
        totalSessions: sub?.total_sessions ?? 4,
        sessionCounts: counts,
        classDays: session.class?.days_of_week || [],
        sessionDate: session.date,
      })
      if (shouldDeduct && sub) {
        const updates: Record<string, any> = { remaining_sessions: newRemaining }
        if (nextCycleStart) updates.next_cycle_start = nextCycleStart
        await supabase.from('subscriptions').update(updates).eq('id', sub.id)
      }
    }
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id)
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  function getSubscriptionStartDate(student: any): string {
    const sub = getActiveSub(student)
    const classDays: string[] = session.class?.days_of_week || []
    return computeSubscriptionStartDate(sub, classDays, new Date())
  }

  async function handlePay(student: any) {
    setPaying(true)
    const sub       = getActiveSub(student)
    const plan      = sub?.plan
    const startDate = getSubscriptionStartDate(student)
    await supabase.from('payments').insert({
      student_id: student.id, type: 'subscription',
      amount_due: plan?.price ?? 0, amount_paid: plan?.price ?? 0,
      payment_method: payMethod, date: new Date().toISOString().split('T')[0],
    })
    if (sub) await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id)
    await supabase.from('subscriptions').insert({
      student_id: student.id,
      class_id: session.class_id,
      plan_id: sub?.plan_id ?? null,
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

  const DAY_ABBREVS = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  const TIME_SEG_RE = /^\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s*[–\-]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)$/i
  const displayName = (session.class?.name || '')
    .split(/\s*·\s*/)
    .filter((p: string) => !DAY_ABBREVS.has(p.trim()) && !TIME_SEG_RE.test(p.trim()))
    .join(' · ')

  const statusColor = session.status === 'completed' ? '#3dab7e' : session.status === 'cancelled' ? '#e04040' : '#e8960a'
  const statusLabel = session.status === 'completed'
    ? tc('sessionStatus.completed')
    : session.status === 'cancelled'
    ? tc('sessionStatus.cancelled')
    : tc('sessionStatus.scheduled')

  const th: React.CSSProperties = {
    background: 'var(--bg-page)', color: 'var(--txt2)', fontSize: 11, fontWeight: 700,
    padding: '8px 10px', textAlign: isRtl ? 'right' : 'left',
    borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', letterSpacing: '0.02em',
  }
  const td = (bold = false, color?: string): React.CSSProperties => ({
    padding: '8px 10px', fontSize: 12, borderBottom: '1px solid var(--border)',
    color: color ?? (bold ? 'var(--txt1)' : 'var(--txt2)'),
    fontWeight: bold ? 600 : 400, verticalAlign: 'middle',
  })

  return (
    <div id={`session-${session.id}`} style={{
      background: 'var(--bg-card)',
      border: `1px solid ${saveStatus.allowed ? '#d4667a40' : 'var(--border)'}`,
      borderRadius: 14,
      boxShadow: saveStatus.allowed ? '0 4px 20px rgba(212,102,122,0.10)' : '0 1px 3px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>

      {/* ── Collapsible header ─────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', border: 'none', cursor: 'pointer',
          background: saveStatus.allowed ? '#fdf0f2' : 'transparent',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: 16,
          textAlign: isRtl ? 'right' : 'left',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        {/* Time rail */}
        {session.class?.start_time && (
          <div style={{ width: 66, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 14, direction: 'ltr' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>
              {fmt12(session.class.start_time)}
            </p>
            {session.class?.end_time && (
              <p style={{ fontSize: 10, color: 'var(--txt2)', margin: '2px 0 0' }}>
                to {fmt12(session.class.end_time)}
              </p>
            )}
          </div>
        )}

        {/* Group info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{displayName}</p>
            {session.class?.level?.name && (
              <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 20, padding: '2px 8px', background: '#4a90d918', color: '#4a90d9', border: '1px solid #4a90d928', whiteSpace: 'nowrap' }}>
                {session.class.level.name}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 9px', background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30`, whiteSpace: 'nowrap' }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--txt2)' }}>
            <span onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13 }}>👩‍🏫</span>
              <select
                value={selectedCoachId}
                onChange={e => { e.stopPropagation(); handleCoachChange(e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', fontSize: 11, color: 'var(--txt1)', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
              >
                <option value="">{locale === 'ar' ? 'بدون مدربة' : 'No Coach'}</option>
                {allCoaches.map((c: any) => (
                  <option key={c.id} value={c.id}>{isRtl ? c.name_ar : (c.name_en || c.name_ar)}</option>
                ))}
              </select>
            </span>
            {session.hall?.name && <span>📍 {session.hall.name}</span>}
            <span>👥 {students.length} {isRtl ? 'طالبة' : 'students'}</span>
            {makeups.length > 0 && (
              <span style={{ color: '#e8960a', fontWeight: 600 }}>🔄 {makeups.length} {isRtl ? 'تعويض' : 'makeup'}</span>
            )}
          </div>
        </div>

        {/* Mini attendance bar */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '0 0 4px', fontWeight: 600 }}>
            {locale === 'ar' ? 'الحضور' : 'Attendance'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {markedCount > 0
              ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt1)' }}>{markedCount}/{visibleStudents.length}</span>
              : <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{locale === 'ar' ? 'لم يبدأ' : 'Not started'}</span>}
            <div style={{ width: 48, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ width: `${visibleStudents.length > 0 ? (markedCount / visibleStudents.length) * 100 : 0}%`, height: '100%', background: '#d4667a', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        <ChevronDown
          size={15}
          color="var(--txt2)"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' } as React.CSSProperties}
        />
      </button>

      {/* ── Collapsible body ────────────────────────────────── */}
      {open && (
        <div>
          {/* Holiday banner */}
          {activeHoliday && !activeHoliday.student_ids?.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3dab7e10', borderBottom: '1px solid #3dab7e30', padding: '7px 16px' }}>
              <span style={{ fontSize: 14 }}>🎌</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#3dab7e' }}>
                {locale === 'ar'
                  ? `إجازة رسمية: ${activeHoliday.name} — لن يتم خصم حصص من أي طالبة`
                  : `Academy Holiday: ${activeHoliday.name} — no sessions deducted from any student`}
              </p>
            </div>
          )}

          {/* Reminder banner */}
          {showReminder && session.status !== 'completed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#e8960a12', borderBottom: '1px solid #e8960a30', padding: '8px 16px' }}>
              <span style={{ fontSize: 14 }}>⏰</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e8960a' }}>
                {locale === 'ar' ? 'الحصة على وشك الانتهاء — يرجى تسجيل الحضور' : 'Class ending soon — please submit attendance'}
              </p>
            </div>
          )}

          {/* Attendance table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>{locale === 'ar' ? 'الطالبة' : 'Student'}</th>
                  <th style={{ ...th, width: 80,  textAlign: 'center' }}>{locale === 'ar' ? 'الرسوم'       : 'Fees'}</th>
                  <th style={{ ...th, width: 110, textAlign: 'center' }}>{locale === 'ar' ? 'الحصص'        : 'Sessions'}</th>
                  <th style={{ ...th, width: 90,  textAlign: 'center' }}>{locale === 'ar' ? 'الانتهاء'     : 'Due Date'}</th>
                  <th style={{ ...th, width: 90,  textAlign: 'center' }}>{locale === 'ar' ? 'تاريخ الدفع'  : 'Pay Date'}</th>
                  <th style={{ ...th, width: 120, textAlign: 'center' }}>{locale === 'ar' ? 'الاشتراك'     : 'Status'}</th>
                  <th style={{ ...th, width: 120, textAlign: 'center' }}>{locale === 'ar' ? 'الحضور'       : 'Attendance'}</th>
                  <th style={{ ...th, minWidth: 110 }}>{locale === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                  <th style={{ ...th, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.length === 0 && makeups.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...td(), textAlign: 'center', padding: '24px' }}>{t('noStudents')}</td></tr>
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
                    return new Date(d + 'T00:00:00').toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })
                  }

                  const statusLabel =
                    isLocallyPaid ? (locale === 'ar' ? '✓ تم الدفع' : '✓ Paid')
                    : isPending   ? (locale === 'ar' ? `يبدأ ${fmtDate(sub!.start_date)}` : `Starts ${fmtDate(sub!.start_date)}`)
                    : isPay       ? (locale === 'ar' ? 'مطلوب الدفع' : 'Payment Required')
                    : noSub       ? (locale === 'ar' ? 'بدون اشتراك' : 'No Subscription')
                    :               (locale === 'ar' ? 'ساري' : 'Active')
                  const statusClr = isLocallyPaid ? '#3dab7e' : isPending ? '#4a90d9' : isPay ? '#e04040' : noSub ? '#888' : '#3dab7e'

                  const studentOnHoliday = isStudentOnHoliday(activeHoliday, student.id)
                  const rowAccent = studentOnHoliday ? '#3dab7e' : status === 'present' ? '#3dab7e' : status === 'absent' ? '#e04040' : 'transparent'
                  const rowBg = studentOnHoliday ? '#3dab7e05' : isLocallyPaid ? '#3dab7e06' : isPay ? '#e8960a08' : status === 'absent' ? '#e0404005' : status === 'present' ? '#3dab7e05' : i % 2 === 1 ? 'var(--bg-page)' : 'transparent'
                  const mf = student.monthly_fees || 0
                  const df = student.discounted_monthly_fees
                  const hasDiscount = df && df > 0 && df < mf
                  const initial = (student.name_ar || student.name_en || '').charAt(0)

                  return (
                    <tr key={student.id} style={{ background: rowBg, borderLeft: `3px solid ${rowAccent}` }}>
                      {/* Student */}
                      <td style={{ ...td(true), paddingInlineStart: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: '#d4667a15', border: '1px solid #d4667a25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#d4667a' }}>
                            {initial}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--txt1)' }}>
                                {locale === 'en' && student.name_en ? student.name_en : student.name_ar}
                              </p>
                              {activeHoliday && activeHoliday.student_ids?.length && activeHoliday.student_ids.includes(student.id) && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e30', whiteSpace: 'nowrap', lineHeight: 1.6 }}>
                                  🎌 {locale === 'ar' ? 'إجازة' : 'Holiday'}
                                </span>
                              )}
                            </div>
                            {isPending && (
                              <p style={{ margin: '1px 0 0', fontSize: 10, color: '#4a90d9', fontWeight: 600 }}>🕐 {fmtDate(sub!.start_date)}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fees */}
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {mf > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: hasDiscount ? '#3dab7e' : 'var(--txt1)' }}>{hasDiscount ? df : mf}</span>
                            {hasDiscount && <span style={{ fontSize: 9, fontWeight: 700, color: '#3dab7e' }}>Promo</span>}
                          </div>
                        ) : <span style={{ color: 'var(--txt2)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Sessions bar */}
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {sub && subStarted ? (
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
                            {Array.from({ length: Math.min(total, 8) }).map((_, j) => (
                              <div key={j} style={{ width: 10, height: 6, borderRadius: 2, background: j < remaining ? (remaining <= 1 ? '#e8960a' : '#d4667a') : 'var(--border)' }} />
                            ))}
                            <span style={{ fontSize: 10, fontWeight: 700, color: remaining === 0 ? '#e04040' : 'var(--txt1)', marginInlineStart: 4 }}>{remaining}/{total}</span>
                          </div>
                        ) : sub && isPending ? (
                          <span style={{ fontSize: 10, color: '#4a90d9', fontWeight: 600 }}>{total} {locale === 'ar' ? 'حصص' : 'sess.'}</span>
                        ) : <span style={{ color: 'var(--txt2)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Due Date */}
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {sub?.end_date ? (() => {
                          const expired = sub.end_date < today
                          const in7 = new Date(today); in7.setDate(in7.getDate() + 7)
                          const soon = !expired && sub.end_date <= in7.toISOString().split('T')[0]
                          const clr = expired ? '#e04040' : soon ? '#e8960a' : '#4a90d9'
                          return (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: `${clr}18`, color: clr, border: `1px solid ${clr}28`, whiteSpace: 'nowrap' }}>
                              {sub.end_date}
                            </span>
                          )
                        })() : <span style={{ color: 'var(--txt2)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Pay Date */}
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {(sub as any)?.payment?.date
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: '#4a90d9', whiteSpace: 'nowrap' }}>{(sub as any).payment.date}</span>
                          : <span style={{ color: 'var(--txt2)', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Status */}
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px', background: statusClr + '18', color: statusClr, border: `1px solid ${statusClr}30`, whiteSpace: 'nowrap' }}>
                          {statusLabel}
                        </span>
                      </td>

                      {/* Attendance segmented toggle */}
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {studentOnHoliday ? (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#3dab7e18', color: '#3dab7e', border: '1px solid #3dab7e30' }}>
                            🎌 {locale === 'ar' ? 'إجازة' : 'Holiday'}
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', background: 'var(--bg-page)', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
                            {([
                              { val: 'present' as AttStatus, label: '✓', color: '#3dab7e' },
                              { val: 'absent'  as AttStatus, label: '✗', color: '#e04040' },
                            ]).map(btn => {
                              const btnDisabled = isPay || !attendanceOpen
                              const sel = status === btn.val
                              return (
                                <button
                                  key={btn.val!}
                                  onClick={() => setAttendance(a => ({ ...a, [student.id]: a[student.id] === btn.val ? null : btn.val }))}
                                  disabled={btnDisabled}
                                  title={!attendanceOpen && session.class?.start_time ? (locale === 'ar' ? `تبدأ الحصة ${fmt12(session.class.start_time)}` : `Class starts at ${fmt12(session.class.start_time)}`) : undefined}
                                  style={{
                                    background: sel ? btn.color : 'transparent',
                                    color: sel ? '#fff' : 'var(--txt2)',
                                    border: 'none', borderRadius: 6,
                                    padding: '4px 12px', fontSize: 12, fontWeight: 700,
                                    cursor: btnDisabled ? 'not-allowed' : 'pointer',
                                    opacity: btnDisabled ? 0.3 : 1,
                                    transition: 'background 0.15s, color 0.15s',
                                    minWidth: 32, fontFamily: 'inherit',
                                  }}
                                >{btn.label}</button>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      {/* Notes */}
                      <td style={td()}>
                        <input
                          type="text" value={notes[student.id] || ''}
                          onChange={e => setNotes(n => ({ ...n, [student.id]: e.target.value }))}
                          placeholder={locale === 'ar' ? 'ملاحظة...' : 'Note...'}
                          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, background: 'var(--bg-page)', color: 'var(--txt1)', fontFamily: 'inherit', direction: isRtl ? 'rtl' : 'ltr', outline: 'none' }}
                        />
                      </td>

                      {/* Pay action */}
                      <td style={{ ...td(), textAlign: 'center' }}>
                        {isPay && (
                          <button
                            onClick={() => { setPayMethod('cash'); setConfirmPayFor(student) }}
                            style={{ background: '#d4667a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                          >
                            {locale === 'ar' ? '💳 دفع' : '💳 Pay'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {/* Makeup rows inline */}
                {makeups.map((m: any) => {
                  const mkName = locale === 'en' && m.name_en ? m.name_en : m.name_ar
                  const mkInitial = (mkName || '').charAt(0)
                  return (
                    <tr key={m.attendanceId} style={{ background: '#fff8e640', borderTop: '1px dashed #e8960a40' }}>
                      <td style={{ ...td(true), paddingInlineStart: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: '#e8960a15', border: '1px solid #e8960a25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#e8960a' }}>
                            {mkInitial}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--txt1)' }}>{mkName}</p>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: '#e8960a18', color: '#e8960a', border: '1px solid #e8960a30', whiteSpace: 'nowrap' }}>
                                🔄 {locale === 'ar' ? 'تعويض' : 'Make-up'}
                              </span>
                            </div>
                            {m.originalClass?.name && (
                              <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--txt2)' }}>
                                {locale === 'ar' ? 'من' : 'From'} {m.originalClass.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td colSpan={5} style={{ ...td(), fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic' }}>
                        {locale === 'ar' ? 'زائرة من جروب آخر' : 'Visiting from another group'}
                      </td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#e8960a18', color: '#e8960a', border: '1px solid #e8960a30', whiteSpace: 'nowrap' }}>
                          🔄 {locale === 'ar' ? 'تعويض' : 'Make-up'}
                        </span>
                      </td>
                      <td style={td()}><span style={{ color: 'var(--txt2)', fontSize: 11 }}>—</span></td>
                      <td style={{ ...td(), textAlign: 'center' }}>
                        <button
                          onClick={() => removeMakeup(m.attendanceId)}
                          style={{ background: 'none', border: 'none', color: '#e04040', cursor: 'pointer', fontSize: 16, fontWeight: 700, padding: '1px 6px', fontFamily: 'inherit' }}
                        >×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 12, borderTop: '2px solid var(--border)', flexWrap: 'wrap' }}>
            {/* Left: stats + makeup */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {presentCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#3dab7e', background: '#3dab7e14', border: '1px solid #3dab7e28', borderRadius: 20, padding: '3px 10px' }}>✓ {presentCount}</span>}
              {absentCount > 0  && <span style={{ fontSize: 11, fontWeight: 700, color: '#e04040', background: '#e0404014', border: '1px solid #e0404028', borderRadius: 20, padding: '3px 10px' }}>✗ {absentCount}</span>}
              {payRequiredCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#e8960a', background: '#e8960a14', border: '1px solid #e8960a28', borderRadius: 20, padding: '3px 10px' }}>💳 {payRequiredCount}</span>}
              <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{markedCount}/{visibleStudents.length} {isRtl ? 'مسجّل' : 'marked'}</span>

              {!showMakeupAdd ? (
                <button
                  onClick={() => { setShowMakeupAdd(true); setMakeupSearch(''); setSelectedMakeupStud(null); setMakeupOriginalClass('') }}
                  disabled={!attendanceOpen}
                  title={!attendanceOpen && session.class?.start_time ? (locale === 'ar' ? `تبدأ الحصة ${fmt12(session.class.start_time)}` : `Class starts at ${fmt12(session.class.start_time)}`) : undefined}
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: attendanceOpen ? 'pointer' : 'not-allowed', color: 'var(--txt2)', opacity: attendanceOpen ? 1 : 0.5, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  + {locale === 'ar' ? 'إضافة تعويض' : 'Add makeup'}
                </button>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff8e6', border: '1px solid #e8960a40', borderRadius: 8, padding: '5px 8px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#e8960a' }}>🔄</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text" value={makeupSearch}
                      onChange={e => { setMakeupSearch(e.target.value); setSelectedMakeupStud(null); setMakeupOriginalClass('') }}
                      onFocus={() => setMakeupSearchOpen(true)}
                      onBlur={() => setTimeout(() => setMakeupSearchOpen(false), 150)}
                      placeholder={locale === 'ar' ? 'ابحثي...' : 'Search student...'}
                      style={{ background: '#fff', border: '1px solid #e8960a50', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--txt1)', fontFamily: 'inherit', outline: 'none', minWidth: 150 }}
                    />
                    {makeupSearchOpen && filteredMakeupStudents.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--bg-popup)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 2, maxHeight: 180, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                        {filteredMakeupStudents.map((s: any) => (
                          <div key={s.id} onMouseDown={() => selectMakeupStudent(s)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--txt1)', borderBottom: '1px solid var(--border)' }}>
                            {locale === 'en' && s.name_en ? s.name_en : s.name_ar}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={addMakeup} disabled={!selectedMakeupStud || addingMakeup}
                    style={{ background: '#e8960a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: !selectedMakeupStud || addingMakeup ? 'not-allowed' : 'pointer', opacity: !selectedMakeupStud || addingMakeup ? 0.6 : 1, fontFamily: 'inherit' }}
                  >
                    {addingMakeup ? '…' : (locale === 'ar' ? 'إضافة' : 'Add')}
                  </button>
                  <button
                    onClick={() => { setShowMakeupAdd(false); setMakeupSearch(''); setSelectedMakeupStud(null); setMakeupOriginalClass('') }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--txt2)', cursor: 'pointer', fontSize: 16, padding: '2px 4px', fontFamily: 'inherit' }}
                  >×</button>
                </div>
              )}
            </div>

            {/* Right: save button */}
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: isRtl ? 'flex-start' : 'flex-end', gap: 4 }}>
              <button
                onClick={save}
                disabled={saving || saved || markedCount === 0 || !saveStatus.allowed}
                style={{ background: saved ? '#3dab7e' : '#d4667a', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 28px', fontSize: 13, fontWeight: 700, cursor: saving || saved || markedCount === 0 || !saveStatus.allowed ? 'default' : 'pointer', opacity: markedCount === 0 || !saveStatus.allowed ? 0.4 : 1, fontFamily: 'inherit', transition: 'opacity 0.15s', boxShadow: saved || markedCount === 0 || !saveStatus.allowed ? 'none' : '0 2px 8px #d4667a40' }}
              >
                {saving ? t('saving') : saved ? t('saved') : t('saveAttendance')}
              </button>
              {!saved && !saveStatus.allowed && saveStatus.reason && (
                <p style={{ margin: 0, fontSize: 10, color: '#e8960a', fontWeight: 500 }}>⚠ {saveStatus.reason}</p>
              )}
            </div>
          </div>
        </div>
      )}

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
              {/* Subscription start date — highlights backdating for late payments */}
              {(() => {
                const startDate = getSubscriptionStartDate(confirmPayFor)
                const sub = getActiveSub(confirmPayFor)
                const isBackdated = !!sub?.next_cycle_start
                return (
                  <div style={{ background: isBackdated ? '#e8960a0a' : 'var(--bg-page)', border: `1px solid ${isBackdated ? '#e8960a35' : 'var(--border)'}`, borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 500 }}>
                      {locale === 'ar' ? 'يبدأ الاشتراك من' : 'Subscription starts'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isBackdated && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#e8960a', background: '#e8960a14', border: '1px solid #e8960a28', borderRadius: 20, padding: '1px 6px' }}>
                          {locale === 'ar' ? 'مؤرخ' : 'Backdated'}
                        </span>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: isBackdated ? '#e8960a' : '#4a90d9' }}>
                        {new Date(startDate + 'T00:00:00').toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )
              })()}
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
