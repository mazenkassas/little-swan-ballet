import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { calculateAge } from '@/lib/utils'
import { getLocale } from 'next-intl/server'
import { Suspense } from 'react'
import StudentStatusBadge from './StudentStatusBadge'
import StudentSearch from './StudentSearch'
import StudentTransferButton from './StudentTransferButton'

const PAGE_SIZE = 15

const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function fmt12h(time: string) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const h12 = h % 12 || 12
  const s = h < 12 ? 'AM' : 'PM'
  return m === 0 ? `${h12} ${s}` : `${h12}:${String(m).padStart(2, '0')} ${s}`
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const locale = await getLocale()
  const params = await searchParams
  const supabase = await createClient()
  const isRtl = locale === 'ar'

  const todayDayName = WEEKDAYS[new Date().getDay()]

  const statusFilter = params.status || ''
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const SELECT = '*, level:levels(id, name, order_num), subscriptions:subscriptions(remaining_sessions, total_sessions, status), class_enrollments:class_students(enrolled_date, class:classes(name, start_time, days_of_week, level:levels(name)))'

  let students: any[] = []
  let totalCount = 0

  if (statusFilter === 'payrequired') {
    // fetch all active then filter client-side
    let q = supabase.from('students').select(SELECT).eq('status', 'active').order('name_ar')
    if (params.search) q = q.or(`name_ar.ilike.%${params.search}%,name_en.ilike.%${params.search}%,parent_phone.ilike.%${params.search}%`)
    const { data: all } = await q
    const filtered = (all || []).filter((s: any) => {
      const sub = s.subscriptions?.find((x: any) => x.status === 'active')
      return !sub || sub.remaining_sessions === 0
    })
    totalCount = filtered.length
    students   = filtered.slice(from, from + PAGE_SIZE)
  } else {
    let q = supabase.from('students').select(SELECT, { count: 'exact' }).order('name_ar')
    if (statusFilter) q = q.eq('status', statusFilter)
    if (params.search) q = q.or(`name_ar.ilike.%${params.search}%,name_en.ilike.%${params.search}%,parent_phone.ilike.%${params.search}%`)
    q = q.range(from, to)
    const { data, count } = await q
    students   = data || []
    totalCount = count ?? 0
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function tabHref(key: string) {
    const sp = new URLSearchParams()
    if (key) sp.set('status', key)
    if (params.search) sp.set('search', params.search)
    const q = sp.toString()
    return `/dashboard/students${q ? '?' + q : ''}`
  }

  function pageHref(p: number) {
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    if (params.search) sp.set('search', params.search)
    if (p > 1) sp.set('page', String(p))
    const q = sp.toString()
    return `/dashboard/students${q ? '?' + q : ''}`
  }

  const TABS = isRtl
    ? [{ k: '', l: 'الكل' }, { k: 'active', l: 'نشط' }, { k: 'inactive', l: 'غير نشط' }, { k: 'frozen', l: 'تجميد' }, { k: 'payrequired', l: 'مطلوب الدفع' }]
    : [{ k: '', l: 'All' }, { k: 'active', l: 'Active' }, { k: 'inactive', l: 'Inactive' }, { k: 'frozen', l: 'Freeze' }, { k: 'payrequired', l: 'Payment Required' }]

  const th: React.CSSProperties = {
    textAlign: isRtl ? 'right' : 'left', color: 'var(--txt2)', fontSize: 11,
    fontWeight: 600, padding: '11px 14px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-page)', whiteSpace: 'nowrap', verticalAlign: 'middle',
  }
  const td: React.CSSProperties = {
    padding: '11px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
    textAlign: isRtl ? 'right' : 'left', overflow: 'hidden',
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
  }

  return (
    <div className="page-body" style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 2px' }}>
            {isRtl ? 'جميع الطالبات المسجلات' : 'All enrolled students'}
          </p>
          <h1 style={{ color: 'var(--txt1)', fontSize: 18, fontWeight: 700, margin: 0 }}>
            {isRtl ? 'الطالبات' : 'Students'}
          </h1>
        </div>
        <Link href="/dashboard/students/new" style={{
          background: '#d4667a', borderRadius: 8, padding: '7px 14px',
          color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}>
          <Plus size={14} />
          {isRtl ? 'طالبة جديدة' : 'New Student'}
        </Link>
      </div>

      {/* ── Filter tabs + search ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map(f => (
          <Link key={f.k} href={tabHref(f.k)} style={{
            background: statusFilter === f.k ? '#d4667a' : 'transparent',
            border: `1px solid ${statusFilter === f.k ? '#d4667a' : 'var(--border)'}`,
            borderRadius: 8, padding: '5px 12px', textDecoration: 'none',
            color: statusFilter === f.k ? '#fff' : 'var(--txt2)',
            fontSize: 12, fontWeight: statusFilter === f.k ? 600 : 400, whiteSpace: 'nowrap',
          }}>
            {f.l}
          </Link>
        ))}
        <div style={{ marginInlineStart: 'auto' }}>
          <Suspense>
            <StudentSearch isRtl={isRtl} />
          </Suspense>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="tbl-outer">
        <div className="tbl-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>{isRtl ? 'ID'              : 'ID'}</th>
              <th style={th}>{isRtl ? 'الطالبة'         : 'Student'}</th>
              <th style={th}>{isRtl ? 'المستوى'         : 'Level'}</th>
              <th style={th}>{isRtl ? 'السن'             : 'Age'}</th>
              <th style={th}>{isRtl ? 'عدد المرات'      : 'Sessions'}</th>
              <th style={th}>{isRtl ? 'حصص اليوم'       : "Today's Sessions"}</th>
              <th style={th}>{isRtl ? 'الحالة'          : 'Status'}</th>
              <th style={th}>{isRtl ? 'الإجراءات'      : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student: any, idx: number) => {
              const activeSub    = student.subscriptions?.find((s: any) => s.status === 'active')
              const remaining    = activeSub?.remaining_sessions ?? null
              const total        = activeSub?.total_sessions ?? 4
              const displayName  = locale === 'en' && student.name_en ? student.name_en : student.name_ar
              const altName      = locale === 'en' ? student.name_ar : student.name_en
              const initials     = (displayName || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const sortedEnrollments = ((student.class_enrollments || []) as any[])
                .slice().sort((a: any, b: any) => new Date(b.enrolled_date || '').getTime() - new Date(a.enrolled_date || '').getTime())
              const classLevel   = sortedEnrollments[0]?.class?.level?.name
              const displayLevel = classLevel || student.level?.name || '—'
              const studentNum   = from + idx + 1

              return (
                <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>

                  {/* ID */}
                  <td style={{ ...td, color: 'var(--txt2)', fontSize: 11, fontWeight: 600 }}>
                    {studentNum}
                  </td>

                  {/* Student */}
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 14,
                        background: '#d4667a18', border: '1px solid #d4667a28',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#d4667a', flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      <div>
                        <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 12, fontWeight: 600 }}>{displayName}</p>
                        <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 10 }}>{altName}</p>
                      </div>
                    </div>
                  </td>

                  {/* Level */}
                  <td style={{ ...td, color: 'var(--txt2)', fontSize: 12 }}>
                    {displayLevel}
                  </td>

                  {/* Age */}
                  <td style={{ ...td, color: 'var(--txt2)', fontSize: 12 }}>
                    {calculateAge(student.date_of_birth)}
                  </td>

                  {/* Sessions dot bar */}
                  <td style={td}>
                    {student.status === 'active' && activeSub ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                              width: 11, height: 7, borderRadius: 2,
                              background: i <= (remaining ?? 0) ? '#d4667a' : 'var(--border)',
                            }} />
                          ))}
                        </div>
                        <span style={{ color: remaining === 0 ? '#e04040' : 'var(--txt1)', fontSize: 11, fontWeight: 600 }}>
                          {remaining}/{total}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--txt2)', fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Today's Sessions */}
                  <td style={td}>
                    {(() => {
                      const todayClass = student.class_enrollments?.find((e: any) =>
                        e.class?.days_of_week?.includes(todayDayName)
                      )
                      if (!todayClass?.class) {
                        return <span style={{ color: 'var(--txt2)', fontSize: 12 }}>—</span>
                      }
                      return (
                        <div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {todayClass.class.name}
                          </p>
                          {todayClass.class.start_time && (
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#4a90d9', fontWeight: 600 }}>
                              {fmt12h(todayClass.class.start_time)}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </td>

                  {/* Status */}
                  <td style={td}>
                    <StudentStatusBadge id={student.id} status={student.status} isRtl={isRtl} />
                  </td>

                  {/* Actions */}
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link href={`/dashboard/students/${student.id}`} style={{
                        background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '4px 10px', color: 'var(--txt2)',
                        fontSize: 10, fontWeight: 600, textDecoration: 'none',
                      }}>
                        {isRtl ? 'عرض' : 'View'}
                      </Link>
                      <Link href={`/dashboard/students/${student.id}/edit`} style={{
                        background: '#d4667a12', border: '1px solid #d4667a28',
                        borderRadius: 8, padding: '4px 10px', color: '#d4667a',
                        fontSize: 10, fontWeight: 600, textDecoration: 'none',
                      }}>
                        {isRtl ? 'تعديل' : 'Edit'}
                      </Link>
                      <StudentTransferButton
                        studentId={student.id}
                        studentName={displayName}
                        isRtl={isRtl}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        </div>
        {students.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)' }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{isRtl ? 'لا توجد نتائج' : 'No students found'}</p>
            <p style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>{isRtl ? 'جربي البحث أو تغيير الفلتر' : 'Try adjusting your search or filter'}</p>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ color: 'var(--txt2)', fontSize: 12 }}>
            {isRtl
              ? `عرض ${from + 1}–${Math.min(from + PAGE_SIZE, totalCount)} من ${totalCount}`
              : `Showing ${from + 1}–${Math.min(from + PAGE_SIZE, totalCount)} of ${totalCount}`}
          </span>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {page > 1 ? (
              <Link href={pageHref(page - 1)} style={{
                ...btnBase,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--txt1)',
              }}>
                {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                {isRtl ? 'السابق' : 'Previous'}
              </Link>
            ) : (
              <span style={{
                ...btnBase,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--txt2)', opacity: 0.4, cursor: 'default',
              }}>
                {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                {isRtl ? 'السابق' : 'Previous'}
              </span>
            )}

            <span style={{ color: 'var(--txt2)', fontSize: 12, minWidth: 60, textAlign: 'center' }}>
              {isRtl ? `${page} / ${totalPages}` : `${page} / ${totalPages}`}
            </span>

            {page < totalPages ? (
              <Link href={pageHref(page + 1)} style={{
                ...btnBase,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--txt1)',
              }}>
                {isRtl ? 'التالي' : 'Next'}
                {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </Link>
            ) : (
              <span style={{
                ...btnBase,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--txt2)', opacity: 0.4, cursor: 'default',
              }}>
                {isRtl ? 'التالي' : 'Next'}
                {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
