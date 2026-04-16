'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TransferActions({ transferId }: { transferId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function decide(status: 'approved' | 'rejected') {
    setLoading(status)

    const { data: transfer } = await supabase
      .from('student_transfers')
      .select('*')
      .eq('id', transferId)
      .single()

    await supabase.from('student_transfers').update({
      status,
      decision_date: new Date().toISOString().split('T')[0],
    }).eq('id', transferId)

    if (status === 'approved' && transfer) {
      // Move student from old class to new class
      await supabase.from('class_students')
        .delete()
        .eq('student_id', transfer.student_id)
        .eq('class_id', transfer.from_class_id)

      await supabase.from('class_students').upsert({
        student_id: transfer.student_id,
        class_id: transfer.to_class_id,
        enrolled_date: new Date().toISOString().split('T')[0],
      })
    }

    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => decide('approved')}
        disabled={!!loading}
        className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-400 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
      >
        <CheckCircle2 size={15} />
        {loading === 'approved' ? 'جارٍ...' : 'موافقة'}
      </button>
      <button
        onClick={() => decide('rejected')}
        disabled={!!loading}
        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
      >
        <XCircle size={15} />
        {loading === 'rejected' ? 'جارٍ...' : 'رفض'}
      </button>
    </div>
  )
}
