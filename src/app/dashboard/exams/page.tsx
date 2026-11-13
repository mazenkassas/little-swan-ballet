import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Trophy, CalendarDays, Wallet, ClipboardCheck, TrendingUp, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import ExamCardActions from './ExamCardActions'
import { todayISO, daysUntil, countdown, dateParts } from '../events/eventUi'

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

export default async function ExamsPage() {
  const t        = await getTranslations('exams')
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const { data: exams } = await supabase
    .from('exams')
    .select('*, grade:grades(name), term:terms(name), student_exams:student_exams(id, result), targets:exam_targets(grade:grades(name), term:terms(name))')
    .order('date', { ascending: false })

  const today = todayISO()
  const rows = (exams || []).map((exam: any) => {
    const res     = (exam.student_exams || []).filter((e: any) => e.result && e.result !== 'pending')
    const passed  = res.filter((e: any) => e.result === 'pass').length
    const failed  = res.filter((e: any) => e.result === 'fail').length
    const other   = res.length - passed - failed
    // Level tags: new multi-level targets, else the legacy single grade/term
    const targets: string[] = (exam.targets || [])
      .map((tg: any) => [one(tg.grade)?.name, one(tg.term)?.name].filter(Boolean).join(' '))
      .filter(Boolean)
    const legacy = [exam.grade?.name, exam.term?.name].filter(Boolean).join(' ')
    const levels = targets.length ? targets : legacy ? [legacy] : []
    return { exam, passed, failed, other, recorded: res.length, levels, days: daysUntil(exam.date, today) }
  })
  const upcoming = rows.filter(r => r.days >= 0).sort((a, b) => a.days - b.days)
  const past     = rows.filter(r => r.days < 0)

  const totalPassed   = rows.reduce((s, r) => s + r.passed, 0)
  const totalFailed   = rows.reduce((s, r) => s + r.failed, 0)
  const totalRecorded = rows.reduce((s, r) => s + r.recorded, 0)
  const passRate      = totalPassed + totalFailed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : null
  const next = upcoming[0]

  const L = isRtl ? {
    upcoming: 'القادمة', past: 'السابقة', upcomingKpi: 'امتحانات قادمة', nextOn: 'الأقرب:', none: 'لا توجد امتحانات قادمة',
    recorded: 'نتائج مسجلة', acrossAll: 'في كل الامتحانات', passRate: 'نسبة النجاح', passFail: (p: number, f: number) => `${p} ناجحة · ${f} راسبة`,
    noRate: 'لا توجد نتائج بعد', fee: 'الرسوم', deadline: 'آخر موعد سداد', levels: (n: number) => `${n} مستويات`,
    noResults: 'لم تُسجل نتائج', create: 'إنشاء أول امتحان', other: 'أخرى', of: 'من',
  } : {
    upcoming: 'Upcoming', past: 'Past', upcomingKpi: 'Upcoming exams', nextOn: 'Next:', none: 'Nothing scheduled',
    recorded: 'Results recorded', acrossAll: 'Across all exams', passRate: 'Pass rate', passFail: (p: number, f: number) => `${p} passed · ${f} failed`,
    noRate: 'No results yet', fee: 'Fee', deadline: 'Pay by', levels: (n: number) => `${n} levels`,
    noResults: 'No results yet', create: 'Create your first exam', other: 'Other', of: 'of',
  }

  function ExamCard({ r, isPast }: { r: typeof rows[number]; isPast: boolean }) {
    const { exam, passed, failed, other, recorded, levels, days } = r
    const dp   = dateParts(exam.date, isRtl)
    const when = countdown(days, isRtl)
    const pct  = (n: number) => (recorded ? (n / recorded) * 100 : 0)
    const shown = levels.slice(0, 3)
    const deadline = exam.payment_deadline ? dateParts(exam.payment_deadline, isRtl) : null

    return (
      <article className={`ev-card${isPast ? ' past' : ''}`}>
        <div className="ev-date" aria-hidden>
          <small style={{ background: isPast ? '#9a8a90' : '#e8960a' }}>{dp.month}</small>
          <b>{dp.day}</b>
        </div>

        <div className="ev-main">
          <div className="ev-title">
            <Link href={`/dashboard/exams/${exam.id}`} className="ev-link">{exam.name}</Link>
            <span className={`ev-when ${when.tone}`}>{when.label}</span>
          </div>
          <div className="ev-title" style={{ gap: 5, marginBottom: 6 }}>
            {levels.length === 0
              ? <span className="ev-tag" style={{ color: '#c27c00', background: '#e8960a18' }}>{t('allLevels')}</span>
              : shown.map(l => <span key={l} className="ev-tag" dir="ltr" style={{ color: '#c27c00', background: '#e8960a18' }}>{l}</span>)}
            {levels.length > shown.length && (
              <span className="ev-tag" style={{ color: 'var(--txt2)', background: 'var(--bg2)' }} title={levels.join(' · ')}>
                +{levels.length - shown.length}
              </span>
            )}
          </div>
          <div className="ev-meta">
            <span><CalendarDays size={12} />{dp.day} {dp.month} {dp.year}</span>
            <span><Wallet size={12} />{L.fee} {formatCurrency(exam.fee)}</span>
            {deadline && !isPast && (
              <span style={{ color: '#c27c00', fontWeight: 600 }}><Clock size={12} />{L.deadline} {deadline.day} {deadline.month}</span>
            )}
          </div>
        </div>

        <div className="ev-stats">
          <div className="ev-stat">
            <b style={{ color: '#3dab7e' }}>{passed}</b>
            <small>{t('passed')}</small>
          </div>
          <div className="ev-stat">
            <b style={{ color: '#e04040' }}>{failed}</b>
            <small>{t('failed')}</small>
          </div>
          <div className="ev-money" title={other ? `${L.other}: ${other}` : undefined}>
            <div className="ev-money-row">
              {recorded
                ? <><b style={{ color: 'var(--txt1)' }}>{recorded}</b><span>{L.recorded}</span></>
                : <span>{L.noResults}</span>}
            </div>
            <div className="ev-bar" style={{ display: 'flex' }} role="img" aria-label={L.passFail(passed, failed)}>
              <i style={{ width: `${pct(passed)}%`, borderRadius: 0, background: '#3dab7e' }} />
              <i style={{ width: `${pct(failed)}%`, borderRadius: 0, background: '#e04040' }} />
              <i style={{ width: `${pct(other)}%`,  borderRadius: 0, background: '#8B6EC8' }} />
            </div>
          </div>
        </div>

        <div className="ev-actions" style={{ flexShrink: 0, minWidth: 160 }}>
          <ExamCardActions id={exam.id} name={exam.name} isRtl={isRtl} />
        </div>
      </article>
    )
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="dh">
        {/* Header */}
        <div className="dh-head">
          <div>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className="dh-actions">
            <Link href="/dashboard/exams/new" className="dh-btn primary">
              <Plus size={15} />
              {t('create')}
            </Link>
          </div>
        </div>

        {/* KPIs */}
        {rows.length > 0 && (
          <div className="dh-stats">
            <div className="dh-stat static">
              <div className="dh-stat-top">{L.upcomingKpi}<i style={{ background: '#e8960a18', color: '#e8960a' }}><CalendarDays size={15} /></i></div>
              <b>{upcoming.length}</b>
              <small>{next ? `${L.nextOn} ${next.exam.name} · ${countdown(next.days, isRtl).label}` : L.none}</small>
            </div>
            <div className="dh-stat static">
              <div className="dh-stat-top">{L.recorded}<i style={{ background: '#4a90d918', color: '#4a90d9' }}><ClipboardCheck size={15} /></i></div>
              <b>{totalRecorded}</b>
              <small>{L.acrossAll}</small>
            </div>
            <div className="dh-stat static">
              <div className="dh-stat-top">{L.passRate}<i style={{ background: '#3dab7e18', color: '#3dab7e' }}><TrendingUp size={15} /></i></div>
              <b style={{ color: passRate !== null ? '#2f9a6d' : undefined }}>{passRate !== null ? `${passRate}%` : '—'}</b>
              <small>{passRate !== null ? L.passFail(totalPassed, totalFailed) : L.noRate}</small>
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="ev-section">
            <h2 className="ev-section-title">{L.upcoming}<span>{upcoming.length}</span></h2>
            <div className="ev-list">
              {upcoming.map(r => <ExamCard key={r.exam.id} r={r} isPast={false} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="ev-section">
            <h2 className="ev-section-title">{L.past}<span>{past.length}</span></h2>
            <div className="ev-list">
              {past.map(r => <ExamCard key={r.exam.id} r={r} isPast />)}
            </div>
          </section>
        )}

        {rows.length === 0 && (
          <div className="ev-empty">
            <Trophy size={36} style={{ margin: '0 auto 12px', opacity: 0.25, display: 'block' }} color="var(--txt2)" />
            <p style={{ margin: '0 0 14px' }}>{t('noExams')}</p>
            <Link href="/dashboard/exams/new" className="dh-btn primary"><Plus size={15} />{L.create}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
