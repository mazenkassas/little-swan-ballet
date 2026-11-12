// Badges for clock-in location and device, shared by the staff and coach logs.
import { Monitor, Smartphone } from 'lucide-react'

const pill = (color: string): React.CSSProperties => ({
  background: `${color}18`, color, border: `1px solid ${color}28`,
  borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  display: 'inline-flex', alignItems: 'center', gap: 4,
})

export function LocationBadge({ status, distance, isRtl }: {
  status: string | null | undefined
  distance?: number | null
  isRtl: boolean
}) {
  const dist = distance != null ? ` · ${distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`}` : ''
  if (status === 'valid') return <span style={pill('#3dab7e')}>{isRtl ? 'داخل الأكاديمية' : 'At academy'}</span>
  if (status === 'invalid') return <span style={pill('#e04040')} dir="auto">{isRtl ? 'خارج الأكاديمية' : 'Outside academy'}{dist}</span>
  if (status === 'denied') return <span style={pill('#e04040')}>{isRtl ? 'الموقع مرفوض' : 'Location blocked'}</span>
  return <span style={pill('#8a8a9a')}>{isRtl ? 'غير معروف' : 'Unknown'}</span>
}

export function DeviceBadge({ device, isRtl }: { device: string | null | undefined; isRtl: boolean }) {
  if (device === 'mobile') return <span style={pill('#7c5cdb')}><Smartphone size={12} />{isRtl ? 'موبايل' : 'Mobile'}</span>
  if (device === 'desktop') return <span style={pill('#4a90d9')}><Monitor size={12} />{isRtl ? 'ويب' : 'Website'}</span>
  return <span style={{ color: 'var(--txt2)', fontSize: 12 }}>—</span>
}
