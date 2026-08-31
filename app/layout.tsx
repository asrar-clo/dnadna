import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoiceDNA',
  description:
    'Paste any link, text, PDF, or screenshot and get it explained in plain English in seconds. Not a research tool — just a fast answer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
