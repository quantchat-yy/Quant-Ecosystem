'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatedPage, SpringButton, Input } from '@quant/shared-ui';
import { Button } from '@quant/shared-ui';

interface RecentMeeting {
  id: string;
  title: string;
  date: string;
  participantCount: number;
}

function useRecentMeetings() {
  return useQuery<RecentMeeting[]>({
    queryKey: ['recent-meetings'],
    queryFn: async () => {
      const response = await fetch('/api/meetings/recent');
      if (!response.ok) {
        throw new Error('Failed to fetch recent meetings');
      }
      return response.json();
    },
  });
}

export default function MeetHomePage() {
  const [meetingId, setMeetingId] = useState('');
  const router = useRouter();
  const { data: recentMeetings } = useRecentMeetings();

  const handleJoin = () => {
    if (meetingId.trim()) {
      router.push(`/meeting/${meetingId.trim()}`);
    }
  };

  const handleNewMeeting = () => {
    const id = crypto.randomUUID().slice(0, 8);
    router.push(`/meeting/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <AnimatedPage>
      <main className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">QuantMeet</h1>
            <p className="text-[var(--quant-muted-foreground)]">
              Video conferencing with AI-powered collaboration
            </p>
          </div>

          <section className="space-y-4" aria-labelledby="new-meeting-heading">
            <h2 id="new-meeting-heading" className="sr-only">
              Create a new meeting
            </h2>
            <SpringButton variant="primary" onClick={handleNewMeeting} className="w-full">
              New Meeting
            </SpringButton>
          </section>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--quant-border)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[var(--quant-background)] text-[var(--quant-muted-foreground)]">
                or
              </span>
            </div>
          </div>

          <section className="space-y-3" aria-labelledby="join-meeting-heading">
            <h2 id="join-meeting-heading" className="text-sm font-medium">
              Join Meeting
            </h2>
            <div className="flex gap-2">
              <Input
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter meeting ID"
                aria-label="Meeting ID"
              />
              <Button variant="secondary" onClick={handleJoin} disabled={!meetingId.trim()}>
                Join
              </Button>
            </div>
          </section>

          {recentMeetings && recentMeetings.length > 0 && (
            <section className="space-y-3" aria-labelledby="recent-meetings-heading">
              <h2
                id="recent-meetings-heading"
                className="text-sm font-medium text-[var(--quant-muted-foreground)]"
              >
                Recent Meetings
              </h2>
              <ul
                className="divide-y divide-[var(--quant-border)] rounded-lg border border-[var(--quant-border)]"
                role="list"
              >
                {recentMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-[var(--quant-muted)] transition-colors"
                      onClick={() => router.push(`/meeting/${meeting.id}`)}
                      aria-label={`Rejoin ${meeting.title}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{meeting.title}</span>
                        <span className="text-xs text-[var(--quant-muted-foreground)]">
                          {meeting.participantCount} participants
                        </span>
                      </div>
                      <span className="text-xs text-[var(--quant-muted-foreground)]">
                        {meeting.date}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </AnimatedPage>
  );
}
