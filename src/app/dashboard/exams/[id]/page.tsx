import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getLocale, getTranslations } from 'next-intl/server'
import { BookOpen } from 'lucide-react'
import BackButton from '@/components/layout/BackButton'
import ExamResultsForm from './ExamResultsForm'
import ExamDetailActions from './ExamDetailActions'

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const t        = await getTranslations('exams')
  const supabase = await createClient()

  const { data: exam } = await supabase
    .from('exams')
    .select('*, grade:grades(*), term:terms(*)')
    .eq('id', id)
    .single()

  if (!exam) notFound()

  // Fetch exam_targets (new multi-level system)
  const { data: targets } = await supabase
    .from('exam_targets')
    .select('grade_id, term_id, grade:grades(id, name), term:terms(id, name)')
    .eq('exam_id', id)

  // Fetch all active students with their grade+term info
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, name_ar, name_en, grade_id, term_id, grade:grades(id, name), term:terms(id, name)')
    .eq('status', 'active')

  // Filter students based on targets (new system) or legacy grade_id/term_id
  let students: any[]
  if (targets && targets.length > 0) {
    students = (allStudents ?? []).filter(s =>
      targets.some(tgt =>
        tgt.grade_id === s.grade_id && tgt.term_id === s.term_id
      )
    )
  } else if (exam.grade_id || exam.term_id) {
    // Legacy: single grade+term stored on exam row
    students = (allStudents ?? []).filter(s =>
      (!exam.grade_id || s.grade_id === exam.grade_id) &&
      (!exam.term_id  || s.term_id  === exam.term_id)
    )
  } else {
    students = allStudents ?? []
  }

  const CLASS_FIELDS = 'id, name, days_of_week, start_time, end_time, grade:grades(id, name, order_num), term:terms(id, name, order_num)'
  const studentIds = students.map(s => s.id)
  const [{ data: existing }, { data: enrolments }, { data: allClasses }] = await Promise.all([
    supabase.from('student_exams').select('*').eq('exam_id', id),
    studentIds.length
      ? supabase.from('class_students').select(`student_id, class:classes(${CLASS_FIELDS}, is_active)`).in('student_id', studentIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('classes').select(CLASS_FIELDS).eq('is_active', true).order('name'),
  ])

  // Each student's current (active) classes, for the class line and the transfer popup
  const classesByStudent: Record<string, any[]> = {}
  for (const e of enrolments || []) {
    const c = Array.isArray(e.class) ? e.class[0] : e.class
    if (!c || c.is_active === false) continue
    ;(classesByStudent[e.student_id] ||= []).push(c)
  }

  const recorded = (existing ?? []).filter(r => r.result && r.result !== 'pending')
  const passed  = recorded.filter(r => r.result === 'pass').length
  const failed  = recorded.filter(r => r.result === 'fail').length
  const other   = recorded.length - passed - failed

  // Show grouped view when multiple targets (or all levels)
  const isGrouped = !targets || targets.length !== 1

  // Target label for header
  const targetLabel = targets && targets.length === 1
    ? [(targets[0] as any).grade?.name, (targets[0] as any).term?.name].filter(Boolean).join(' ')
    : targets && targets.length > 1
    ? null  // multiple — shown grouped, no single badge
    : [exam.grade?.name, exam.term?.name].filter(Boolean).join(' ') || null

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <BackButton label={isRtl ? 'رجوع' : 'Back'} fallback="/dashboard/exams" variant="primary" />
        <ExamDetailActions id={id} name={exam.name} isRtl={isRtl} />
      </div>

      {/* Header card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '18px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: '#e8960a18', border: '1px solid #e8960a28',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen size={22} color="#e8960a" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{exam.name}</h1>
            {targetLabel && (
              <span style={{
                fontSize: 11, color: '#e8960a', fontWeight: 600,
                background: '#e8960a12', border: '1px solid #e8960a22',
                borderRadius: 20, padding: '2px 10px',
              }}>
                {targetLabel}
              </span>
            )}
            {targets && targets.length > 1 && (
              <span style={{
                fontSize: 11, color: '#e8960a', fontWeight: 600,
                background: '#e8960a12', border: '1px solid #e8960a22',
                borderRadius: 20, padding: '2px 10px',
              }}>
                {isRtl ? `${targets.length} مستويات` : `${targets.length} levels`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{formatDate(exam.date)}</span>
            <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{t('feeLabel')} {formatCurrency(exam.fee)}</span>
            {exam.payment_deadline && (
              <span style={{ fontSize: 12, color: '#e8960a', fontWeight: 600 }}>
                {isRtl ? `آخر موعد سداد: ${formatDate(exam.payment_deadline)}` : `Payment deadline: ${formatDate(exam.payment_deadline)}`}
              </span>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          <div style={{
            textAlign: 'center', background: '#3dab7e18', border: '1px solid #3dab7e28',
            borderRadius: 10, padding: '8px 16px',
          }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#3dab7e', margin: 0 }}>{passed}</p>
            <p style={{ fontSize: 10, color: 'var(--txt2)', margin: 0 }}>{t('passed')}</p>
          </div>
          <div style={{
            textAlign: 'center', background: '#e0404018', border: '1px solid #e0404028',
            borderRadius: 10, padding: '8px 16px',
          }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#e04040', margin: 0 }}>{failed}</p>
            <p style={{ fontSize: 10, color: 'var(--txt2)', margin: 0 }}>{t('failed')}</p>
          </div>
          {other > 0 && (
            <div style={{
              textAlign: 'center', background: '#8B6EC818', border: '1px solid #8B6EC828',
              borderRadius: 10, padding: '8px 16px',
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#8B6EC8', margin: 0 }}>{other}</p>
              <p style={{ fontSize: 10, color: 'var(--txt2)', margin: 0 }}>{isRtl ? 'تقييم / لجنة / منقول' : 'Eval / committee / moved'}</p>
            </div>
          )}
        </div>
      </div>

      <ExamResultsForm
        exam={exam}
        students={students}
        existingResults={existing || []}
        classesByStudent={classesByStudent}
        allClasses={allClasses || []}
        isGrouped={isGrouped}
        isRtl={isRtl}
      />
    </div>
  )
}
