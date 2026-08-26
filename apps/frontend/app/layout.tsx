import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
    { media: '(prefers-color-scheme: light)', color: '#030712' },
  ],
};

export const metadata: Metadata = {
  title: 'SecureLens | AI-Powered Security Intelligence Platform',
  description:
    'SecureLens unifies vulnerability scanning, threat intelligence, and AI remediation into a single enterprise-ready security platform.',
  icons: {
    icon: '/favicon.ico',
  },
};

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} ${mono.variable} dark scroll-smooth`}>
      <head>
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[#030712] text-slate-100 font-sans antialiased selection:bg-violet-500/30 selection:text-white overflow-x-hidden min-h-screen min-h-dvh flex flex-col">
        {children}
      </body>
    </html>
  );
}

