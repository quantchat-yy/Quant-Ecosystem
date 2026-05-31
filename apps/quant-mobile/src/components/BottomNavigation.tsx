import React from 'react';

export type TabId = 'home' | 'search' | 'create' | 'notifications' | 'profile';

export interface BottomNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  notificationCount?: number;
}

interface TabConfig {
  id: TabId;
  label: string;
  ariaLabel: string;
}

const TABS: TabConfig[] = [
  { id: 'home', label: 'Home', ariaLabel: 'Home tab' },
  { id: 'search', label: 'Search', ariaLabel: 'Search tab' },
  { id: 'create', label: 'Create', ariaLabel: 'Create tab' },
  { id: 'notifications', label: 'Notifications', ariaLabel: 'Notifications tab' },
  { id: 'profile', label: 'Profile', ariaLabel: 'Profile tab' },
];

function HomeIcon({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-4a1 1 0 011-1h2a1 1 0 011 1v4m-4 0h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

function SearchIcon({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
        fill={filled ? 'currentColor' : 'none'}
        opacity={filled ? 0.2 : 1}
      />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CreateIcon({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        fill={filled ? 'currentColor' : 'none'}
        opacity={filled ? 0.2 : 1}
      />
      <path
        d="M12 8v8m-4-4h8"
        stroke={filled ? 'white' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotificationsIcon({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

function ProfileIcon({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        fill={filled ? 'currentColor' : 'none'}
      />
      <path
        d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

function getTabIcon(tabId: TabId, filled: boolean): React.ReactElement {
  switch (tabId) {
    case 'home':
      return <HomeIcon filled={filled} />;
    case 'search':
      return <SearchIcon filled={filled} />;
    case 'create':
      return <CreateIcon filled={filled} />;
    case 'notifications':
      return <NotificationsIcon filled={filled} />;
    case 'profile':
      return <ProfileIcon filled={filled} />;
  }
}

export function BottomNavigation({
  activeTab,
  onTabChange,
  notificationCount = 0,
}: BottomNavigationProps): React.ReactElement {
  return (
    <nav className="bottom-navigation" role="tablist" aria-label="Main navigation">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-label={tab.ariaLabel}
            aria-selected={isActive}
            className={`bottom-nav-tab ${isActive ? 'bottom-nav-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="bottom-nav-tab__icon">
              {getTabIcon(tab.id, isActive)}
              {tab.id === 'notifications' && notificationCount > 0 && (
                <span
                  className="bottom-nav-tab__badge"
                  aria-label={`${notificationCount} notifications`}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </span>
            <span className="bottom-nav-tab__label">{tab.label}</span>
            {isActive && <span className="bottom-nav-tab__indicator" />}
          </button>
        );
      })}
    </nav>
  );
}
