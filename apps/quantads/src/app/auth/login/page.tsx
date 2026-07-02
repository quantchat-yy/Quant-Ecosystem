'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@quant/shared-ui';
import { useAuth } from '@quant/shared-ui';

/**
 * QuantAds sign-in — real, backend-verified identity via QuantMail OAuth2.
 * Credentials are exchanged at /api/auth/login (proxied to QuantMail), then
 * useAuth resolves the verified user from /api/auth/userinfo. Fail-closed: a
 * failed exchange surfaces an honest error and never creates a fake session.
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        await login(email, password);
        router.push('/economy/creator');
      } catch {
        // error is surfaced via useAuth().error — stay on the page.
      } finally {
        setSubmitting(false);
      }
    },
    [login, email, password, router],
  );

  if (isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <p className="text-[var(--quant-foreground)]">You are signed in.</p>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/economy/creator')}>
          Go to Creator Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card className="p-6">
        <h1 className="text-xl font-bold mb-1">Sign in to QuantAds</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mb-5">
          Sign in with your Quant account (QuantMail SSO).
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--quant-background)] border border-[var(--quant-border)] text-sm min-h-[44px] focus:outline-none focus:border-[var(--quant-foreground)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--quant-background)] border border-[var(--quant-border)] text-sm min-h-[44px] focus:outline-none focus:border-[var(--quant-foreground)]"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting || isLoading}
          >
            {submitting || isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
