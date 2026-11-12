import { getLocale } from 'next-intl/server'
import { ShieldOff } from 'lucide-react'

export default async function NoAccessPage() {
  const isAr = (await getLocale()) === 'ar'
  return (
    <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 360, direction: isAr ? 'rtl' : 'ltr' }}>
        <ShieldOff size={36} style={{ color: 'var(--txt2)', marginBottom: 12 }} />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt1)', margin: '0 0 6px' }}>
          {isAr ? 'لا توجد صلاحيات' : 'No access yet'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0 }}>
          {isAr
            ? 'لم يتم منح دورك صلاحية عرض أي صفحة. تواصل مع المدير العام.'
            : 'Your role has not been given access to any page. Please contact the super admin.'}
        </p>
      </div>
    </div>
  )
}
