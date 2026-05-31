'use client';
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { CommandPaletteUI } from './index';
import type { CommandPaletteItem } from './index';

interface CommandPaletteContextValue {
  registerCommand: (command: CommandPaletteItem) => () => void;
  unregisterCommand: (id: string) => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
}

// Built-in cross-app navigation commands
const CROSS_APP_COMMANDS: CommandPaletteItem[] = [
  {
    id: 'nav-mail',
    label: 'Go to QuantMail',
    group: 'Navigation',
    shortcut: undefined,
    action: () => {
      window.location.href = '/';
    },
  },
  {
    id: 'nav-chat',
    label: 'Go to QuantChat',
    group: 'Navigation',
    action: () => {
      window.location.href = 'http://localhost:3002';
    },
  },
  {
    id: 'nav-ai',
    label: 'Go to QuantAI',
    group: 'Navigation',
    action: () => {
      window.location.href = 'http://localhost:3001';
    },
  },
  {
    id: 'nav-sync',
    label: 'Go to QuantSync',
    group: 'Navigation',
    action: () => {
      window.location.href = 'http://localhost:3003';
    },
  },
  {
    id: 'nav-tube',
    label: 'Go to QuantTube',
    group: 'Navigation',
    action: () => {
      window.location.href = 'http://localhost:3005';
    },
  },
  {
    id: 'nav-meet',
    label: 'Go to QuantMeet',
    group: 'Navigation',
    action: () => {
      window.location.href = 'http://localhost:3107';
    },
  },
  {
    id: 'nav-docs',
    label: 'Go to QuantDocs',
    group: 'Navigation',
    action: () => {
      window.location.href = 'http://localhost:3040';
    },
  },
];

interface CommandPaletteProviderProps {
  children: React.ReactNode;
  appName?: string;
}

export function CommandPaletteProvider({ children, appName }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const commandsRef = useRef<Map<string, CommandPaletteItem>>(new Map());
  const [commandsVersion, setCommandsVersion] = useState(0);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const registerCommand = useCallback((command: CommandPaletteItem) => {
    commandsRef.current.set(command.id, command);
    setCommandsVersion((v) => v + 1);
    return () => {
      commandsRef.current.delete(command.id);
      setCommandsVersion((v) => v + 1);
    };
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    commandsRef.current.delete(id);
    setCommandsVersion((v) => v + 1);
  }, []);

  const allCommands = useMemo(() => {
    void commandsVersion; // trigger recompute
    return [...CROSS_APP_COMMANDS, ...Array.from(commandsRef.current.values())];
  }, [commandsVersion]);

  const value: CommandPaletteContextValue = useMemo(
    () => ({
      registerCommand,
      unregisterCommand,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      isOpen,
    }),
    [registerCommand, unregisterCommand, isOpen],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteUI
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        commands={allCommands}
        placeholder={appName ? `Search ${appName} commands...` : 'Search commands...'}
      />
    </CommandPaletteContext.Provider>
  );
}
