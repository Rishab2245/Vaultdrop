import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Newsreader } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/*
  Self-hosted at build time by next/font. A runtime request to Google would
  hand every visitor's IP to a third party, which would make the privacy claims
  on this site untrue.

  Two registers, and the split is the whole design: the system speaks in mono,
  the human speaks in serif.
*/
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const serif = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'VaultDrop — say it without saying who',
    template: '%s · VaultDrop',
  },
  description:
    'Anonymous confessions and end-to-end encrypted drops. No account, no tracking, and nothing we could read even if we wanted to.',
  openGraph: {
    title: 'VaultDrop — say it without saying who',
    description:
      'Anonymous confessions and end-to-end encrypted drops. No account, no tracking, no way for us to read your secrets.',
    url: siteUrl,
    siteName: 'VaultDrop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VaultDrop — say it without saying who',
    description: 'Anonymous confessions and end-to-end encrypted drops.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0A0E1A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
