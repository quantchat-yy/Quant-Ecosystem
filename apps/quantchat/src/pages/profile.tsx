// ============================================================================
// QuantChat - Profile Page
// User profile, bitmoji, settings, snap score
// ============================================================================

import React, { useState, useEffect } from 'react';
import type { Bitmoji, UserSettings, SnapStreak } from '../types';
import { apiClient } from '../services/api-client';

interface ProfilePageProps {
  currentUserId: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ currentUserId }) => {
  const [profile, setProfile] = useState<{ id: string; phoneNumber: string; username: string; displayName: string } | null>(null);
  const [bitmoji, setBitmoji] = useState<Bitmoji | null>(null);
  const [streaks, setStreaks] = useState<SnapStreak[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    ghostMode: false,
    notificationsEnabled: true,
    storyPrivacy: 'friends',
    locationSharing: true,
    readReceipts: true,
    typingIndicators: true,
    twoFactorEnabled: false,
    theme: 'auto',
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const [profileRes, bitmojiRes, streaksRes] = await Promise.all([
      apiClient.getProfile(),
      apiClient.getBitmoji(),
      apiClient.getStreaks(),
    ]);

    if (profileRes.success && profileRes.data) setProfile(profileRes.data);
    if (bitmojiRes.success && bitmojiRes.data) setBitmoji(bitmojiRes.data);
    if (streaksRes.success && streaksRes.data) setStreaks(streaksRes.data);
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    await apiClient.updateProfile({
      username: profile.username,
      displayName: profile.displayName,
    });
    setEditing(false);
  };

  const handleSettingChange = (key: keyof UserSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="back-btn" onClick={() => window.location.hash = '/'}>&#8592;</button>
        <h1>Profile</h1>
        <button className="edit-btn" onClick={() => setEditing(!editing)}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </header>

      {/* Avatar Section */}
      <section className="avatar-section">
        <div className="avatar-container">
          {bitmoji ? (
            <img src={bitmoji.previewUrl} alt="Bitmoji" className="bitmoji-avatar" />
          ) : (
            <div className="avatar-placeholder-large">
              {profile?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <button className="edit-avatar-btn" onClick={() => window.location.hash = '/bitmoji'}>
            Edit
          </button>
        </div>
        <h2>{profile?.displayName}</h2>
        <p className="username">@{profile?.username}</p>
      </section>

      {/* Snap Score */}
      <section className="snap-score-section">
        <div className="score-card">
          <div className="score-item">
            <span className="score-value">{streaks.length}</span>
            <span className="score-label">Streaks</span>
          </div>
          <div className="score-divider" />
          <div className="score-item">
            <span className="score-value">{streaks.reduce((sum, s) => sum + s.count, 0)}</span>
            <span className="score-label">Snap Score</span>
          </div>
          <div className="score-divider" />
          <div className="score-item">
            <span className="score-value">{streaks.filter(s => s.isAboutToExpire).length}</span>
            <span className="score-label">Expiring</span>
          </div>
        </div>
      </section>

      {/* Profile Fields */}
      {editing && (
        <section className="edit-profile-section">
          <div className="form-field">
            <label>Display Name</label>
            <input
              type="text"
              value={profile?.displayName || ''}
              onChange={(e) => setProfile(prev => prev ? { ...prev, displayName: e.target.value } : null)}
            />
          </div>
          <div className="form-field">
            <label>Username</label>
            <input
              type="text"
              value={profile?.username || ''}
              onChange={(e) => setProfile(prev => prev ? { ...prev, username: e.target.value } : null)}
            />
          </div>
          <button className="save-btn" onClick={handleUpdateProfile}>Save Changes</button>
        </section>
      )}

      {/* Settings */}
      <section className="settings-section">
        <h3>Settings</h3>

        <div className="setting-item">
          <span>Ghost Mode</span>
          <input
            type="checkbox"
            checked={settings.ghostMode}
            onChange={(e) => handleSettingChange('ghostMode', e.target.checked)}
          />
        </div>

        <div className="setting-item">
          <span>Notifications</span>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
          />
        </div>

        <div className="setting-item">
          <span>Read Receipts</span>
          <input
            type="checkbox"
            checked={settings.readReceipts}
            onChange={(e) => handleSettingChange('readReceipts', e.target.checked)}
          />
        </div>

        <div className="setting-item">
          <span>Location Sharing</span>
          <input
            type="checkbox"
            checked={settings.locationSharing}
            onChange={(e) => handleSettingChange('locationSharing', e.target.checked)}
          />
        </div>

        <div className="setting-item">
          <span>Story Privacy</span>
          <select
            value={settings.storyPrivacy}
            onChange={(e) => handleSettingChange('storyPrivacy', e.target.value)}
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="setting-item">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div className="setting-item">
          <span>Two-Factor Authentication</span>
          <input
            type="checkbox"
            checked={settings.twoFactorEnabled}
            onChange={(e) => handleSettingChange('twoFactorEnabled', e.target.checked)}
          />
        </div>
      </section>

      {/* Account Actions */}
      <section className="account-actions">
        <button className="action-btn" onClick={() => apiClient.linkQuantMail('', '')}>
          Link QuantMail Account
        </button>
        <button className="action-btn danger" onClick={() => apiClient.logout()}>
          Log Out
        </button>
      </section>
    </div>
  );
};

export default ProfilePage;
