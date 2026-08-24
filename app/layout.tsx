import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://reword-one.vercel.app'),
  title: 'Reword — Turn voice into content',
  description: 'Speak once. Show up everywhere. Turn your voice into ready-to-publish content in your OneVoice.',
  icons: { icon: '/favicon.png', apple: '/apple-icon.png' },
  openGraph: {
    title: 'Reword — Turn voice into content',
    description: 'Speak once. Show up everywhere.',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Reword turns one recording into content for every platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reword — Turn voice into content',
    description: 'Speak once. Show up everywhere.',
    images: ['/opengraph-image.png'],
  },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0b0c0e' }, { media: '(prefers-color-scheme: light)', color: '#f7f6f2' }] }
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}{process.env.NODE_ENV==='production'&&<Analytics/>}</body></html>}
