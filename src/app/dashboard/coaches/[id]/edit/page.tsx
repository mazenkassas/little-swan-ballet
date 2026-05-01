import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditCoachForm from './EditCoachForm'

export default async function EditCoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = await params
  const supabase = await createClient()
  const { data: coach } = await supabase.from('coaches').select('*').eq('id', id).single()
  if (!coach) notFound()
  return <EditCoachForm coach={coach} />
}
