import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { checkSubscriptionsAccess } from '../access'
import { getPackageReview } from '../actions'
import ReviewTable from './ReviewTable'

export const dynamic = 'force-dynamic'

export default async function PackageReviewPage() {
  const supabase = await createClient()
  if (!(await checkSubscriptionsAccess(supabase, 'view'))) redirect('/dashboard')
  const canEdit = !!(await checkSubscriptionsAccess(supabase, 'edit'))
  const isRtl = (await getLocale()) === 'ar'
  const { rows = [], autoCount = false, error } = await getPackageReview()

  const L = isRtl ? {
    back: 'رجوع للاشتراكات', title: 'مراجعة العد التلقائي للحصص',
    sub: 'كل حصة في الباقة تُخصم تلقائياً بمجرد مرور يومها. التعويض والإجازات لا تُخصم. قارن الأرقام الحالية بالجديدة قبل التفعيل.',
  } : {
    back: 'Back to Subscriptions', title: 'Automatic session count — review',
    sub: 'Every class in a package uses a session once its day has passed. Make-ups and holidays don’t. Compare the current numbers with the new ones before switching on.',
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1080, margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
      <Link href="/dashboard/subscriptions" style={{ fontSize: 12, color: '#d4667a', fontWeight: 600, textDecoration: 'none' }}>← {L.back}</Link>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt1)', margin: '8px 0 4px' }}>{L.title}</h1>
      <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '0 0 16px', maxWidth: 720 }}>{L.sub}</p>
      {error
        ? <p style={{ color: '#e04040', fontSize: 13 }}>⚠ {error}</p>
        : <ReviewTable rows={rows} autoCount={autoCount} canEdit={canEdit} isRtl={isRtl} />}
    </div>
  )
}
