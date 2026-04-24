// app/layout.jsx

import { Inter } from 'next/font/google'
import { AppProviders } from '@/providers/AppProviders'
import { Analytics } from "@vercel/analytics/next"
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'Library Manager',
  description: 'Seat and fee management for study libraries',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Library Manager',
  },
}

// viewport and themeColor must be in generateViewport, not metadata
// This fixes the warnings in the terminal
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#111111',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-50 overscroll-none">
        <AppProviders>
          <Analytics />
          {children}
        </AppProviders>
      </body>
    </html>
  )
}