import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: 'MerQent — Specialized PMI Expertise & Grounded AI Matching',
  description:
    'The enterprise B2B marketplace connecting Private Equity sponsors and portfolio operations with vetted Post-Merger Integration (PMI) operators, carve-out specialists, and ERP consolidation leaders.',
  keywords: [
    'Post-Merger Integration',
    'PMI Consultants',
    'Private Equity',
    'Corporate Carve-Outs',
    'ERP Migration',
    'SAP S/4HANA',
    'TSA Exit',
    'Synergy Realization',
  ],
  authors: [{ name: 'MerQent Engineering' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F19] text-foreground min-h-screen flex flex-col font-sans antialiased">
        <TooltipProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </TooltipProvider>
      </body>
    </html>
  );
}
