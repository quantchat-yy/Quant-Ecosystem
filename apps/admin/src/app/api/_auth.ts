import { headers } from 'next/headers';

export async function requireAdminAuth(): Promise<{ userId: string; role: string } | null> {
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  // In production this would verify JWT - for now check header exists
  return { userId: 'admin', role: 'ADMIN' };
}
