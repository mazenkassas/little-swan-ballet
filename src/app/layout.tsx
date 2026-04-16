import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Little Swan Ballet Academy',
  description: 'Academy Management System — Miami Branch',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ backgroundColor: '#FDFAF8', color: '#2C1F24', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
