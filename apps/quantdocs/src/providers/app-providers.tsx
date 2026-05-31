'use client';

import { useEffect } from 'react';
import { ThemeProvider, CommandPaletteProvider, useCommandPalette } from '@quant/shared-ui';
import type { CommandPaletteItem } from '@quant/shared-ui';

const QUANTDOCS_COMMANDS: CommandPaletteItem[] = [
  {
    id: 'new-document',
    label: 'New document',
    group: 'QuantDocs',
    shortcut: 'N',
    action: () => {},
  },
  { id: 'share-document', label: 'Share document', group: 'QuantDocs', action: () => {} },
  { id: 'version-history', label: 'Version history', group: 'QuantDocs', action: () => {} },
  { id: 'export', label: 'Export', group: 'QuantDocs', action: () => {} },
  { id: 'ask-quant', label: 'Ask Quant', group: 'AI', action: () => {} },
];

function QuantDocsCommandRegistrar() {
  const { registerCommand } = useCommandPalette();

  useEffect(() => {
    const unregisters = QUANTDOCS_COMMANDS.map((cmd) => registerCommand(cmd));
    return () => unregisters.forEach((unregister) => unregister());
  }, [registerCommand]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <CommandPaletteProvider appName="QuantDocs">
        <QuantDocsCommandRegistrar />
        {children}
      </CommandPaletteProvider>
    </ThemeProvider>
  );
}
