import type { Metadata } from 'next';
import './globals.css';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'The Daily Bureau — Vintage Team Work & Dispatch Ledger',
  description: 'Handcrafted vintage team ledger for tracking daily works, dispatch logs, and administrative oversight.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="parchment">
      <body>
        <AuthProvider>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
