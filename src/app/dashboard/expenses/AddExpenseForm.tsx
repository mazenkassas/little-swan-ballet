'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AddExpenseForm() {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({ title: '', amount: '' })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('expenses').insert({
      title: form.title,
      amount: parseFloat(form.amount),
      date: new Date().toISOString().split('T')[0],
    })

    setForm({ title: '', amount: '' })
    setSaving(false)
    router.refresh()
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
      <h2 className="text-white font-semibold mb-5">إضافة مصروف</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white/50 text-sm mb-2">البيان</label>
          <input
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="مثال: كهرباء، إنترنت، نظافة..."
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-white/50 text-sm mb-2">المبلغ (جنيه)</label>
          <input
            required
            type="number"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0"
            min="0"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-3 rounded-xl transition-all w-full justify-center shadow-lg shadow-rose-500/20 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'جارٍ الحفظ...' : 'تسجيل المصروف'}
        </button>
      </form>
    </div>
  )
}
