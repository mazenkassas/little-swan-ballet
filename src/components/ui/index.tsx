import { ReactNode, CSSProperties } from 'react'

// ── Card ──────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: 'var(--card)', border: '0.5px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt)' }}>{title}</span>
      {action}
    </div>
  )
}

export function CardBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ padding: '16px 18px', ...style }}>{children}</div>
}

// ── Page Header ───────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--txt)', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Primary Button ────────────────────────────────────────
export function PrimaryBtn({ children, onClick, href, type = 'button', disabled }: {
  children: ReactNode; onClick?: () => void; href?: string
  type?: 'button' | 'submit'; disabled?: boolean
}) {
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: 'var(--pk)', color: '#fff', border: 'none',
    borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
    textDecoration: 'none', transition: 'opacity .15s', flexShrink: 0,
  }
  if (href) return <a href={href} style={style}>{children}</a>
  return <button type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>
}

// ── Ghost Button ──────────────────────────────────────────
export function GhostBtn({ children, onClick, href }: {
  children: ReactNode; onClick?: () => void; href?: string
}) {
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: 'var(--bg2)', color: 'var(--txt2)',
    border: '0.5px solid var(--border)', borderRadius: 9,
    padding: '9px 18px', fontSize: 13, cursor: 'pointer',
    textDecoration: 'none', transition: 'background .15s', flexShrink: 0,
  }
  if (href) return <a href={href} style={style}>{children}</a>
  return <button type="button" onClick={onClick} style={style}>{children}</button>
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 12, color: 'var(--txt2)', marginBottom: 5 }}>{label}{required && <span style={{ color: 'var(--pk)', marginRight: 2 }}>*</span>}</label>}
      <input
        {...props}
        required={required}
        style={{
          width: '100%', background: 'var(--bg2)', border: '0.5px solid var(--border)',
          borderRadius: 9, padding: '10px 13px', fontSize: 13, color: 'var(--txt)',
          outline: 'none', transition: 'border .15s',
          ...(props.style || {}),
        }}
      />
    </div>
  )
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, required, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 12, color: 'var(--txt2)', marginBottom: 5 }}>{label}{required && <span style={{ color: 'var(--pk)', marginRight: 2 }}>*</span>}</label>}
      <select
        {...props}
        required={required}
        style={{
          width: '100%', background: 'var(--bg2)', border: '0.5px solid var(--border)',
          borderRadius: 9, padding: '10px 13px', fontSize: 13, color: 'var(--txt)',
          outline: 'none', appearance: 'none', cursor: 'pointer',
          ...(props.style || {}),
        }}
      >
        {children}
      </select>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'var(--green-bg)',  color: 'var(--green)',  label: 'نشطة' },
    frozen:    { bg: 'var(--pk-light)',  color: 'var(--pk-dark)', label: 'مجمدة' },
    inactive:  { bg: 'var(--bg3)',       color: 'var(--txt3)',   label: 'غير نشطة' },
    present:   { bg: 'var(--green-bg)',  color: 'var(--green)',  label: 'حاضرة' },
    absent:    { bg: '#FFF0F2',          color: 'var(--pk-dark)', label: 'غائبة' },
    make_up:   { bg: 'var(--blue-bg)',   color: 'var(--blue)',   label: 'تعويض' },
    paid:      { bg: 'var(--green-bg)',  color: 'var(--green)',  label: 'دفعت' },
    partial:   { bg: 'var(--amber-bg)', color: 'var(--amber)',  label: 'جزئي' },
    unpaid:    { bg: '#FFF0F2',          color: 'var(--pk-dark)', label: 'لم تدفع' },
    pending:   { bg: 'var(--amber-bg)', color: 'var(--amber)',  label: 'قيد الانتظار' },
    approved:  { bg: 'var(--green-bg)', color: 'var(--green)',  label: 'موافق' },
    rejected:  { bg: '#FFF0F2',         color: 'var(--pk-dark)', label: 'مرفوض' },
    scheduled: { bg: 'var(--bg3)',      color: 'var(--txt2)',   label: 'مجدولة' },
    completed: { bg: 'var(--green-bg)', color: 'var(--green)',  label: 'منتهية' },
    cancelled: { bg: '#FFF0F2',         color: 'var(--pk-dark)', label: 'ملغية' },
    pass:      { bg: 'var(--green-bg)', color: 'var(--green)',  label: 'ناجح' },
    fail:      { bg: '#FFF0F2',         color: 'var(--pk-dark)', label: 'راسب' },
    valid:     { bg: 'var(--green-bg)', color: 'var(--green)',  label: 'صحيح' },
    invalid:   { bg: 'var(--amber-bg)',color: 'var(--amber)',   label: 'مشكوك' },
  }
  const s = map[status] || { bg: 'var(--bg3)', color: 'var(--txt3)', label: status }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'var(--pk-light)',  color: 'var(--pk-dark)' },
  { bg: 'var(--green-bg)',  color: 'var(--green)' },
  { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  { bg: 'var(--blue-bg)',  color: 'var(--blue)' },
]

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  const c = AVATAR_COLORS[idx]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 500, flexShrink: 0,
    }}>
      {name[0]}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────
export function StatCard({ label, value, sub, iconBg, icon }: {
  label: string; value: string | number; sub?: string
  iconBg?: string; icon?: ReactNode
}) {
  return (
    <div style={{
      background: 'var(--card)', border: '0.5px solid var(--border)',
      borderRadius: 12, padding: 16,
    }}>
      {icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: iconBg || 'var(--pk-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--txt)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────
export function Alert({ children, type = 'warn' }: { children: ReactNode; type?: 'warn' | 'danger' | 'info' }) {
  const colors = {
    warn:   { bg: 'var(--amber-bg)', color: 'var(--amber)',   dot: 'var(--amber)' },
    danger: { bg: '#FFF0F2',         color: 'var(--pk-dark)', dot: 'var(--pk)' },
    info:   { bg: 'var(--blue-bg)',  color: 'var(--blue)',    dot: 'var(--blue)' },
  }
  const c = colors[type]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: c.bg, borderRadius: 8, padding: '9px 12px', marginBottom: 6,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      <div style={{ fontSize: 12, color: c.color, flex: 1 }}>{children}</div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--txt3)', fontSize: 13 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--pk-light)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pk)" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
      </div>
      {message}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
            {headers.map(h => (
              <th key={h} style={{
                textAlign: 'right', padding: '10px 16px',
                fontSize: 11, fontWeight: 500, color: 'var(--txt3)',
                textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody style={{ fontSize: 13, color: 'var(--txt)' }}>
          {children}
        </tbody>
      </table>
    </div>
  )
}

export function Tr({ children, href }: { children: ReactNode; href?: string }) {
  return (
    <tr
      style={{
        borderBottom: '0.5px solid var(--border)', cursor: href ? 'pointer' : 'default',
        transition: 'background .1s',
      }}
      onClick={href ? () => window.location.href = href : undefined}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </tr>
  )
}

export function Td({ children, muted, right }: { children: ReactNode; muted?: boolean; right?: boolean }) {
  return (
    <td style={{
      padding: '11px 16px', color: muted ? 'var(--txt3)' : 'var(--txt)',
      textAlign: right ? 'left' : 'right', verticalAlign: 'middle',
    }}>
      {children}
    </td>
  )
}
