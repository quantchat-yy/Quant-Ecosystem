'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@quant/shared-ui';

const springGentle = { damping: 20, stiffness: 100, mass: 1 };

interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  action: 'edited' | 'shared' | 'uploaded' | 'deleted' | 'renamed' | 'moved';
  fileName: string;
  timestamp: string;
}

interface ActivityPanelProps {
  activities?: ActivityEntry[];
  onClose?: () => void;
}

function getActionText(action: ActivityEntry['action']): string {
  switch (action) {
    case 'edited':
      return 'edited';
    case 'shared':
      return 'shared';
    case 'uploaded':
      return 'uploaded';
    case 'deleted':
      return 'deleted';
    case 'renamed':
      return 'renamed';
    case 'moved':
      return 'moved';
  }
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const MOCK_ACTIVITIES: ActivityEntry[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Alice Chen',
    action: 'edited',
    fileName: 'Q4 Report.docx',
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Bob Smith',
    action: 'shared',
    fileName: 'Design Assets.zip',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Carol Davis',
    action: 'uploaded',
    fileName: 'meeting-notes.pdf',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '4',
    userId: 'u1',
    userName: 'Alice Chen',
    action: 'renamed',
    fileName: 'old-name.txt',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '5',
    userId: 'u4',
    userName: 'Dave Wilson',
    action: 'deleted',
    fileName: 'temp-file.tmp',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
];

export function ActivityPanel({ activities = MOCK_ACTIVITIES, onClose }: ActivityPanelProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', ...springGentle }}
      className="w-full md:w-80 border-l border-[var(--quant-border)] bg-[var(--quant-background)] flex flex-col h-full"
      aria-label="Activity panel"
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--quant-border)]">
        <h2 className="text-sm font-semibold">Recent Activity</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--quant-muted)] transition-colors"
            aria-label="Close activity panel"
          >
            &#10005;
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-[var(--quant-border)]" aria-label="Activity timeline">
          {activities.map((entry, index) => (
            <motion.li
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', ...springGentle, delay: index * 0.03 }}
              className="flex items-start gap-3 p-3"
            >
              <Avatar name={entry.userName} src={entry.avatarUrl} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{entry.userName}</span>{' '}
                  <span className="text-[var(--quant-muted-foreground)]">
                    {getActionText(entry.action)}
                  </span>{' '}
                  <span className="font-medium truncate">{entry.fileName}</span>
                </p>
                <time
                  dateTime={entry.timestamp}
                  className="text-xs text-[var(--quant-muted-foreground)]"
                >
                  {getRelativeTime(entry.timestamp)}
                </time>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.aside>
  );
}
