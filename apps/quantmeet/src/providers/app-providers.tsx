'use client';

import { useEffect } from 'react';
import { ThemeProvider, CommandPaletteProvider, useCommandPalette } from '@quant/shared-ui';
import type { CommandPaletteItem } from '@quant/shared-ui';

const QUANTMEET_COMMANDS: CommandPaletteItem[] = [
  {
    id: 'create-meeting',
    label: 'Create meeting',
    group: 'QuantMeet',
    shortcut: 'N',
    action: () => {},
  },
  {
    id: 'join-meeting',
    label: 'Join meeting',
    group: 'QuantMeet',
    shortcut: 'J',
    action: () => {},
  },
  { id: 'toggle-camera', label: 'Toggle camera', group: 'QuantMeet', action: () => {} },
  { id: 'toggle-mic', label: 'Toggle mic', group: 'QuantMeet', action: () => {} },
  { id: 'ask-quant', label: 'Ask Quant', group: 'AI', action: () => {} },
];

function QuantMeetCommandRegistrar() {
  const { registerCommand } = useCommandPalette();

  useEffect(() => {
    const unregisters = QUANTMEET_COMMANDS.map((cmd) => registerCommand(cmd));
    return () => unregisters.forEach((unregister) => unregister());
  }, [registerCommand]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <CommandPaletteProvider appName="QuantMeet">
        <QuantMeetCommandRegistrar />
        {children}
      </CommandPaletteProvider>
    </ThemeProvider>
  );
}
