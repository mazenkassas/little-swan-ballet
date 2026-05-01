'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'

/* ─── Data model ─────────────────────────────────────────────────── */
type Perm    = { view: boolean; create: boolean; edit: boolean; delete: boolean }
type RoleMap = Record<string, Perm>
type AllPerms = Record<string, RoleMap>

const ACTIONS = ['view', 'create', 'edit', 'delete'] as const
type Action = typeof ACTIONS[number]

const ROLES = [
  { key: 'staff', en: 'Staff',  ar: 'موظف' },
  { key: 'coach', en: 'Coach',  ar: 'مدربة' },
]

const GROUPS = [
  { key: 'main',       en: 'Main',       ar: 'الرئيسي' },
  { key: 'financial',  en: 'Financial',  ar: 'مالي'     },
  { key: 'management', en: 'Management', ar: 'إدارة'    },
  { key: 'other',      en: 'Other',      ar: 'أخرى'     },
]

const PAGES = [
  { key: 'dashboard',  group: 'main',       en: 'Dashboard',       ar: 'لوحة التحكم'     },
  { key: 'daily',      group: 'main',       en: 'Daily',           ar: 'اليومية'          },
  { key: 'students',   group: 'main',       en: 'Students',        ar: 'الطالبات'         },
  { key: 'classes',    group: 'main',       en: 'Groups',          ar: 'المجموعات'        },
  { key: 'attendance', group: 'main',       en: 'Attendance',      ar: 'الحضور'           },
  { key: 'payments',   group: 'financial',  en: 'Payments',        ar: 'المدفوعات'        },
  { key: 'expenses',   group: 'financial',  en: 'Expenses',        ar: 'المصروفات'        },
  { key: 'reports',    group: 'financial',  en: 'Reports',         ar: 'التقارير'         },
  { key: 'staff',      group: 'management', en: 'Staff',           ar: 'الموظفون'         },
  { key: 'coaches',    group: 'management', en: 'Coaches',         ar: 'المدربات'         },
  { key: 'exams',      group: 'management', en: 'Exams',           ar: 'الامتحانات'       },
  { key: 'inventory',  group: 'management', en: 'Inventory',       ar: 'المخزون'          },
  { key: 'events',     group: 'management', en: 'Events',          ar: 'الفعاليات'        },
  { key: 'private',    group: 'management', en: 'Private Lessons', ar: 'البرايفيت'        },
  { key: 'settings',   group: 'other',      en: 'Settings',        ar: 'الإعدادات'        },
]

function normalizePerms(raw: any): AllPerms {
  const out: AllPerms = {}
  for (const role of ROLES) {
    out[role.key] = {}
    for (const page of PAGES) {
      out[role.key][page.key] = {
        view:   raw?.[role.key]?.[page.key]?.view   ?? false,
        create: raw?.[role.key]?.[page.key]?.create ?? false,
        edit:   raw?.[role.key]?.[page.key]?.edit   ?? false,
        delete: raw?.[role.key]?.[page.key]?.delete ?? false,
      }
    }
  }
  return out
}

/* ─── Translations ───────────────────────────────────────────────── */
const L = {
  en: {
    title: 'Roles & Permissions',
    sub: 'Control what each role can see and do',
    save: 'Save Changes',
    saved: 'Saved ✓',
    screen: 'Screen',
    view: 'View', create: 'Add', edit: 'Edit', delete: 'Delete',
    selectAll: 'All',
    hint: 'Toggle all',
  },
  ar: {
    title: 'الأدوار والصلاحيات',
    sub: 'تحكّم فيما تراه وتفعله كل وظيفة',
    save: 'حفظ التغييرات',
    saved: 'تم الحفظ ✓',
    screen: 'الشاشة',
    view: 'عرض', create: 'إضافة', edit: 'تعديل', delete: 'حذف',
    selectAll: 'الكل',
    hint: 'تبديل الكل',
  },
}

/* ─── Toggle component ───────────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={onChange}
      style={{
        width: 34, height: 18, borderRadius: 18, cursor: 'pointer',
        background: on ? '#d4667a' : 'var(--border)',
        position: 'relative', transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 16 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff', transition: 'left 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
      }} />
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function RolesForm({
  permissions: initialPerms,
  locale,
}: {
  permissions: any
  locale: string
}) {
  const supabase   = createClient()
  const isRtl      = locale === 'ar'
  const t          = L[isRtl ? 'ar' : 'en']

  const [perms,      setPerms]      = useState<AllPerms>(normalizePerms(initialPerms))
  const [activeRole, setActiveRole] = useState('staff')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  function toggle(role: string, page: string, action: Action) {
    setPerms(p => ({
      ...p,
      [role]: { ...p[role], [page]: { ...p[role][page], [action]: !p[role][page][action] } },
    }))
  }

  function toggleRow(role: string, page: string) {
    const cur   = perms[role][page]
    const allOn = ACTIONS.every(a => cur[a])
    const next  = { view: !allOn, create: !allOn, edit: !allOn, delete: !allOn }
    setPerms(p => ({ ...p, [role]: { ...p[role], [page]: next } }))
  }

  function toggleGroup(role: string, groupKey: string) {
    const pages  = PAGES.filter(p => p.group === groupKey)
    const allOn  = pages.every(p => ACTIONS.every(a => perms[role][p.key][a]))
    const next   = { view: !allOn, create: !allOn, edit: !allOn, delete: !allOn }
    setPerms(p => {
      const updated = { ...p[role] }
      pages.forEach(pg => { updated[pg.key] = next })
      return { ...p, [role]: updated }
    })
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('system_settings').upsert({
      key: 'role_permissions',
      value: JSON.stringify(perms),
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const rolePerms = perms[activeRole]

  const colW = '72px'
  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `1fr repeat(4, ${colW}) 40px`,
    alignItems: 'center',
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>

      {/* ── Header ── */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.sub}
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{t.title}</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer', border: 'none',
              background: saved ? '#3dab7e18' : '#d4667a',
              color: saved ? '#3dab7e' : '#fff',
              transition: 'all .15s',
            }}
          >
            <Save size={14} />
            {saved ? t.saved : t.save}
          </button>
        </div>

        {/* ── Role Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {ROLES.map(r => (
            <button
              key={r.key}
              onClick={() => setActiveRole(r.key)}
              style={{
                padding: '10px 22px', fontSize: 13, border: 'none',
                background: 'none', cursor: 'pointer',
                fontWeight: activeRole === r.key ? 600 : 400,
                color: activeRole === r.key ? '#d4667a' : 'var(--txt2)',
                borderBottom: activeRole === r.key ? '2px solid #d4667a' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {isRtl ? r.ar : r.en}
            </button>
          ))}
        </div>
      </div>

      {/* ── Permissions table ── */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>

          {/* Column headers */}
          <div style={{
            ...grid,
            padding: '10px 20px',
            background: 'var(--bg-page)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {t.screen}
            </span>
            {ACTIONS.map(a => (
              <span key={a} style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>
                {t[a]}
              </span>
            ))}
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>
              {t.selectAll}
            </span>
          </div>

          {/* Groups + rows */}
          {GROUPS.map((group, gi) => {
            const pages = PAGES.filter(p => p.group === group.key)
            if (pages.length === 0) return null
            const groupAllOn = pages.every(p => ACTIONS.every(a => rolePerms[p.key][a]))
            return (
              <div key={group.key}>
                {/* Group separator row */}
                <div style={{
                  ...grid,
                  padding: '7px 20px',
                  background: 'var(--bg-page)',
                  borderTop: gi > 0 ? '1px solid var(--border)' : undefined,
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt2)', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {isRtl ? group.ar : group.en}
                  </span>
                  {/* Spacer for action columns */}
                  {ACTIONS.map(a => <span key={a} />)}
                  {/* Group toggle-all */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Toggle on={groupAllOn} onChange={() => toggleGroup(activeRole, group.key)} />
                  </div>
                </div>

                {/* Page rows */}
                {pages.map((page, pi) => {
                  const perm   = rolePerms[page.key]
                  const rowOn  = ACTIONS.every(a => perm[a])
                  const rowAny = ACTIONS.some(a => perm[a])
                  return (
                    <div
                      key={page.key}
                      style={{
                        ...grid,
                        padding: '12px 20px',
                        borderBottom: pi < pages.length - 1 ? '1px solid var(--border)' : undefined,
                        background: rowOn ? '#d4667a07' : rowAny ? '#d4667a03' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: rowAny ? 600 : 400, color: rowAny ? 'var(--txt1)' : 'var(--txt2)' }}>
                        {isRtl ? page.ar : page.en}
                      </span>
                      {ACTIONS.map(action => (
                        <div key={action} style={{ display: 'flex', justifyContent: 'center' }}>
                          <Toggle on={perm[action]} onChange={() => toggle(activeRole, page.key, action)} />
                        </div>
                      ))}
                      {/* Row toggle-all */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Toggle on={rowOn} onChange={() => toggleRow(activeRole, page.key)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <p style={{ fontSize: 11, color: 'var(--txt2)', opacity: 0.6, marginTop: 12 }}>
          {isRtl
            ? 'عمود "الكل" يفعّل أو يعطّل جميع الصلاحيات للشاشة دفعة واحدة.'
            : 'The "All" column toggles every permission for that screen at once.'}
        </p>
      </div>
    </div>
  )
}
