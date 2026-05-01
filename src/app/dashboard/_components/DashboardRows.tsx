import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getTranslations, getLocale } from 'next-intl/server'
import TransferActions from '../transfers/TransferActions'

export default async function DashboardRows() {
  const t      = await getTranslations('dashboard')
  const tc     = await getTranslations('common')
  const tp     = await getTranslations('payments')
  const locale = await getLocale()
  const supabase = await createClient()
  const today  = format(new Date(), 'yyyy-MM-dd')

  const [
    { data: paymentRequired },
    { data: pendingTransfers },
    { data: todayPayments },
    { data: coachAttendance },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('student:students(id, name_ar, name_en, level:levels(name))')
      .eq('status', 'active')
      .eq('remaining_sessions', 0),
    supabase
      .from('student_transfers')
      .select('id, student:students(name_ar, name_en), from_class:classes!from_class_id(name), to_class:classes!to_class_id(name), request_date')
      .eq('status', 'pending')
      .order('request_date', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('amount_paid, type, payment_method, student:students(name_ar, name_en), staff:staff(name)')
      .eq('date', today)
      .order('created_at', { ascending: false }),
    supabase
      .from('coach_attendance')
      .select('*, coach:coaches(name_ar)')
      .gte('check_in_time', today + 'T00:00:00')
      .lte('check_in_time', today + 'T23:59:59')
      .order('check_in_time', { ascending: false }),
  ])

  const payTypeColors: Record<string, string> = {
    subscription: '#C8788A', product: '#4A8C6A', event: '#8B6EC8',
    private: '#4a90d9', exam: '#C8A66E', enrollment: '#C8788A',
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
  }

  return (
    <>
      {/* Row 2: Payment Required + Pending Transfers */}
      <div className="kpi-grid-2" style={{ marginBottom: 16 }}>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>
              🚨 {t('paymentRequiredTitle')}
            </p>
            <Link href="/dashboard/students" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 11, color: '#C8788A', fontWeight: 500 }}>{t('allStudentsBtn')}</span>
            </Link>
          </div>
          <div style={{ padding: '8px 0' }}>
            {paymentRequired && paymentRequired.length > 0 ? paymentRequired.slice(0, 6).map((sub: any) => (
              <Link key={sub.student?.id} href={`/dashboard/students/${sub.student?.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: '1px solid var(--border)', transition: 'opacity 0.1s' }}
                  className="hover:opacity-75">
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8788A20', color: '#C8788A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {(sub.student?.name_ar || '?')[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>
                      {locale === 'en' && sub.student?.name_en ? sub.student.name_en : sub.student?.name_ar}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--txt2)', margin: 0 }}>{sub.student?.level?.name}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(224,64,64,0.12)', color: '#e04040', border: '1px solid rgba(224,64,64,0.2)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
                    0 {tc('session')}
                  </span>
                </div>
              </Link>
            )) : (
              <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--txt2)', fontSize: 12, margin: 0 }}>{t('noPaymentRequired')}</p>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>
              ↔ {t('pendingTransfersTitle')}
            </p>
            <Link href="/dashboard/transfers" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 11, color: '#C8788A', fontWeight: 500 }}>{t('allBtn')}</span>
            </Link>
          </div>
          <div style={{ padding: '6px 0' }}>
            {pendingTransfers && pendingTransfers.length > 0 ? pendingTransfers.map((tr: any) => (
              <div key={tr.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt1)', margin: 0 }}>
                    {locale === 'en' && tr.student?.name_en ? tr.student.name_en : tr.student?.name_ar}
                  </p>
                  <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(232,150,10,0.12)', color: '#e8960a', border: '1px solid rgba(232,150,10,0.2)', borderRadius: 20, padding: '2px 8px' }}>
                    {tc('sessionStatus.scheduled')}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--txt2)', margin: '0 0 10px' }}>
                  <span style={{ color: '#C8788A' }}>{tr.from_class?.name}</span>
                  {' → '}
                  <span style={{ color: '#4A8C6A' }}>{tr.to_class?.name}</span>
                </p>
                <TransferActions transferId={tr.id} />
              </div>
            )) : (
              <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--txt2)', fontSize: 12, margin: 0 }}>{t('noPendingTransfers')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Today's Transactions + Coach Check-in */}
      <div className="kpi-grid-2">

        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{t('todayTransactions')}</p>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[tp('col.student'), tp('col.type'), tp('col.paid'), tp('col.paymentMethod')].map(h => (
                    <th key={h} style={{ textAlign: 'right', padding: '10px 14px', fontSize: 10, fontWeight: 600, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg2)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayPayments && todayPayments.length > 0 ? todayPayments.map((p: any, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }} className="hover:opacity-80 transition-opacity">
                    <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: 'var(--txt1)' }}>
                      {locale === 'en' && p.student?.name_en ? p.student.name_en : p.student?.name_ar}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, background: (payTypeColors[p.type] || '#C8788A') + '18', color: payTypeColors[p.type] || '#C8788A', border: `1px solid ${payTypeColors[p.type] || '#C8788A'}30`, borderRadius: 20, padding: '2px 8px' }}>
                        {tc('paymentType.' + p.type) || p.type}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#4A8C6A' }}>
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--txt2)' }}>
                      {tc('paymentMethod.' + p.payment_method) || p.payment_method}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--txt2)', fontSize: 12 }}>
                      {t('noTransactions')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{t('coachCheckin')}</p>
          </div>
          <div>
            {coachAttendance && coachAttendance.length > 0 ? coachAttendance.map((att: any) => (
              <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,144,217,0.15)', color: '#4a90d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {(att.coach?.name_ar || '?')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>{att.coach?.name_ar}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt2)', margin: 0 }}>
                    {t('checkIn')}: {att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {att.check_out_time ? (
                    <>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt1)', margin: 0 }}>
                        {t('checkOut')}: {new Date(att.check_out_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {att.hours_worked && (
                        <p style={{ fontSize: 10, color: 'var(--txt2)', margin: 0 }}>{att.hours_worked.toFixed(1)}h</p>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(74,200,139,0.15)', color: '#4A8C6A', border: '1px solid rgba(74,200,139,0.25)', borderRadius: 20, padding: '3px 9px' }}>
                      {t('activeStatus')}
                    </span>
                  )}
                </div>
              </div>
            )) : (
              <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--txt2)', fontSize: 12, margin: 0 }}>{t('noCheckins')}</p>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
