import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { AuthProvider } from '../providers/auth-provider';
import { AdminLayout } from '../components/AdminLayout';
import { QuantSidekickProvider, QuantSidekick } from '@quant/shared-ui';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Admin Panel | Quant Ecosystem',
  description:
    'Central control panel for the Quant Ecosystem - manage apps, users, services, and infrastructure',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%237C3AED"/><text x="16" y="22" font-size="18" font-weight="bold" text-anchor="middle" fill="white">Q</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <QuantSidekickProvider>
              <AdminLayout>{children}</AdminLayout>
              <QuantSidekick />
            </QuantSidekickProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
