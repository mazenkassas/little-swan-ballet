'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, MapPin, Settings, BookOpen, CreditCard, Plus, Trash2, Pencil } from 'lucide-react'

const LEVEL_COLORS = ['#C8788A', '#8B6EC8', '#6EB4C8', '#6EC88B', '#C8A66E']

const L = {
  en: {
    title: 'Settings',
    sub: 'System configuration — admin only',
    rules: 'System Rules',
    maxFreeze: 'Max freeze days',
    absenceThreshold: 'Absences before auto-disable',
    days: 'days',
    absences: 'absences',
    save: 'Save',
    saved: 'Saved ✓',
    gps: 'Location Settings',
    lat: 'Latitude',
    lng: 'Longitude',
    radius: 'Accepted radius (metres)',
    useMyLocation: 'Use my location',
    saveGps: 'Save GPS',
    savedGps: 'GPS Saved ✓',
    levels: 'Ballet Levels',
    noLevels: 'No levels yet',
    addLevel: 'Add level',
    newLevelPlaceholder: 'New level name...',
    add: 'Add',
    cancel: 'Cancel',
    plans: 'Subscription Plans',
    noPlans: 'No plans yet',
    addPlan: 'Add plan',
    planName: 'Plan name',
    planNamePlaceholder: 'e.g. Monthly 8 sessions',
    sessions: 'Sessions',
    price: 'Price (EGP)',
    session: 'session',
    sessionsLabel: 'sessions',
    currency: 'EGP',
    edit: 'Edit',
    saveEdit: 'Save',
    savedEdit: 'Saved ✓',
  },
  ar: {
    title: 'الإعدادات',
    sub: 'إعدادات النظام — للمسؤول فقط',
    rules: 'قواعد النظام',
    maxFreeze: 'الحد الأقصى لأيام التجميد',
    absenceThreshold: 'الغيابات قبل التعطيل التلقائي',
    days: 'يوم',
    absences: 'غياب',
    save: 'حفظ',
    saved: 'تم ✓',
    gps: 'إعدادات الموقع الجغرافي',
    lat: 'خط العرض',
    lng: 'خط الطول',
    radius: 'نطاق القبول (بالمتر)',
    useMyLocation: 'استخدام موقعي الحالي',
    saveGps: 'حفظ GPS',
    savedGps: 'تم الحفظ ✓',
    levels: 'مستويات الباليه',
    noLevels: 'لا توجد مستويات بعد',
    addLevel: 'إضافة مستوى',
    newLevelPlaceholder: 'اسم المستوى الجديد...',
    add: 'إضافة',
    cancel: 'إلغاء',
    plans: 'خطط الاشتراك',
    noPlans: 'لا توجد خطط بعد',
    addPlan: 'إضافة خطة',
    planName: 'اسم الخطة',
    planNamePlaceholder: 'مثال: شهري 8 حصص',
    sessions: 'الحصص',
    price: 'السعر (جنيه)',
    session: 'حصة',
    sessionsLabel: 'حصص',
    currency: 'جنيه',
    edit: 'تعديل',
    saveEdit: 'حفظ',
    savedEdit: 'تم ✓',
  },
}

export default function SettingsForm({
  settings, levels: initialLevels, plans: initialPlans, locale,
}: {
  settings: Record<string, string>
  levels: any[]
  plans: any[]
  halls: any[]
  locale: string
}) {
  const supabase = createClient()
  const isRtl    = locale === 'ar'
  const t        = L[isRtl ? 'ar' : 'en']

  const [saved,        setSaved]        = useState<string | null>(null)
  const [levels,       setLevels]       = useState(initialLevels)
  const [plans,        setPlans]        = useState(initialPlans)
  const [newLevel,     setNewLevel]     = useState('')
  const [newPlan,      setNewPlan]      = useState({ name: '', sessions_count: '', price: '' })
  const [addingLevel,  setAddingLevel]  = useState(false)
  const [addingPlan,   setAddingPlan]   = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlan,      setEditPlan]      = useState({ name: '', sessions_count: '', price: '' })
  const [savedPlanId,   setSavedPlanId]   = useState<string | null>(null)

  const [form, setForm] = useState({
    max_freeze_days:        settings.max_freeze_days        || '30',
    absence_hide_threshold: settings.absence_hide_threshold || '5',
    academy_lat:            settings.academy_lat            || '',
    academy_lng:            settings.academy_lng            || '',
    allowed_radius_meters:  settings.allowed_radius_meters  || '100',
  })

  function flash(key: string) {
    setSaved(key)
    setTimeout(() => setSaved(null), 2500)
  }

  async function saveSetting(key: string) {
    await supabase.from('system_settings').upsert({
      key, value: form[key as keyof typeof form], updated_at: new Date().toISOString(),
    })
    flash(key)
  }

  async function saveGPS() {
    for (const key of ['academy_lat', 'academy_lng', 'allowed_radius_meters']) {
      await supabase.from('system_settings').upsert({
        key, value: form[key as keyof typeof form], updated_at: new Date().toISOString(),
      })
    }
    flash('gps')
  }

  function getCurrentLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({
        ...f,
        academy_lat: pos.coords.latitude.toString(),
        academy_lng: pos.coords.longitude.toString(),
      }))
    })
  }

  async function addLevel() {
    if (!newLevel.trim()) return
    const nextOrder = (levels[levels.length - 1]?.order_num || 0) + 1
    const { data } = await supabase
      .from('levels')
      .insert({ name: newLevel.trim(), order_num: nextOrder })
      .select().single()
    if (data) setLevels(l => [...l, data])
    setNewLevel('')
    setAddingLevel(false)
  }

  async function deleteLevel(id: string) {
    await supabase.from('levels').delete().eq('id', id)
    setLevels(l => l.filter(x => x.id !== id))
  }

  async function addPlan() {
    if (!newPlan.name || !newPlan.sessions_count || !newPlan.price) return
    const { data } = await supabase
      .from('subscription_plans')
      .insert({
        name: newPlan.name,
        sessions_count: Number(newPlan.sessions_count),
        price: Number(newPlan.price),
        is_active: true,
      })
      .select().single()
    if (data) setPlans(p => [...p, data])
    setNewPlan({ name: '', sessions_count: '', price: '' })
    setAddingPlan(false)
  }

  async function deletePlan(id: string) {
    await supabase.from('subscription_plans').update({ is_active: false }).eq('id', id)
    setPlans(p => p.filter(x => x.id !== id))
  }

  function startEditPlan(plan: any) {
    setEditingPlanId(plan.id)
    setEditPlan({ name: plan.name, sessions_count: String(plan.sessions_count), price: String(plan.price) })
    setAddingPlan(false)
  }

  async function saveEditPlan() {
    if (!editingPlanId || !editPlan.name || !editPlan.sessions_count || !editPlan.price) return
    const update = {
      name:           editPlan.name,
      sessions_count: Number(editPlan.sessions_count),
      price:          Number(editPlan.price),
    }
    await supabase.from('subscription_plans').update(update).eq('id', editingPlanId)
    setPlans(p => p.map(x => x.id === editingPlanId ? { ...x, ...update } : x))
    setSavedPlanId(editingPlanId)
    setTimeout(() => { setSavedPlanId(null); setEditingPlanId(null) }, 1500)
  }

  /* ── Shared styles ── */
  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 24, marginBottom: 20,
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--txt2)', marginBottom: 6,
  }
  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '9px 14px', fontSize: 13, color: 'var(--txt1)',
    outline: 'none', fontFamily: 'inherit',
  }

  function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'var(--bg-page)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{title}</p>
          {badge && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--txt2)' }}>{badge}</p>}
        </div>
      </div>
    )
  }

  function SaveBtn({ id, label, savedLabel }: { id: string; label: string; savedLabel: string }) {
    const isSaved = saved === id
    return (
      <button
        onClick={() => id === 'gps' ? saveGPS() : saveSetting(id)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
          background: isSaved ? '#3dab7e18' : '#d4667a',
          color:      isSaved ? '#3dab7e'   : '#fff',
          transition: 'all .15s',
        }}
      >
        {isSaved ? savedLabel : <><Save size={13} /> {label}</>}
      </button>
    )
  }

  return (
    <div style={{ padding: '24px 28px', background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{t.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 4 }}>{t.sub}</p>
      </div>

      <div style={{ maxWidth: 720 }}>

        {/* ── System Rules ── */}
        <div style={card}>
          <SectionHeader icon={<Settings size={16} color="#d4667a" />} title={t.rules} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {([
              { key: 'max_freeze_days',        label: t.maxFreeze,        suffix: t.days },
              { key: 'absence_hide_threshold', label: t.absenceThreshold, suffix: t.absences },
            ] as const).map(field => (
              <div key={field.key}>
                <label style={lbl}>{field.label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    value={form[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    style={{ ...inp, width: 80 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--txt2)', flexShrink: 0 }}>{field.suffix}</span>
                  <SaveBtn id={field.key} label={t.save} savedLabel={t.saved} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── GPS ── */}
        <div style={card}>
          <SectionHeader icon={<MapPin size={16} color="#6EB4C8" />} title={t.gps} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>{t.lat}</label>
              <input value={form.academy_lat}
                onChange={e => setForm(f => ({ ...f, academy_lat: e.target.value }))}
                placeholder="30.0444" style={{ ...inp, direction: 'ltr' }} />
            </div>
            <div>
              <label style={lbl}>{t.lng}</label>
              <input value={form.academy_lng}
                onChange={e => setForm(f => ({ ...f, academy_lng: e.target.value }))}
                placeholder="31.2357" style={{ ...inp, direction: 'ltr' }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>{t.radius}</label>
            <input type="number" value={form.allowed_radius_meters}
              onChange={e => setForm(f => ({ ...f, allowed_radius_meters: e.target.value }))}
              style={{ ...inp, width: 140 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={getCurrentLocation} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--txt2)',
            }}>
              <MapPin size={14} /> {t.useMyLocation}
            </button>
            <SaveBtn id="gps" label={t.saveGps} savedLabel={t.savedGps} />
          </div>
        </div>

        {/* ── Levels (hidden — managed via database grades & terms) ── */}
        {/* <div style={card}>
          <SectionHeader
            icon={<BookOpen size={16} color="#C8A66E" />}
            title={t.levels}
            badge={`${levels.length}`}
          />

          {levels.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--txt2)', opacity: 0.6, textAlign: 'center', padding: '20px 0' }}>
              {t.noLevels}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {levels.map((l, i) => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--bg-page)',
                  border: '1px solid var(--border)', borderRadius: 10,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: LEVEL_COLORS[i % LEVEL_COLORS.length] + '20',
                    border: `1.5px solid ${LEVEL_COLORS[i % LEVEL_COLORS.length]}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: LEVEL_COLORS[i % LEVEL_COLORS.length],
                  }}>{l.order_num}</div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>{l.name}</span>
                  <button onClick={() => deleteLevel(l.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--txt2)', padding: 4, borderRadius: 6,
                    display: 'flex', alignItems: 'center', opacity: 0.4,
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {addingLevel ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input autoFocus value={newLevel}
                onChange={e => setNewLevel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLevel()}
                placeholder={t.newLevelPlaceholder}
                style={{ ...inp, flex: 1 }} />
              <button onClick={addLevel} style={{
                padding: '9px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', background: '#d4667a', color: '#fff',
              }}>{t.add}</button>
              <button onClick={() => { setAddingLevel(false); setNewLevel('') }} style={{
                padding: '9px 14px', borderRadius: 9, fontSize: 12,
                cursor: 'pointer', border: '1px solid var(--border)',
                background: 'var(--bg-page)', color: 'var(--txt2)',
              }}>{t.cancel}</button>
            </div>
          ) : (
            <button onClick={() => setAddingLevel(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: '1px dashed var(--border)',
              background: 'transparent', color: 'var(--txt2)',
            }}>
              <Plus size={14} /> {t.addLevel}
            </button>
          )}
        </div> */}

        {/* ── Subscription Plans ── */}
        <div style={card}>
          <SectionHeader
            icon={<CreditCard size={16} color="#6EC88B" />}
            title={t.plans}
            badge={`${plans.length}`}
          />

          {plans.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--txt2)', opacity: 0.6, textAlign: 'center', padding: '20px 0' }}>
              {t.noPlans}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {plans.map(plan => (
                editingPlanId === plan.id ? (
                  /* ── Inline edit row ── */
                  <div key={plan.id} style={{
                    background: 'var(--bg-page)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={lbl}>{t.planName}</label>
                        <input autoFocus value={editPlan.name}
                          onChange={e => setEditPlan(p => ({ ...p, name: e.target.value }))}
                          style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>{t.sessions}</label>
                        <input type="number" value={editPlan.sessions_count}
                          onChange={e => setEditPlan(p => ({ ...p, sessions_count: e.target.value }))}
                          style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>{t.price}</label>
                        <input type="number" value={editPlan.price}
                          onChange={e => setEditPlan(p => ({ ...p, price: e.target.value }))}
                          style={inp} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={saveEditPlan} style={{
                        padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', border: 'none',
                        background: savedPlanId === plan.id ? '#3dab7e18' : '#d4667a',
                        color:      savedPlanId === plan.id ? '#3dab7e'   : '#fff',
                        transition: 'all .15s',
                      }}>
                        {savedPlanId === plan.id ? t.savedEdit : <><Save size={12} style={{ display: 'inline', marginInlineEnd: 5 }} />{t.saveEdit}</>}
                      </button>
                      <button onClick={() => setEditingPlanId(null)} style={{
                        padding: '8px 14px', borderRadius: 9, fontSize: 12,
                        cursor: 'pointer', border: '1px solid var(--border)',
                        background: 'var(--bg-page)', color: 'var(--txt2)',
                      }}>{t.cancel}</button>
                    </div>
                  </div>
                ) : (
                  /* ── View row ── */
                  <div key={plan.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', background: 'var(--bg-page)',
                    border: '1px solid var(--border)', borderRadius: 10,
                  }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--txt1)' }}>{plan.name}</span>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                      background: '#6EB4C820', color: '#6EB4C8', border: '1px solid #6EB4C830',
                    }}>
                      {plan.sessions_count} {plan.sessions_count === 1 ? t.session : t.sessionsLabel}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#6EC88B', whiteSpace: 'nowrap' }}>
                      {plan.price.toLocaleString()} {t.currency}
                    </span>
                    <button onClick={() => startEditPlan(plan)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--txt2)', padding: 4, borderRadius: 6,
                      display: 'flex', alignItems: 'center', opacity: 0.5,
                    }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deletePlan(plan.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--txt2)', padding: 4, borderRadius: 6,
                      display: 'flex', alignItems: 'center', opacity: 0.4,
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              ))}
            </div>
          )}

          {addingPlan ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px auto auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={lbl}>{t.planName}</label>
                <input autoFocus value={newPlan.name}
                  onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))}
                  placeholder={t.planNamePlaceholder} style={inp} />
              </div>
              <div>
                <label style={lbl}>{t.sessions}</label>
                <input type="number" value={newPlan.sessions_count}
                  onChange={e => setNewPlan(p => ({ ...p, sessions_count: e.target.value }))}
                  placeholder="8" style={inp} />
              </div>
              <div>
                <label style={lbl}>{t.price}</label>
                <input type="number" value={newPlan.price}
                  onChange={e => setNewPlan(p => ({ ...p, price: e.target.value }))}
                  placeholder="800" style={inp} />
              </div>
              <button onClick={addPlan} style={{
                padding: '9px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', background: '#d4667a', color: '#fff',
              }}>{t.add}</button>
              <button onClick={() => { setAddingPlan(false); setNewPlan({ name: '', sessions_count: '', price: '' }) }} style={{
                padding: '9px 14px', borderRadius: 9, fontSize: 12,
                cursor: 'pointer', border: '1px solid var(--border)',
                background: 'var(--bg-page)', color: 'var(--txt2)',
              }}>{t.cancel}</button>
            </div>
          ) : (
            <button onClick={() => setAddingPlan(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: '1px dashed var(--border)',
              background: 'transparent', color: 'var(--txt2)',
            }}>
              <Plus size={14} /> {t.addPlan}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
