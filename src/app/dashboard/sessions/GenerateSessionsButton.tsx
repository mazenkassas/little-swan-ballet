'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { addDays, format, getDay } from 'date-fns'

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6
}

export default function GenerateSessionsButton({
  weekStart,
  weekEnd,
}: {
  weekStart: string
  weekEnd: string
}) {
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function generate() {
    setLoading(true)
    setCount(null)

    // Get all active classes
    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)

    if (!classes) { setLoading(false); return }

    const start = new Date(weekStart)
    const end = new Date(weekEnd)
    let generated = 0

    for (const cls of classes) {
      for (const day of (cls.days_of_week || [])) {
        const targetDow = DAY_MAP[day]
        if (targetDow === undefined) continue

        // Find the date in the week with this day
        for (let i = 0; i <= 6; i++) {
          const date = addDays(start, i)
          if (getDay(date) === targetDow && date <= end) {
            const dateStr = format(date, 'yyyy-MM-dd')

            // Check if session already exists
            const { data: existing } = await supabase
              .from('sessions')
              .select('id')
              .eq('class_id', cls.id)
              .eq('date', dateStr)
              .single()

            if (!existing) {
              await supabase.from('sessions').insert({
                class_id: cls.id,
                date: dateStr,
                coach_id: cls.default_coach_id,
                hall_id: cls.hall_id,
                status: 'scheduled',
              })
              generated++
            }
          }
        }
      }
    }

    setCount(generated)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20 text-sm disabled:opacity-50"
    >
      <Zap size={16} />
      {loading ? 'جارٍ الإنشاء...' : count !== null ? `✓ تم إنشاء ${count} حصة` : 'إنشاء حصص الأسبوع'}
    </button>
  )
}
