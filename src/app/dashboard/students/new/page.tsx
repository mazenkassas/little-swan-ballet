import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import NewStudentForm from './NewStudentForm'

export default async function NewStudentPage() {
  const locale   = await getLocale()
  const supabase = await createClient()

  const [
    { data: terms   },
    { data: grades  },
    { data: classes },
  ] = await Promise.all([
    supabase.from('terms').select('id, name').order('name'),
    supabase.from('grades').select('id, name'),
    supabase.from('classes').select('id, name, days_of_week, start_time').eq('is_active', true).order('name'),
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
      locale={locale}
    />
  )
}
