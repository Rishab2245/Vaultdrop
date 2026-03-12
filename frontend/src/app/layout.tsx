import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import ScanlineOverlay from '@/components/layout/ScanlineOverlay';

export const metadata: Metadata = {
  title: 'VAULTDROP | The Secret Economy',
  description: 'The anonymous secret economy. Post secrets, compete for the daily prize pool, earn from Ghost Secrets.',
  themeColor: '#0a0e1a',
  openGraph: {
    title: 'VAULTDROP | The Secret Economy',
    description: 'Anonymous secrets. Real prizes. Post your truth.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NavBar />
        <ScanlineOverlay />
        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative', zIndex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
