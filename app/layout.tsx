import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Reword — Turn voice into content', description: 'Record once. Create content in your OneVoice.', icons: { icon: '/favicon.png', apple: '/apple-icon.png' } }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0b0c0e' }, { media: '(prefers-color-scheme: light)', color: '#f7f6f2' }] }
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}{process.env.NODE_ENV==='production'&&<Analytics/>}</body></html>}
