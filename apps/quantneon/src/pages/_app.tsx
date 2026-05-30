import './globals.css';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import { MotionProvider } from '@quant/shared-ui';
import { QueryProvider } from '../providers/query-provider';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppProps {
  Component: React.ComponentType<Record<string, unknown>>;
  pageProps: Record<string, unknown>;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <ErrorBoundary>
      <QueryProvider>
        <MotionProvider>
          <AnimatePresence mode="wait">
            <Component key={router.asPath} {...pageProps} />
          </AnimatePresence>
        </MotionProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
