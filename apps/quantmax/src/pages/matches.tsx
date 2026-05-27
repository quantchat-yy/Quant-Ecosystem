// ============================================================================
// QuantMax - Match List
// Horizontal scrollable new matches row, conversations list with last message
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useMatching } from '../hooks/useMatching';

const MatchesPage: React.FC = () => {
  const matching = useMatching();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const matches = matching.matches || [];

  if (matching.isLoading && matches.length === 0) {
    return <LoadingState variant="skeleton" text="Loading matches..." />;
  }

  if (matching.error) {
    return <ErrorState message={matching.error} onRetry={() => window.location.reload()} />;
  }

  if (matches.length === 0) {
    return <EmptyState title="No matches yet" description="Start swiping to find your matches!" />;
  }

  const newMatches = matches.filter(
    (m: { unread?: boolean; lastMessage?: string }) => !m.lastMessage,
  );
  const conversations = matches.filter((m: { lastMessage?: string }) => m.lastMessage);

  return (
    <div className="matches-page">
      <h1 className="page-title">Messages</h1>

      {newMatches.length > 0 && (
        <div className="new-matches-section">
          <h3>New Matches</h3>
          <div className="new-matches-row">
            {newMatches.map(
              (match: {
                id: string;
                matchedProfile?: { displayName?: string; photos?: string[] };
              }) => (
                <div
                  key={match.id}
                  className="new-match-avatar"
                  onClick={() => setSelectedMatchId(match.id)}
                >
                  <img
                    className="match-avatar"
                    src={match.matchedProfile?.photos?.[0] || ''}
                    alt={match.matchedProfile?.displayName || ''}
                  />
                  <span className="match-name">{match.matchedProfile?.displayName}</span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="conversations-list">
        <h3>Conversations</h3>
        {conversations.length === 0 ? (
          <EmptyState title="No conversations yet" description="Send a message to your matches!" />
        ) : (
          conversations.map(
            (match: {
              id: string;
              matchedProfile?: { displayName?: string; photos?: string[] };
              lastMessage?: string;
              unread?: boolean;
            }) => (
              <div
                key={match.id}
                className={`conversation-item ${match.unread ? 'unread' : ''}`}
                onClick={() => setSelectedMatchId(match.id)}
              >
                <img
                  className="conv-avatar"
                  src={match.matchedProfile?.photos?.[0] || ''}
                  alt={match.matchedProfile?.displayName || ''}
                />
                <div className="conv-info">
                  <span className="conv-name">{match.matchedProfile?.displayName}</span>
                  <span className="conv-last-message">{match.lastMessage}</span>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
