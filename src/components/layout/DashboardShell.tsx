'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

type UserInfo = { displayName: string; role: string; email: string; initials: string }

export default function DashboardShell({
  user,
  topbarActions,
  children,
}: {
  user: UserInfo
  topbarActions: React.ReactNode
  children: React.ReactNode
}) {
  const [mobOpen, setMobOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Mobile overlay */}
      <div
        className={`mob-overlay${mobOpen ? ' open' : ''}`}
        onClick={() => setMobOpen(false)}
      />

      <Sidebar user={user} mobileOpen={mobOpen} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div
          className="dash-topbar"
          style={{
            height: 52,
            background: 'var(--surface)',
            borderBottom: '0.5px solid var(--border)',
            padding: '0 24px',
          }}
        >
          <div className="mob-hamburger">
            <button
              onClick={() => setMobOpen(true)}
              aria-label="Open navigation menu"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt2)', padding: 6, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <Menu size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {topbarActions}
          </div>
        </div>

        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-page)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
