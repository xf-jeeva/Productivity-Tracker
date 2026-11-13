import type { Metadata } from 'next';
import './globals.css';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Daily Bureau — Productivity Tracker & Team Workspace',
  description: 'Track daily tasks, daily routines, team standups, and progress in real-time.',
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
