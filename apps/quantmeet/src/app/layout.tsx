import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { AppProviders } from '../providers/app-providers';
import { quantmeet, generateFaviconSvg } from '@quant/brand';

const inter = Inter({ subsets: ['latin'] });

const faviconSvg = generateFaviconSvg('quantmeet');
const encodedFavicon = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

export const metadata: Metadata = {
  title: `${quantmeet.name} | Quant`,
  description: quantmeet.description,
  icons: {
    icon: encodedFavicon,
  },
  other: {
    'theme-color': quantmeet.color,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={quantmeet.color} />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AppProviders>{children}</AppProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
