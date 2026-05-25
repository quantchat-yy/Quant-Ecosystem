'use client';

import { AppShell, Sidebar, SearchInput, Card, Badge } from '@quant/shared-ui';
import type { SidebarItem } from '@quant/shared-ui';

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
}

const mockEmails: Email[] = [
  {
    id: '1',
    from: 'Team Notifications',
    subject: 'Sprint Review - Week 42 Summary',
    preview: 'Here is the summary of completed tasks for this week...',
    timestamp: '30m ago',
    read: false,
    starred: true,
  },
  {
    id: '2',
    from: 'Alice Johnson',
    subject: 'Re: Project Proposal',
    preview: 'I reviewed the document and have some suggestions...',
    timestamp: '1h ago',
    read: false,
    starred: false,
  },
  {
    id: '3',
    from: 'Security Alert',
    subject: 'New login from Chrome on Mac',
    preview: 'We noticed a new sign-in to your account from...',
    timestamp: '2h ago',
    read: true,
    starred: false,
  },
  {
    id: '4',
    from: 'Bob Smith',
    subject: 'Lunch tomorrow?',
    preview: 'Hey, are you free for lunch tomorrow around noon?',
    timestamp: '1d ago',
    read: true,
    starred: false,
  },
  {
    id: '5',
    from: 'Newsletter',
    subject: 'Weekly Tech Digest',
    preview: 'Top stories: AI advances, new framework releases...',
    timestamp: '2d ago',
    read: true,
    starred: false,
  },
];

const sidebarItems: SidebarItem[] = [
  { id: 'inbox', label: 'Inbox', icon: <span>&#128229;</span>, active: true },
  { id: 'sent', label: 'Sent', icon: <span>&#128228;</span> },
  { id: 'drafts', label: 'Drafts', icon: <span>&#128221;</span> },
  { id: 'starred', label: 'Starred', icon: <span>&#11088;</span> },
  { id: 'archive', label: 'Archive', icon: <span>&#128451;</span> },
  { id: 'trash', label: 'Trash', icon: <span>&#128465;</span> },
];

export default function InboxPage() {
  return (
    <AppShell
      sidebar={
        <Sidebar
          items={sidebarItems}
          header={<h2 className="text-lg font-semibold">QuantMail</h2>}
        />
      }
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-[var(--quant-border)]">
          <SearchInput
            placeholder="Search emails..."
            onChange={(value) => {
              console.log('Search:', value);
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockEmails.map((email) => (
            <Card
              key={email.id}
              padding="none"
              className={`mx-4 my-2 p-4 cursor-pointer hover:bg-[var(--quant-muted)] transition-colors ${
                !email.read ? 'border-l-4 border-l-quant-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${!email.read ? 'font-semibold' : 'font-normal'}`}>
                      {email.from}
                    </span>
                    {!email.read && <Badge variant="info">New</Badge>}
                  </div>
                  <h3 className={`text-sm mt-1 ${!email.read ? 'font-semibold' : ''}`}>
                    {email.subject}
                  </h3>
                  <p className="text-xs text-[var(--quant-muted-foreground)] mt-1 truncate">
                    {email.preview}
                  </p>
                </div>
                <span className="text-xs text-[var(--quant-muted-foreground)] whitespace-nowrap ml-4">
                  {email.timestamp}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
