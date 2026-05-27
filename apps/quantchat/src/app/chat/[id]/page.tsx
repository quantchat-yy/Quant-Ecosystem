// FIXME(phase-23): replace mock with real API
'use client';

import { use } from 'react';
import { ChatBubble, ChatInput, TypingIndicator, TopBar } from '@quant/shared-ui';

interface Message {
  id: string;
  message: string;
  sender: 'self' | 'other';
  timestamp: string;
}

const mockMessages: Message[] = [
  {
    id: '1',
    message: 'Hey! How are you doing?',
    sender: 'other',
    timestamp: '10:30 AM',
  },
  {
    id: '2',
    message: "I'm doing great! Just finished working on the project.",
    sender: 'self',
    timestamp: '10:31 AM',
  },
  {
    id: '3',
    message: "That's awesome! Want to grab coffee and tell me about it?",
    sender: 'other',
    timestamp: '10:33 AM',
  },
  {
    id: '4',
    message: 'Sure! How about 3pm at the usual spot?',
    sender: 'self',
    timestamp: '10:34 AM',
  },
];

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title={`Chat ${id}`}
        onBack={() => {
          window.location.href = '/';
        }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockMessages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg.message}
            sender={msg.sender}
            timestamp={msg.timestamp}
          />
        ))}
        <TypingIndicator users={['Alice']} />
      </div>
      <ChatInput
        onSend={(content) => {
          console.log('Send message:', content);
        }}
        placeholder="Type a message..."
      />
    </div>
  );
}
