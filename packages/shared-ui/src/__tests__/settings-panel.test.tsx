// @vitest-environment jsdom
// ============================================================================
// Shared UI - SettingsPanel Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../components/Shell/SettingsPanel';

describe('SettingsPanel', () => {
  const defaultProps = {
    profile: { name: 'Test User', email: 'test@quant.dev' },
    theme: 'system' as const,
    onThemeChange: vi.fn(),
    onAccentColorChange: vi.fn(),
    notificationPreferences: [
      { appId: 'mail', appName: 'QuantMail', enabled: true },
      { appId: 'chat', appName: 'QuantChat', enabled: false },
    ],
    onNotificationToggle: vi.fn(),
    privacySettings: { dataSharing: false, analytics: true },
    onPrivacyChange: vi.fn(),
    shortcuts: [
      {
        scope: 'Global',
        shortcuts: [
          { combo: 'Cmd+K', description: 'Open command palette' },
          { combo: 'Cmd+/', description: 'Search' },
        ],
      },
    ],
    onProfileUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with settings region', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByRole('region', { name: /settings/i })).toBeDefined();
  });

  it('renders all tab buttons', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /profile/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /appearance/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /notifications/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /privacy/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /shortcuts/i })).toBeDefined();
  });

  it('shows Profile tab content by default', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByLabelText('Your name')).toBeDefined();
    expect(screen.getByLabelText('Your email')).toBeDefined();
  });

  it('switches to Appearance tab on click', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /appearance/i }));
    expect(screen.getByRole('radio', { name: /light theme/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /dark theme/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /system theme/i })).toBeDefined();
  });

  it('calls onThemeChange when theme option is clicked', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /appearance/i }));
    fireEvent.click(screen.getByRole('radio', { name: /dark theme/i }));
    expect(defaultProps.onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('switches to Notifications tab and shows per-app toggles', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /notifications/i }));
    expect(screen.getByLabelText('Notifications for QuantMail')).toBeDefined();
    expect(screen.getByLabelText('Notifications for QuantChat')).toBeDefined();
  });

  it('calls onNotificationToggle when notification checkbox is toggled', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /notifications/i }));
    const chatCheckbox = screen.getByLabelText('Notifications for QuantChat');
    fireEvent.click(chatCheckbox);
    expect(defaultProps.onNotificationToggle).toHaveBeenCalledWith('chat', true);
  });

  it('switches to Privacy tab and shows toggles', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /privacy/i }));
    expect(screen.getByLabelText('Share usage data')).toBeDefined();
    expect(screen.getByLabelText('Allow analytics')).toBeDefined();
  });

  it('calls onPrivacyChange when privacy toggle is clicked', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /privacy/i }));
    fireEvent.click(screen.getByLabelText('Share usage data'));
    expect(defaultProps.onPrivacyChange).toHaveBeenCalledWith('dataSharing', true);
  });

  it('switches to Shortcuts tab and shows registered shortcuts', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /shortcuts/i }));
    expect(screen.getByText('Open command palette')).toBeDefined();
    expect(screen.getByText('Cmd+K')).toBeDefined();
    expect(screen.getByText('Search')).toBeDefined();
  });

  it('calls onProfileUpdate when Save is clicked', () => {
    render(<SettingsPanel {...defaultProps} />);
    const nameInput = screen.getByLabelText('Your name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByLabelText('Save profile'));
    expect(defaultProps.onProfileUpdate).toHaveBeenCalledWith('New Name', 'test@quant.dev');
  });
});
