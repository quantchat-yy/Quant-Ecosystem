'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeProvider, CommandPaletteUI } from '@quant/shared-ui';
import type { CommandPaletteItem } from '@quant/shared-ui';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const router = useRouter();

  const commands: CommandPaletteItem[] = [
    {
      id: 'compose',
      label: 'Compose Email',
      shortcut: 'C',
      action: () => {
        router.push('/compose');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'search',
      label: 'Search Emails',
      shortcut: '/',
      action: () => {
        router.push('/?search=true');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'inbox',
      label: 'Go to Inbox',
      action: () => {
        router.push('/');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'sent',
      label: 'Go to Sent',
      action: () => {
        router.push('/?folder=sent');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'drafts',
      label: 'Go to Drafts',
      action: () => {
        router.push('/?folder=drafts');
        setCommandPaletteOpen(false);
      },
    },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <ThemeProvider defaultTheme="system">
      {children}
      <CommandPaletteUI
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />
    </ThemeProvider>
  );
}
