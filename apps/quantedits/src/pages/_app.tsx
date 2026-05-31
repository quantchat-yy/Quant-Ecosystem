import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { BrandProvider } from '../providers/brand-provider';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppProps {
  Component: React.ComponentType<Record<string, unknown>>;
  pageProps: Record<string, unknown>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <BrandProvider>
        <QueryProvider>
          <Component {...pageProps} />
        </QueryProvider>
      </BrandProvider>
    </ErrorBoundary>
  );
}
