import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import EditEventForm from './EditEventForm'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  return <EditEventForm event={event} isRtl={isRtl} />
}
