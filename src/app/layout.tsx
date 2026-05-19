import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Esca Food Muhasebe',
  description: 'Teklif ve cari hesap sistemi',
  icons: {
    icon:            '/favicon.png',
    apple:           '/apple-touch-icon.png',  // iOS yer imi ikonu
    shortcut:        '/favicon.png',
  },
  appleWebApp: {
    capable:        true,
    title:          'Esca Food',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;450;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        {/* Apple PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Esca Food" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
