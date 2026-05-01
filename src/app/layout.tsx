import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

export const metadata: Metadata = {
  title: 'Little Swan Ballet Academy',
  description: 'Academy Management System — Miami Branch',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#C8788A',
}

const THEME_SCRIPT = `(function(){try{if(localStorage.getItem('ls-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} translate="no" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body style={{ backgroundColor: 'var(--bg-page)', color: 'var(--txt1)', minHeight: '100vh' }}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
