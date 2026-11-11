import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import NewStudentForm from './NewStudentForm'

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Optional ?class_id=… (sent by the "Add Student" button on the daily page)
  const { class_id: classParam } = await searchParams
  const initialClassId = typeof classParam === 'string' ? classParam : ''

  const locale   = await getLocale()
  const supabase = await createClient()

  const [
    { data: terms   },
    { data: grades  },
    { data: classes },
    { data: plans   },
  ] = await Promise.all([
    supabase.from('terms').select('id, name').order('name'),
    supabase.from('grades').select('id, name'),
    supabase.from('classes').select('id, name, days_of_week, start_time, grade_id, term_id').eq('is_active', true).order('name'),
    supabase.from('subscription_plans').select('id, name, price, sessions_count').eq('is_active', true).order('sessions_count'),
  ])

  // PreBallet grades first, then the rest alphabetically
  const sortedGrades = (grades || []).slice().sort((a, b) => {
    const isPre = (n: string) => n.toLowerCase().startsWith('pre')
    if (isPre(a.name) && !isPre(b.name)) return -1
    if (!isPre(a.name) && isPre(b.name)) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <NewStudentForm
      terms={terms       || []}
      grades={sortedGrades}
      classes={classes   || []}
      plans={plans       || []}
      locale={locale}
      initialClassId={initialClassId}
    />
  )
}
