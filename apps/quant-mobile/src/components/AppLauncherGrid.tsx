import React, { useState, useCallback } from 'react';

export interface AppGridItem {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface QuickAction {
  label: string;
  action: string;
}

export interface AppLauncherGridProps {
  onAppLaunch: (appId: string) => void;
  onQuickAction?: (appId: string, action: string) => void;
}

const GRID_APPS: AppGridItem[] = [
  { id: 'mail', name: 'Mail', color: '#4285F4', icon: 'M' },
  { id: 'chat', name: 'Chat', color: '#34A853', icon: 'C' },
  { id: 'ai', name: 'AI', color: '#9B59B6', icon: 'A' },
  { id: 'drive', name: 'Drive', color: '#FBBC05', icon: 'D' },
  { id: 'docs', name: 'Docs', color: '#4285F4', icon: 'D' },
  { id: 'calendar', name: 'Calendar', color: '#EA4335', icon: 'C' },
  { id: 'meet', name: 'Meet', color: '#00897B', icon: 'M' },
  { id: 'sync', name: 'Sync', color: '#7C4DFF', icon: 'S' },
  { id: 'tube', name: 'Tube', color: '#FF0000', icon: 'T' },
  { id: 'neon', name: 'Neon', color: '#FF6F00', icon: 'N' },
  { id: 'edits', name: 'Edits', color: '#E91E63', icon: 'E' },
  { id: 'max', name: 'Max', color: '#00BCD4', icon: 'X' },
  { id: 'ads', name: 'Ads', color: '#FFC107', icon: 'A' },
  { id: 'admin', name: 'Admin', color: '#607D8B', icon: 'A' },
  { id: 'status', name: 'Status', color: '#4CAF50', icon: 'S' },
  { id: 'more', name: 'More', color: '#9E9E9E', icon: '...' },
];

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  mail: [
    { label: 'Compose', action: 'compose' },
    { label: 'Inbox', action: 'inbox' },
  ],
  chat: [
    { label: 'New Chat', action: 'new-chat' },
    { label: 'Channels', action: 'channels' },
  ],
  calendar: [
    { label: 'New Event', action: 'new-event' },
    { label: 'Today', action: 'today' },
  ],
  drive: [
    { label: 'Upload', action: 'upload' },
    { label: 'Recent', action: 'recent' },
  ],
};

export function AppLauncherGrid({
  onAppLaunch,
  onQuickAction,
}: AppLauncherGridProps): React.ReactElement {
  const [longPressApp, setLongPressApp] = useState<string | null>(null);
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = useCallback((appId: string) => {
    const timer = setTimeout(() => {
      setLongPressApp(appId);
    }, 500);
    setPressTimer(timer);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  const handleQuickAction = useCallback(
    (appId: string, action: string) => {
      setLongPressApp(null);
      onQuickAction?.(appId, action);
    },
    [onQuickAction],
  );

  const handleDismissActions = useCallback(() => {
    setLongPressApp(null);
  }, []);

  return (
    <div className="app-launcher-grid">
      <div className="app-launcher-grid__container" role="grid" aria-label="App launcher">
        {GRID_APPS.map((app) => (
          <div key={app.id} className="app-launcher-grid__item" role="gridcell">
            <button
              className="app-launcher-grid__button"
              onClick={() => onAppLaunch(app.id)}
              onMouseDown={() => handlePressStart(app.id)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(app.id)}
              onTouchEnd={handlePressEnd}
              aria-label={`Launch ${app.name}`}
            >
              <span className="app-launcher-grid__icon" style={{ backgroundColor: app.color }}>
                {app.icon}
              </span>
              <span className="app-launcher-grid__name">{app.name}</span>
            </button>

            {longPressApp === app.id && QUICK_ACTIONS[app.id] && (
              <div className="app-launcher-grid__quick-actions" role="menu">
                {QUICK_ACTIONS[app.id]?.map((qa) => (
                  <button
                    key={qa.action}
                    className="app-launcher-grid__quick-action"
                    role="menuitem"
                    onClick={() => handleQuickAction(app.id, qa.action)}
                  >
                    {qa.label}
                  </button>
                ))}
                <button
                  className="app-launcher-grid__quick-action app-launcher-grid__quick-action--dismiss"
                  onClick={handleDismissActions}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
