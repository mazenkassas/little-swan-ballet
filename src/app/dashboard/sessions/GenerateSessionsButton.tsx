'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
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
  const router   = useRouter()
  const locale   = useLocale()
  const isRtl    = locale === 'ar'
  const supabase = createClient()

  const label = isRtl
    ? (loading ? 'جارٍ الإنشاء...' : 'إنشاء حصص الأسبوع')
    : (loading ? 'Generating…'    : 'Generate Sessions')

  async function generate() {
    setLoading(true)

    // Get all active classes
    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)

    if (!classes) { setLoading(false); return }

    const start = new Date(weekStart)
    const end   = new Date(weekEnd)

    for (const cls of classes) {
      for (const day of (cls.days_of_week || [])) {
        const targetDow = DAY_MAP[day]
        if (targetDow === undefined) continue

        for (let i = 0; i <= 6; i++) {
          const date = addDays(start, i)
          if (getDay(date) === targetDow && date <= end) {
            const dateStr = format(date, 'yyyy-MM-dd')
            const { data: existing } = await supabase
              .from('sessions').select('id')
              .eq('class_id', cls.id).eq('date', dateStr).single()
            if (!existing) {
              await supabase.from('sessions').insert({
                class_id: cls.id, date: dateStr,
                coach_id: cls.default_coach_id, hall_id: cls.hall_id, status: 'scheduled',
              })
            }
          }
        }
      }
    }

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
      {label}
    </button>
  )
}
