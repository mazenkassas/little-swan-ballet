import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditStaffForm from './EditStaffForm'

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = await params
  const supabase = await createClient()
  const { data: staff } = await supabase.from('staff').select('*').eq('id', id).single()
  if (!staff) notFound()
  return <EditStaffForm staff={staff} />
}
