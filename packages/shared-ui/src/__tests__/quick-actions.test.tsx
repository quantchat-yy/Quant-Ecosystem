// @vitest-environment jsdom
// ============================================================================
// Shared UI - QuickActions Component Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActions } from '../components/Shell/QuickActions';
import type { QuickAction } from '../components/Shell/QuickActions';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockActions: QuickAction[] = [
  { id: 'reply', label: 'Reply', icon: '\u{1F4AC}', onClick: vi.fn() },
  { id: 'forward', label: 'Forward', icon: '\u{27A1}\uFE0F', onClick: vi.fn() },
  { id: 'archive', label: 'Archive', icon: '\u{1F4E6}', shortcut: 'E', onClick: vi.fn() },
  { id: 'delete', label: 'Delete', icon: '\u{1F5D1}\uFE0F', danger: true, onClick: vi.fn() },
  { id: 'disabled-action', label: 'Disabled', disabled: true, onClick: vi.fn() },
];

describe('QuickActions', () => {
  const defaultProps = {
    actions: mockActions,
    isOpen: true,
    position: { x: 100, y: 200 },
    onClose: vi.fn(),
    itemType: 'email',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<QuickActions {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renders context menu with actions when open', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getByText('Reply')).toBeDefined();
    expect(screen.getByText('Forward')).toBeDefined();
    expect(screen.getByText('Archive')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('calls action onClick when clicked', () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Reply'));
    expect(mockActions[0]!.onClick).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not call onClick for disabled actions', () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Disabled'));
    expect(mockActions[4]!.onClick).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation - Escape closes menu', () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles keyboard navigation - Enter executes action', () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(mockActions[0]!.onClick).toHaveBeenCalled();
  });

  it('handles keyboard navigation - ArrowDown moves selection', () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(mockActions[1]!.onClick).toHaveBeenCalled();
  });

  it('displays shortcut labels', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText('E')).toBeDefined();
  });

  it('has correct aria-label', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByLabelText('Quick actions for email')).toBeDefined();
  });

  it('marks disabled items with aria-disabled', () => {
    render(<QuickActions {...defaultProps} />);
    const disabledBtn = screen.getByText('Disabled').closest('button');
    expect(disabledBtn?.getAttribute('aria-disabled')).toBe('true');
  });
});
