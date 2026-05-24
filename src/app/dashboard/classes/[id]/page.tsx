import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import EnrollStudentForm from './EnrollStudentForm'

const DAYS_LABEL: Record<string, { en: string; ar: string }> = {
  Sunday:    { en: 'Sun', ar: 'الأحد' },
  Monday:    { en: 'Mon', ar: 'الاثنين' },
  Tuesday:   { en: 'Tue', ar: 'الثلاثاء' },
  Wednesday: { en: 'Wed', ar: 'الأربعاء' },
  Thursday:  { en: 'Thu', ar: 'الخميس' },
  Friday:    { en: 'Fri', ar: 'الجمعة' },
  Saturday:  { en: 'Sat', ar: 'السبت' },
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const { data: cls } = await supabase
    .from('classes')
    .select('*, level:levels(*), hall:halls(*), default_coach:coaches(*)')
    .eq('id', id)
    .single()

  if (!cls) notFound()

  const { data: enrolled } = await supabase
    .from('class_students')
    .select('*, student:students(*, level:levels(name))')
    .eq('class_id', id)
    .order('enrolled_date', { ascending: false })

  const enrolledIds = enrolled?.map(e => e.student_id) || []
  const { data: available } = await supabase
    .from('students').select('id, name_ar, name_en').eq('status', 'active').order('name_ar')

  const L = isRtl ? {
    back: 'رجوع', noLevel: 'بدون مستوى',
    enrolledTitle: `الطالبات المسجلات (${enrolled?.length || 0})`,
    noStudents: 'لا توجد طالبات مسجلات في هذه المجموعة',
    remove: 'حذف',
    enrolledDate: (d: string) => new Date(d).toLocaleDateString('ar-EG'),
  } : {
    back: 'Back', noLevel: 'No level',
    enrolledTitle: `Enrolled Students (${enrolled?.length || 0})`,
    noStudents: 'No students enrolled in this group',
    remove: 'Remove',
    enrolledDate: (d: string) => new Date(d).toLocaleDateString('en-GB'),
  }

  const dayStr = cls.days_of_week?.map((d: string) => DAYS_LABEL[d]?.[isRtl ? 'ar' : 'en'] || d).join(', ')

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 28px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/dashboard/classes" style={{
          background: '#d4667a', borderRadius: 8, padding: '7px 16px',
          color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {L.back}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 15, fontWeight: 700 }}>{cls.name}</p>
          <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 12 }}>
            {[cls.level?.name, cls.hall?.name, dayStr, `${cls.start_time?.slice(0,5)}–${cls.end_time?.slice(0,5)}`].filter(Boolean).join(' · ')}
          </p>
          {cls.default_coach && (
            <p style={{ margin: '2px 0 0', color: 'var(--txt2)', fontSize: 12 }}>
              {isRtl ? cls.default_coach.name_ar : cls.default_coach.name_en}
            </p>
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-page)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px',
        }}>
          <Users size={14} style={{ color: 'var(--txt2)' }} />
          <span style={{ color: 'var(--txt2)', fontSize: 13 }}>{enrolled?.length || 0} / {cls.max_capacity}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Enrolled list */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{L.enrolledTitle}</p>
          </div>

          {enrolled && enrolled.length > 0 ? (
            <div>
              {enrolled.map((e: any) => {
                const name    = isRtl || !e.student?.name_en ? e.student?.name_ar : e.student?.name_en
                const initial = (e.student?.name_ar || '').charAt(0)
                return (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                      background: '#d4667a18', border: '1px solid #d4667a28',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#d4667a',
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/dashboard/students/${e.student_id}`} style={{
                        color: 'var(--txt1)', fontSize: 13, fontWeight: 500, textDecoration: 'none',
                      }}>
                        {name}
                      </Link>
                      <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>
                        {e.student?.level?.name || L.noLevel}
                      </p>
                    </div>
                    <span style={{ color: 'var(--txt2)', fontSize: 11 }}>
                      {L.enrolledDate(e.enrolled_date)}
                    </span>
                    <UnenrollButton classStudentId={e.id} label={L.remove} />
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--txt2)', fontSize: 13 }}>
              {L.noStudents}
            </div>
          )}
        </div>

        {/* Enroll form */}
        <EnrollStudentForm
          classId={id}
          students={available || []}
          enrolledIds={enrolledIds}
          currentCount={enrolled?.length || 0}
          maxCapacity={cls.max_capacity}
        />
      </div>
    </div>
  )
}

function UnenrollButton({ classStudentId, label }: { classStudentId: string; label: string }) {
  return (
    <form action={async () => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const { revalidatePath } = await import('next/cache')
      const supabase = await createClient()
      await supabase.from('class_students').delete().eq('id', classStudentId)
      revalidatePath('/dashboard/classes/[id]', 'page')
    }}>
      <button type="submit" style={{
        background: 'transparent', border: '1px solid var(--border)',
        borderRadius: 6, padding: '3px 10px', color: 'var(--txt2)',
        fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {label}
      </button>
    </form>
  )
}
