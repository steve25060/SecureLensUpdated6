import './globals.css';
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google';

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
        <title>SecureLens | AI-Powered Security Intelligence Platform</title>
        <meta name="description" content="SecureLens unifies vulnerability scanning, threat intelligence, and AI remediation into a single enterprise-ready security platform." />
      </head>
      <body className="bg-[#030712] text-slate-100 font-sans antialiased selection:bg-violet-500/30 selection:text-white overflow-x-hidden min-h-screen">
        {children}
      </body>
    </html>
  );
}

