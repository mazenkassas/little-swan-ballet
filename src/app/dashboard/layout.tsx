import Sidebar from '@/components/layout/Sidebar'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FDFAF8' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          height: 52, background: '#FFFFFF', borderBottom: '0.5px solid #EDD8DC',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 24px', gap: 10, flexShrink: 0,
        }}>
          <ThemeToggle />
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#F5E6EA', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#8B4A58',
          }}>أد</div>
        </div>
        <main style={{ flex: 1, overflowY: 'auto', background: '#FDFAF8' }}>
          {children}
        </main>
      </div>
    </div>
  )
}