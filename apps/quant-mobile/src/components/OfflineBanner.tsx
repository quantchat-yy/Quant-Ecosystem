import React, { useState, useEffect, useCallback } from 'react';

export interface OfflineBannerProps {
  isOnline: boolean;
  syncProgress?: number;
  onRetry?: () => void;
}

export function OfflineBanner({
  isOnline,
  syncProgress = 0,
  onRetry,
}: OfflineBannerProps): React.ReactElement | null {
  const [visible, setVisible] = useState(!isOnline);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setDismissed(false);
    } else {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      className={`offline-banner ${isOnline ? 'offline-banner--online' : 'offline-banner--offline'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="offline-banner__content">
        <span className="offline-banner__icon" aria-hidden="true">
          {isOnline ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12l5 5L20 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        <span className="offline-banner__text">
          {isOnline ? 'Back online! Syncing...' : "You're offline"}
        </span>

        {!isOnline && syncProgress > 0 && (
          <div className="offline-banner__progress">
            <div className="offline-banner__progress-bar">
              <div
                className="offline-banner__progress-fill"
                style={{ width: `${Math.min(syncProgress, 100)}%` }}
                role="progressbar"
                aria-valuenow={syncProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Sync progress: ${syncProgress}%`}
              />
            </div>
            <span className="offline-banner__progress-label">{syncProgress}%</span>
          </div>
        )}
      </div>

      <div className="offline-banner__actions">
        {!isOnline && onRetry && (
          <button className="offline-banner__retry" onClick={onRetry} aria-label="Retry connection">
            Retry
          </button>
        )}
        <button
          className="offline-banner__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
        >
          {'\u2715'}
        </button>
      </div>
    </div>
  );
}
