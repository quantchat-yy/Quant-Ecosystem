import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { AppProviders } from '../providers/app-providers';
import { quantcalendar, generateFaviconSvg } from '@quant/brand';

const inter = Inter({ subsets: ['latin'] });

const faviconSvg = generateFaviconSvg('quantcalendar');
const faviconDataUri = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

export const metadata: Metadata = {
  title: `${quantcalendar.name} | Quant`,
  description: quantcalendar.description,
  icons: {
    icon: faviconDataUri,
  },
  other: {
    'theme-color': quantcalendar.color,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={quantcalendar.color} />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AppProviders>{children}</AppProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
