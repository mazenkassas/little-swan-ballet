import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { MapPin, Clock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function StaffLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const t = await getTranslations('staffLog')
  const params = await searchParams
  const supabase = await createClient()
  const today = params.date || format(new Date(), 'yyyy-MM-dd')

  const { data: logs } = await supabase
    .from('staff_attendance')
    .select('*, staff:staff(name, role)')
    .gte('login_time', today + 'T00:00:00')
    .lte('login_time', today + 'T23:59:59')
    .order('login_time', { ascending: false })

  return (
    <div style={{ padding: 32, background: 'var(--bg-page)', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 4 }}>{t('subtitle')}</p>
        </div>
        <form>
          <input
            type="date"
            name="date"
            defaultValue={today}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: 'var(--txt2)', outline: 'none' }}
          />
        </form>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-right px-6 py-4 text-xs uppercase tracking-wider" style={{ color: 'var(--txt2)' }}>{t('employee')}</th>
              <th className="text-right px-4 py-4 text-xs uppercase tracking-wider" style={{ color: 'var(--txt2)' }}>{t('loginTime')}</th>
              <th className="text-right px-4 py-4 text-xs uppercase tracking-wider" style={{ color: 'var(--txt2)' }}>{t('logoutTime')}</th>
              <th className="text-right px-4 py-4 text-xs uppercase tracking-wider" style={{ color: 'var(--txt2)' }}>{t('workHours')}</th>
              <th className="text-right px-4 py-4 text-xs uppercase tracking-wider" style={{ color: 'var(--txt2)' }}>{t('location')}</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log: any) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: log.location_status === 'invalid' ? 'rgba(245,158,11,0.04)' : undefined,
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <td className="px-6 py-4">
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1)', margin: 0 }}>{log.staff?.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '2px 0 0' }}>
                    {log.staff?.role === 'super_admin' ? t('role.super_admin') : log.staff?.role === 'admin' ? t('role.admin') : t('role.staff')}
                  </p>
                </td>
                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--txt2)' }}>
                  {log.login_time ? new Date(log.login_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--txt2)' }}>
                  {log.logout_time ? new Date(log.logout_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : (
                    <span className="text-emerald-500 text-xs">{t('working')}</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {log.hours_on_shift ? (
                    <span className="text-violet-500 text-sm font-medium flex items-center gap-1">
                      <Clock size={13} />
                      {log.hours_on_shift.toFixed(1)} {t('hoursUnit')}
                    </span>
                  ) : <span style={{ color: 'var(--txt2)' }}>—</span>}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${
                    log.location_status === 'valid'
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                      : log.location_status === 'invalid'
                      ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                      : ''
                  }`}
                    style={!log.location_status || log.location_status === 'unknown'
                      ? { color: 'var(--txt2)', background: 'var(--bg2)', borderColor: 'var(--border)' }
                      : undefined}
                  >
                    <MapPin size={10} />
                    {log.location_status === 'valid' ? t('locationIn') : log.location_status === 'invalid' ? t('locationOut') : t('locationUnknown')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div style={{ textAlign: 'center', padding: '64px 0', fontSize: 13, color: 'var(--txt2)', opacity: 0.6 }}>
            {t('noLogs')}
          </div>
        )}
      </div>
    </div>
  )
}
