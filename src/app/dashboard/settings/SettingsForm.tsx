'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, MapPin, Settings, Users, BookOpen, CreditCard, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsForm({
  settings, levels, plans, halls,
}: {
  settings: Record<string, string>
  levels: any[]
  plans: any[]
  halls: any[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [saved, setSaved] = useState<string | null>(null)
  const [form, setForm] = useState({
    max_freeze_days: settings.max_freeze_days || '30',
    absence_hide_threshold: settings.absence_hide_threshold || '5',
    academy_lat: settings.academy_lat || '',
    academy_lng: settings.academy_lng || '',
    allowed_radius_meters: settings.allowed_radius_meters || '100',
  })

  async function saveSettings(key: string) {
    await supabase.from('system_settings').upsert({
      key,
      value: form[key as keyof typeof form],
      updated_at: new Date().toISOString(),
    })
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  async function saveAllGPS() {
    for (const key of ['academy_lat', 'academy_lng', 'allowed_radius_meters']) {
      await supabase.from('system_settings').upsert({
        key, value: form[key as keyof typeof form], updated_at: new Date().toISOString(),
      })
    }
    setSaved('gps')
    setTimeout(() => setSaved(null), 2000)
  }

  async function getCurrentLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({
        ...f,
        academy_lat: pos.coords.latitude.toString(),
        academy_lng: pos.coords.longitude.toString(),
      }))
    })
  }

  const inputClass = "flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"

  const sections = [
    {
      icon: Settings, label: 'قواعد النظام', color: 'rose',
      fields: [
        { key: 'max_freeze_days', label: 'الحد الأقصى لأيام التجميد في الشهر', suffix: 'يوم' },
        { key: 'absence_hide_threshold', label: 'عدد الغيابات قبل التعطيل التلقائي', suffix: 'غياب' },
      ]
    },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* System Rules */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Settings size={18} className="text-rose-400" />
          قواعد النظام
        </h2>
        <div className="space-y-4">
          {[
            { key: 'max_freeze_days', label: 'الحد الأقصى لأيام التجميد في الشهر', suffix: 'يوم' },
            { key: 'absence_hide_threshold', label: 'عدد الغيابات المتتالية قبل التعطيل التلقائي', suffix: 'غياب' },
          ].map(field => (
            <div key={field.key} className="flex items-center gap-3">
              <label className="text-white/60 text-sm w-72 flex-shrink-0">{field.label}</label>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="number"
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-white/30 text-sm">{field.suffix}</span>
                <button
                  onClick={() => saveSettings(field.key)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    saved === field.key ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                  }`}
                >
                  {saved === field.key ? 'تم ✓' : 'حفظ'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GPS Settings */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <MapPin size={18} className="text-blue-400" />
          إعدادات الموقع الجغرافي (GPS)
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs mb-2">خط العرض (Latitude)</label>
              <input value={form.academy_lat} onChange={e => setForm(f => ({ ...f, academy_lat: e.target.value }))}
                placeholder="25.7617" className={inputClass} />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">خط الطول (Longitude)</label>
              <input value={form.academy_lng} onChange={e => setForm(f => ({ ...f, academy_lng: e.target.value }))}
                placeholder="-80.1918" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-white/50 text-xs mb-2">نطاق القبول (بالمتر)</label>
            <input type="number" value={form.allowed_radius_meters}
              onChange={e => setForm(f => ({ ...f, allowed_radius_meters: e.target.value }))}
              className="w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500/60" />
          </div>
          <div className="flex gap-3">
            <button onClick={getCurrentLocation}
              className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-400 px-4 py-2.5 rounded-xl text-sm transition-all">
              <MapPin size={15} />
              استخدام موقعي الحالي
            </button>
            <button onClick={saveAllGPS}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
                saved === 'gps' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
              }`}>
              <Save size={15} />
              {saved === 'gps' ? 'تم الحفظ ✓' : 'حفظ إعدادات GPS'}
            </button>
          </div>
        </div>
      </div>

      {/* Levels */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <BookOpen size={18} className="text-amber-400" />
          مستويات الباليه ({levels.length} مستوى)
        </h2>
        <div className="space-y-2">
          {levels.map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 bg-white/3 rounded-xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                {l.order_num}
              </span>
              <span className="text-white text-sm flex-1">{l.name}</span>
              {i < levels.length - 1 && (
                <span className="text-white/20 text-xs">→ {levels[i + 1]?.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <CreditCard size={18} className="text-emerald-400" />
          خطط الاشتراك
        </h2>
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center gap-4 bg-white/3 rounded-xl px-4 py-3">
              <span className="text-white text-sm flex-1">{plan.name}</span>
              <span className="text-white/50 text-sm">{plan.sessions_count} حصص</span>
              <span className="text-emerald-400 font-semibold text-sm">{plan.price} جنيه</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
