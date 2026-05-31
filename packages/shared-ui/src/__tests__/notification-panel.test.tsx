// @vitest-environment jsdom
// ============================================================================
// Shared UI - NotificationPanel Component Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPanel } from '../components/Shell/NotificationPanel';
import type { NotificationItem } from '../components/Shell/NotificationPanel';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'New message from Alice',
    body: 'Hey, can we sync up today?',
    time: '5m ago',
    read: false,
    app: 'Chat',
    actions: [{ id: 'reply', label: 'Reply', onClick: vi.fn() }],
  },
  {
    id: '2',
    title: 'File shared with you',
    body: 'Budget-Q4.xlsx was shared',
    time: '1h ago',
    read: true,
    app: 'Drive',
  },
  {
    id: '3',
    title: 'Meeting reminder',
    body: 'Team standup in 15 minutes',
    time: '10m ago',
    read: false,
    app: 'Calendar',
  },
];

describe('NotificationPanel', () => {
  const defaultProps = {
    notifications: mockNotifications,
    isOpen: true,
    onClose: vi.fn(),
    onMarkRead: vi.fn(),
    onMarkAllRead: vi.fn(),
    onDismiss: vi.fn(),
    onSnooze: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<NotificationPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders notification panel when open', () => {
    render(<NotificationPanel {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('shows unread count badge', () => {
    render(<NotificationPanel {...defaultProps} />);
    // 2 unread notifications
    expect(screen.getByLabelText('2 unread')).toBeDefined();
  });

  it('renders notifications grouped by app', () => {
    render(<NotificationPanel {...defaultProps} />);
    expect(screen.getByText('New message from Alice')).toBeDefined();
    expect(screen.getByText('File shared with you')).toBeDefined();
    expect(screen.getByText('Meeting reminder')).toBeDefined();
  });

  it('calls onMarkRead when notification is clicked', () => {
    render(<NotificationPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('New message from Alice'));
    expect(defaultProps.onMarkRead).toHaveBeenCalledWith('1');
  });

  it('calls onMarkAllRead when mark all read button is clicked', () => {
    render(<NotificationPanel {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Mark all as read'));
    expect(defaultProps.onMarkAllRead).toHaveBeenCalled();
  });

  it('renders app filter tabs', () => {
    render(<NotificationPanel {...defaultProps} />);
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByRole('tab', { name: /Chat/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Drive/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Calendar/ })).toBeDefined();
  });

  it('filters notifications by app when tab is clicked', () => {
    render(<NotificationPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /Chat/ }));
    expect(screen.getByText('New message from Alice')).toBeDefined();
    expect(screen.queryByText('File shared with you')).toBeNull();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationPanel {...defaultProps} notifications={[]} />);
    expect(screen.getByText('No notifications')).toBeDefined();
  });

  it('renders snooze and dismiss buttons', () => {
    render(<NotificationPanel {...defaultProps} />);
    const snoozeButtons = screen.getAllByText('Snooze');
    const dismissButtons = screen.getAllByText('Dismiss');
    expect(snoozeButtons.length).toBeGreaterThan(0);
    expect(dismissButtons.length).toBeGreaterThan(0);
  });

  it('calls onSnooze when snooze button is clicked', () => {
    render(<NotificationPanel {...defaultProps} />);
    const snoozeButtons = screen.getAllByText('Snooze');
    fireEvent.click(snoozeButtons[0]!);
    expect(defaultProps.onSnooze).toHaveBeenCalledWith('1');
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<NotificationPanel {...defaultProps} />);
    const dismissButtons = screen.getAllByText('Dismiss');
    fireEvent.click(dismissButtons[0]!);
    expect(defaultProps.onDismiss).toHaveBeenCalledWith('1');
  });

  it('renders inline action buttons from notification', () => {
    render(<NotificationPanel {...defaultProps} />);
    expect(screen.getByText('Reply')).toBeDefined();
  });
});
