import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { AppProviders } from '../providers/app-providers';
import { quantdrive, generateFaviconSvg } from '@quant/brand';

const inter = Inter({ subsets: ['latin'] });

const faviconSvg = generateFaviconSvg('quantdrive');
const faviconDataUrl = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

export const metadata: Metadata = {
  title: `${quantdrive.name} | Quant`,
  description: quantdrive.description,
  icons: {
    icon: faviconDataUrl,
  },
  other: {
    'theme-color': quantdrive.color,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={quantdrive.color} />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AppProviders>{children}</AppProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
