import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MerQent — Post-Merger Integration (PMI) Talent & AI Matching',
  description:
    'Specialized B2B marketplace connecting private equity firms with vetted operators and consultants experienced in unifying ERPs, cultures, and accounting systems post-acquisition.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F19] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
