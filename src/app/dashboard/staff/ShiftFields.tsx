'use client'
// Working hours (shift start/end + working days) for an admin/staff member.
import { WEEK_DAYS } from '@/lib/staffClock'

export type Shift = { shift_start: string; shift_end: string; work_days: number[] }

export function shiftError(s: Shift, isRtl: boolean): string | undefined {
  if (!s.shift_start || !s.shift_end) return isRtl ? 'حدد بداية ونهاية الدوام' : 'Set the shift start and end'
  if (s.shift_end <= s.shift_start) return isRtl ? 'نهاية الدوام يجب أن تكون بعد بدايته' : 'Shift end must be after shift start'
  if (s.work_days.length === 0) return isRtl ? 'اختر يوم عمل واحد على الأقل' : 'Pick at least one working day'
  return undefined
}

export default function ShiftFields({
  value, onChange, isRtl, error,
}: {
  value: Shift
  onChange: (next: Shift) => void
  isRtl: boolean
  error?: string
}) {
  const L = isRtl
    ? { title: 'ساعات العمل', start: 'بداية الدوام', end: 'نهاية الدوام', days: 'أيام العمل',
        hint: 'تُستخدم لمعرفة إن كان الموظف حاضرًا في مواعيده (سماح 15 دقيقة).' }
    : { title: 'Working Hours', start: 'Shift Start', end: 'Shift End', days: 'Working Days',
        hint: 'Used to check whether this person is present on time (15-minute grace).' }

  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }
  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-page)', border: `1px solid ${error ? '#e04040' : 'var(--border)'}`,
    borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--txt1)',
    outline: 'none', fontFamily: 'inherit', colorScheme: 'light dark',
  }

  function toggleDay(d: number) {
    const has = value.work_days.includes(d)
    onChange({ ...value, work_days: has ? value.work_days.filter(x => x !== d) : [...value.work_days, d].sort() })
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4, marginBottom: 14 }}>
      <p style={{ color: 'var(--txt1)', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>🕘 {L.title}</p>
      <p style={{ color: 'var(--txt2)', fontSize: 11, margin: '0 0 12px' }}>{L.hint}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={lbl}>{L.start}<span style={{ color: '#e04040' }}> *</span></label>
          <input type="time" value={value.shift_start} dir="ltr" style={inp}
            onChange={e => onChange({ ...value, shift_start: e.target.value })} />
        </div>
        <div>
          <label style={lbl}>{L.end}<span style={{ color: '#e04040' }}> *</span></label>
          <input type="time" value={value.shift_end} dir="ltr" style={inp}
            onChange={e => onChange({ ...value, shift_end: e.target.value })} />
        </div>
      </div>

      <label style={lbl}>{L.days}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {WEEK_DAYS.map(day => {
          const on = value.work_days.includes(day.d)
          return (
            <button key={day.d} type="button" onClick={() => toggleDay(day.d)} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: on ? '#d4667a' : 'var(--bg-page)',
              color: on ? '#fff' : 'var(--txt2)',
              border: `1px solid ${on ? '#d4667a' : 'var(--border)'}`,
            }}>
              {isRtl ? day.ar : day.en}
            </button>
          )
        })}
      </div>

      {error && <p style={{ fontSize: 11, color: '#e04040', marginTop: 6 }}>⚠ {error}</p>}
    </div>
  )
}
