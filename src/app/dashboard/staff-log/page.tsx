import { createClient } from '@/lib/supabase/server'
import { getLocale, getTranslations } from 'next-intl/server'
import { AlertTriangle, Clock, Users, Activity } from 'lucide-react'
import { DeviceBadge, LocationBadge } from '@/components/PresenceBadges'
import { TZ, cairoDayRange, cairoToday, fmtDuration, isLive, sessionEnd } from '@/lib/staffClock'
import DayPicker from './DayPicker'

export const dynamic = 'force-dynamic'

type Log = {
  id: string
  staff_id: string
  login_time: string
  logout_time: string | null
  last_seen: string | null
  hours_on_shift: number | null
  location_status: string | null
  login_distance_m: number | null
  login_device: string | null
  notes: string | null
  staff: { name: string | null; name_en: string | null; role: string | null } | null
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: '#d4667a',
  admin:       '#7c5cdb',
  staff:       '#4a90d9',
}

export default async function StaffLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const t        = await getTranslations('staffLog')
  const locale   = await getLocale()
  const isRtl    = locale === 'ar'
  const params   = await searchParams
  const supabase = await createClient()

  const today = cairoToday()
  const date  = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today ? params.date : today
  const [start, end] = cairoDayRange(date)

  const { data } = await supabase
    .from('staff_attendance')
    .select('*, staff:staff(name, name_en, role)')
    .gte('login_time', start.toISOString())
    .lt('login_time', end.toISOString())
    .order('login_time', { ascending: false })
  const logs = (data ?? []) as Log[]

  // ── Per-row figures + day totals ─────────────────────────────────────
  const rows = logs.map(log => {
    const live    = isLive(log)
    const endMs   = sessionEnd(log)
    const startMs = new Date(log.login_time).getTime()
    const ms      = log.hours_on_shift != null && !live ? Number(log.hours_on_shift) * 3600000 : endMs - startMs
    return { log, live, endMs, ms, autoClosed: !live && !log.logout_time }
  })

  const people   = new Set(logs.map(l => l.staff_id)).size
  const working  = rows.filter(r => r.live).length
  const totalMs  = rows.reduce((s, r) => s + r.ms, 0)
  const flagged  = logs.filter(l => l.location_status === 'invalid' || l.location_status === 'denied').length

  const dtLocale = isRtl ? 'ar-EG' : 'en-GB'
  const fmtTime  = (at: number | string) =>
    new Date(at).toLocaleTimeString(dtLocale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const dayLabel = new Date(start).toLocaleDateString(dtLocale, {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  })
  const duration = (ms: number) => {
    const s = fmtDuration(ms)
    return isRtl ? s.replace('h', ' س').replace('m', ' د') : s
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px',
  }
  const pill = (color: string): React.CSSProperties => ({
    background: `${color}18`, color, border: `1px solid ${color}28`, borderRadius: 20,
    padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  })
  const th: React.CSSProperties = {
    textAlign: 'start', color: 'var(--txt2)', fontSize: 11, fontWeight: 600,
    padding: '11px 16px', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, whiteSpace: 'nowrap' }

  const stats = [
    { icon: Users,         label: t('stats.people'),  value: String(people),       color: '#4a90d9' },
    { icon: Activity,      label: t('stats.working'), value: String(working),      color: '#3dab7e' },
    { icon: Clock,         label: t('stats.hours'),   value: duration(totalMs),    color: '#7c5cdb' },
    { icon: AlertTriangle, label: t('stats.flagged'), value: String(flagged),      color: flagged > 0 ? '#e8960a' : 'var(--txt2)' },
  ]

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)', background: 'var(--bg-page)', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt1)', margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '4px 0 0' }}>{t('subtitle')}</p>
        </div>
        <DayPicker
          date={date}
          today={today}
          label={date === today ? `${t('today')} · ${dayLabel}` : dayLabel}
          isRtl={isRtl}
          L={{ prev: t('prevDay'), next: t('nextDay'), today: t('today'), pick: t('pickDate') }}
        />
      </div>

      {/* Day summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: color.startsWith('#') ? `${color}14` : 'var(--bg2)',
            }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--txt2)' }}>{label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--txt1)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 16px', color: 'var(--txt2)' }}>
            <Clock size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 13 }}>{t('noLogs')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                  <th style={th}>{t('employee')}</th>
                  <th style={th}>{t('loginTime')}</th>
                  <th style={th}>{t('logoutTime')}</th>
                  <th style={th}>{t('workHours')}</th>
                  <th style={th}>{t('location')}</th>
                  <th style={th}>{t('device')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ log, live, endMs, ms, autoClosed }) => {
                  const name  = (isRtl ? (log.staff?.name || log.staff?.name_en) : (log.staff?.name_en || log.staff?.name)) || '—'
                  const role  = log.staff?.role || 'staff'
                  const color = ROLE_COLOR[role] || ROLE_COLOR.staff
                  const flag  = log.location_status === 'invalid' || log.location_status === 'denied'
                  return (
                    <tr key={log.id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: flag ? 'rgba(224,64,64,0.04)' : undefined,
                    }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 16,
                              background: `${color}18`, border: `1px solid ${color}30`, color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700,
                            }}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            {live && (
                              <span style={{
                                position: 'absolute', bottom: -1, insetInlineEnd: -1,
                                width: 10, height: 10, borderRadius: 5,
                                background: '#3dab7e', border: '2px solid var(--bg-card)',
                              }} />
                            )}
                          </div>
                          <div>
                            <p style={{ margin: 0, color: 'var(--txt1)', fontSize: 13, fontWeight: 600 }}>{name}</p>
                            <p style={{ margin: 0, color: 'var(--txt2)', fontSize: 11 }}>
                              {t(`role.${role in ROLE_COLOR ? role : 'staff'}`)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, color: 'var(--txt1)', fontWeight: 500 }}>{fmtTime(log.login_time)}</td>
                      <td style={td}>
                        {live ? (
                          <span style={pill('#3dab7e')}>
                            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#3dab7e' }} />
                            {t('working')}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--txt1)', fontWeight: 500 }}>{fmtTime(endMs)}</span>
                            {autoClosed && (
                              <span style={{ ...pill('#8a8a9a'), padding: '1px 8px', fontSize: 10 }} title={t('autoClosedHint')}>
                                {t('autoClosed')}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td style={td}>
                        <span style={{ color: live ? '#3dab7e' : 'var(--txt1)', fontWeight: 600 }}>{duration(ms)}</span>
                        {live && <span style={{ color: 'var(--txt2)', fontSize: 11, marginInlineStart: 6 }}>{t('soFar')}</span>}
                      </td>
                      <td style={td}>
                        <LocationBadge status={log.location_status} distance={log.login_distance_m}
                          note={log.notes} live={live} isRtl={isRtl} />
                      </td>
                      <td style={td}>
                        <DeviceBadge device={log.login_device} isRtl={isRtl} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
