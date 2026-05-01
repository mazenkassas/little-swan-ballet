import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, BookOpen, Trophy, ChevronRight, ChevronLeft } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'

export default async function ExamsPage() {
  const t       = await getTranslations('exams')
  const locale  = await getLocale()
  const isRtl   = locale === 'ar'
  const supabase = await createClient()

  const { data: exams } = await supabase
    .from('exams')
    .select('*, grade:grades(name), term:terms(name), student_exams:student_exams(id, result)')
    .order('date', { ascending: false })

  return (
    <div style={{ padding: 32, background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 4, margin: '4px 0 0' }}>{t('subtitle')}</p>
        </div>
        <Link
          href="/dashboard/exams/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: '#d4667a', color: '#fff',
            borderRadius: 10, padding: '9px 18px',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <Plus size={15} />
          {t('create')}
        </Link>
      </div>

      {/* Exam list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {exams?.map((exam: any) => {
          const passed  = exam.student_exams?.filter((e: any) => e.result === 'pass').length  || 0
          const failed  = exam.student_exams?.filter((e: any) => e.result === 'fail').length  || 0
          const pending = exam.student_exams?.filter((e: any) => e.result === 'pending').length || 0

          return (
            <Link
              key={exam.id}
              href={`/dashboard/exams/${exam.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 18,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '16px 20px', textDecoration: 'none',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: '#e8960a18', border: '1px solid #e8960a28',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={20} color="#e8960a" />
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt1)' }}>{exam.name}</span>
                  <span style={{
                    fontSize: 11, color: '#e8960a',
                    background: '#e8960a12', border: '1px solid #e8960a22',
                    borderRadius: 20, padding: '2px 10px', fontWeight: 600,
                  }}>
                    {[exam.grade?.name, exam.term?.name].filter(Boolean).join(' ') || t('allLevels')}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--txt2)', margin: '4px 0 0' }}>
                  {formatDate(exam.date)} • {t('feeLabel')} {formatCurrency(exam.fee)}
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#3dab7e', margin: 0 }}>{passed}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt2)', margin: 0 }}>{t('passed')}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#e04040', margin: 0 }}>{failed}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt2)', margin: 0 }}>{t('failed')}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt2)', margin: 0 }}>{pending}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt2)', margin: 0 }}>{t('pending')}</p>
                </div>
                {isRtl
                  ? <ChevronLeft  size={15} color="var(--txt2)" style={{ opacity: 0.4 }} />
                  : <ChevronRight size={15} color="var(--txt2)" style={{ opacity: 0.4 }} />
                }
              </div>
            </Link>
          )
        })}

        {(!exams || exams.length === 0) && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, color: 'var(--txt2)',
          }}>
            <Trophy size={38} color="var(--txt2)" style={{ opacity: 0.25, marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 13 }}>{t('noExams')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
