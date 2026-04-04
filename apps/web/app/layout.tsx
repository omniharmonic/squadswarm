import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Web3Provider } from '@/components/web3-provider';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'SquadSwarm',
    template: '%s | SquadSwarm',
  },
  description: 'Cooperative work brokerage with AI-native project management. Squads bid. Swarms deliver.',
  metadataBase: new URL('https://squadswarm.xyz'),
  openGraph: {
    title: 'SquadSwarm',
    description: 'Cooperative work brokerage with AI-native project management.',
    url: 'https://squadswarm.xyz',
    siteName: 'SquadSwarm',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SquadSwarm',
    description: 'Squads bid. Swarms deliver.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        <Web3Provider>
          {children}
        </Web3Provider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
