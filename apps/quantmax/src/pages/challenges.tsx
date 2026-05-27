// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - Challenges Page
// Active challenges list with banner/description/prize, leaderboard table,
// submission count, participate button, video gallery of entries,
// create challenge form (verified creators with follower threshold)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface Challenge {
  id: string;
  hashtag: string;
  title: string;
  description: string;
  bannerUrl: string;
  prizePool: string | null;
  rules: string[];
  startDate: string;
  endDate: string;
  submissionCount: number;
  participantCount: number;
  status: 'active' | 'upcoming' | 'ended';
  sponsoredBy: string | null;
  creatorId: string;
  creatorName: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string;
  videoId: string;
  thumbnailUrl: string;
  likes: number;
  views: number;
  score: number;
}

interface ChallengeEntry {
  id: string;
  videoId: string;
  thumbnailUrl: string;
  creatorUsername: string;
  creatorAvatar: string;
  likes: number;
  views: number;
  submittedAt: string;
}

interface CreateChallengeForm {
  title: string;
  hashtag: string;
  description: string;
  rules: string[];
  prizePool: string;
  duration: number;
}

const ChallengesPage: React.FC = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'upcoming' | 'ended'>('active');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreateChallengeForm>({
    title: '',
    hashtag: '',
    description: '',
    rules: [''],
    prizePool: '',
    duration: 7,
  });
  const [isVerifiedCreator, setIsVerifiedCreator] = useState<boolean>(true);
  const [followerCount, setFollowerCount] = useState<number>(25000);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [entriesView, setEntriesView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadChallenges();
  }, []);

  useEffect(() => {
    if (selectedChallenge) {
      loadChallengeDetails(selectedChallenge.id);
    }
  }, [selectedChallenge]);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockChallenges: Challenge[] = Array.from({ length: 12 }, (_, i) => ({
        id: `challenge-${i}`,
        hashtag: `#${['DanceOff', 'CookChallenge', 'FitIn30', 'LipSyncBattle', 'DIYCraft', 'PetTricks', 'MorningRoutine', 'DuetThis', 'OutfitCheck', 'BookTok', 'GlowUp', 'SketchDaily'][i]}`,
        title: [
          'Ultimate Dance Off',
          'Cook It Your Way',
          '30 Day Fitness',
          'Lip Sync Battle',
          'DIY Crafting',
          'Pet Trick Show',
          'Morning Routine',
          'Duet Challenge',
          'Outfit of the Day',
          'Book Recommendations',
          'Glow Up Challenge',
          'Daily Sketch',
        ][i],
        description: `Show off your ${['dance moves', 'cooking skills', 'fitness progress', 'lip sync talent', 'crafting abilities', 'pet tricks', 'morning vibes', 'duet creativity', 'fashion sense', 'reading taste', 'transformation', 'art skills'][i]}!`,
        bannerUrl: `https://cdn.quantmax.app/challenges/${i}/banner.jpg`,
        prizePool: i < 4 ? `$${(i + 1) * 500}` : null,
        rules: [
          'Must use the official sound',
          'Tag the challenge hashtag',
          'Original content only',
          'Maximum 60 seconds',
        ],
        startDate: '2024-01-01',
        endDate: i < 6 ? '2024-02-15' : i < 9 ? '2024-01-20' : '2024-01-10',
        submissionCount: Math.floor(Math.random() * 50000) + 1000,
        participantCount: Math.floor(Math.random() * 20000) + 500,
        status: i < 6 ? 'active' : i < 9 ? 'upcoming' : 'ended',
        sponsoredBy: i % 4 === 0 ? ['Nike', 'Samsung', 'Spotify'][i % 3] : null,
        creatorId: `creator-${i}`,
        creatorName: `Creator${i + 1}`,
      }));
      setChallenges(mockChallenges);
    } catch (err) {
      setError('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChallengeDetails = useCallback(async (challengeId: string) => {
    // Load leaderboard
    const mockLeaderboard: LeaderboardEntry[] = Array.from({ length: 20 }, (_, i) => ({
      rank: i + 1,
      userId: `user-${i}`,
      username: `star_creator_${i}`,
      avatarUrl: `https://cdn.quantmax.app/avatars/lb${i}.jpg`,
      videoId: `video-${i}`,
      thumbnailUrl: `https://cdn.quantmax.app/challenges/entries/${i}.jpg`,
      likes: Math.floor(Math.random() * 100000) * (20 - i),
      views: Math.floor(Math.random() * 500000) * (20 - i),
      score: (20 - i) * 100 + Math.floor(Math.random() * 50),
    }));
    setLeaderboard(mockLeaderboard);

    // Load entries
    const mockEntries: ChallengeEntry[] = Array.from({ length: 24 }, (_, i) => ({
      id: `entry-${i}`,
      videoId: `video-entry-${i}`,
      thumbnailUrl: `https://cdn.quantmax.app/challenges/entries/grid/${i}.jpg`,
      creatorUsername: `creator_${i}`,
      creatorAvatar: `https://cdn.quantmax.app/avatars/entry${i}.jpg`,
      likes: Math.floor(Math.random() * 50000),
      views: Math.floor(Math.random() * 200000),
      submittedAt: `${Math.floor(Math.random() * 48) + 1}h ago`,
    }));
    setEntries(mockEntries);
  }, []);

  const handleParticipate = useCallback((challenge: Challenge) => {
    // Navigate to create page with challenge context
    console.log('Participating in:', challenge.hashtag);
  }, []);

  const handleCreateChallenge = useCallback(() => {
    if (!createForm.title.trim() || !createForm.hashtag.trim()) return;
    setShowCreateForm(false);
    setCreateForm({
      title: '',
      hashtag: '',
      description: '',
      rules: [''],
      prizePool: '',
      duration: 7,
    });
  }, [createForm]);

  const handleAddRule = useCallback(() => {
    setCreateForm((prev) => ({ ...prev, rules: [...prev.rules, ''] }));
  }, []);

  const handleUpdateRule = useCallback((index: number, value: string) => {
    setCreateForm((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => (i === index ? value : r)),
    }));
  }, []);

  const handleRemoveRule = useCallback((index: number) => {
    setCreateForm((prev) => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }));
  }, []);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => c.status === filter);
  }, [challenges, filter]);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }, []);

  const canCreateChallenge = isVerifiedCreator && followerCount >= 10000;

  if (loading) {
    return (
      <div className="challenges-loading">
        <div className="loading-spinner" />
        <p>Loading challenges...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="challenges-error">
        <p>{error}</p>
        <button className="retry-btn" onClick={loadChallenges}>
          Retry
        </button>
      </div>
    );
  }

  // Challenge Detail View
  if (selectedChallenge) {
    return (
      <div className="challenge-detail-page">
        <button className="back-btn" onClick={() => setSelectedChallenge(null)}>
          &larr; Back
        </button>

        <div className="challenge-banner-area">
          <img
            className="detail-banner"
            src={selectedChallenge.bannerUrl}
            alt={selectedChallenge.title}
          />
          <div className="banner-overlay">
            <h1 className="detail-hashtag">{selectedChallenge.hashtag}</h1>
            <h2 className="detail-title">{selectedChallenge.title}</h2>
            {selectedChallenge.sponsoredBy && (
              <span className="sponsor-badge">Sponsored by {selectedChallenge.sponsoredBy}</span>
            )}
          </div>
        </div>

        <div className="challenge-stats-row">
          <div className="stat-item">
            <span className="stat-value">{formatCount(selectedChallenge.submissionCount)}</span>
            <span className="stat-label">Submissions</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatCount(selectedChallenge.participantCount)}</span>
            <span className="stat-label">Participants</span>
          </div>
          {selectedChallenge.prizePool && (
            <div className="stat-item prize">
              <span className="stat-value">{selectedChallenge.prizePool}</span>
              <span className="stat-label">Prize Pool</span>
            </div>
          )}
        </div>

        <p className="challenge-description">{selectedChallenge.description}</p>

        <div className="challenge-rules">
          <h3>Rules</h3>
          <ul className="rules-list">
            {selectedChallenge.rules.map((rule, idx) => (
              <li key={idx} className="rule-item">
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <button
          className="participate-btn large"
          onClick={() => handleParticipate(selectedChallenge)}
        >
          Participate Now
        </button>

        {/* Leaderboard Toggle */}
        <div className="detail-tabs">
          <button
            className={`detail-tab ${showLeaderboard ? '' : 'active'}`}
            onClick={() => setShowLeaderboard(false)}
          >
            Entries
          </button>
          <button
            className={`detail-tab ${showLeaderboard ? 'active' : ''}`}
            onClick={() => setShowLeaderboard(true)}
          >
            Leaderboard
          </button>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="leaderboard-section">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Creator</th>
                  <th>Views</th>
                  <th>Likes</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`lb-row ${entry.rank <= 3 ? `top-${entry.rank}` : ''}`}
                  >
                    <td className="rank-cell">
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                    </td>
                    <td className="creator-cell">
                      <img className="lb-avatar" src={entry.avatarUrl} alt={entry.username} />
                      <span className="lb-username">{entry.username}</span>
                    </td>
                    <td className="views-cell">{formatCount(entry.views)}</td>
                    <td className="likes-cell">{formatCount(entry.likes)}</td>
                    <td className="score-cell">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Entries Grid */}
        {!showLeaderboard && (
          <div className="entries-section">
            <div className="entries-header">
              <span className="entries-count">{entries.length} entries</span>
              <div className="view-toggle">
                <button
                  className={`view-btn ${entriesView === 'grid' ? 'active' : ''}`}
                  onClick={() => setEntriesView('grid')}
                >
                  Grid
                </button>
                <button
                  className={`view-btn ${entriesView === 'list' ? 'active' : ''}`}
                  onClick={() => setEntriesView('list')}
                >
                  List
                </button>
              </div>
            </div>
            <div className={`entries-${entriesView}`}>
              {entries.map((entry) => (
                <div key={entry.id} className="entry-card">
                  <img className="entry-thumbnail" src={entry.thumbnailUrl} alt="Entry" />
                  <div className="entry-info">
                    <span className="entry-creator">@{entry.creatorUsername}</span>
                    <div className="entry-stats">
                      <span>&#10084; {formatCount(entry.likes)}</span>
                      <span>&#128065; {formatCount(entry.views)}</span>
                    </div>
                    <span className="entry-time">{entry.submittedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="challenges-page">
      <div className="challenges-header">
        <h1 className="page-title">Challenges</h1>
        {canCreateChallenge && (
          <button className="create-challenge-btn" onClick={() => setShowCreateForm(true)}>
            + Create Challenge
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="challenge-filters">
        {(['active', 'upcoming', 'ended'] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Challenge List */}
      <div className="challenges-list">
        {filteredChallenges.length === 0 && (
          <div className="no-challenges">
            <p>No {filter} challenges right now</p>
          </div>
        )}
        {filteredChallenges.map((challenge) => (
          <div
            key={challenge.id}
            className="challenge-card"
            onClick={() => setSelectedChallenge(challenge)}
          >
            <img
              className="challenge-card-banner"
              src={challenge.bannerUrl}
              alt={challenge.title}
            />
            <div className="challenge-card-content">
              <div className="challenge-card-header">
                <h3 className="challenge-card-hashtag">{challenge.hashtag}</h3>
                {challenge.prizePool && <span className="prize-tag">{challenge.prizePool}</span>}
              </div>
              <p className="challenge-card-desc">{challenge.description}</p>
              <div className="challenge-card-stats">
                <span>{formatCount(challenge.submissionCount)} videos</span>
                <span>{formatCount(challenge.participantCount)} creators</span>
                <span>Ends {challenge.endDate}</span>
              </div>
              {challenge.sponsoredBy && (
                <span className="sponsor-label">by {challenge.sponsoredBy}</span>
              )}
              <button
                className="participate-card-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleParticipate(challenge);
                }}
              >
                Participate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Challenge Form */}
      {showCreateForm && (
        <div className="create-challenge-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="create-challenge-form" onClick={(e) => e.stopPropagation()}>
            <h2>Create a Challenge</h2>
            <div className="form-field">
              <label>Challenge Title</label>
              <input
                className="field-input"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Give your challenge a name"
              />
            </div>
            <div className="form-field">
              <label>Hashtag</label>
              <input
                className="field-input"
                value={createForm.hashtag}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, hashtag: e.target.value }))}
                placeholder="#YourChallenge"
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea
                className="field-textarea"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe your challenge..."
              />
            </div>
            <div className="form-field">
              <label>Rules</label>
              {createForm.rules.map((rule, idx) => (
                <div key={idx} className="rule-input-row">
                  <input
                    className="rule-input"
                    value={rule}
                    onChange={(e) => handleUpdateRule(idx, e.target.value)}
                    placeholder={`Rule ${idx + 1}`}
                  />
                  <button className="remove-rule" onClick={() => handleRemoveRule(idx)}>
                    x
                  </button>
                </div>
              ))}
              <button className="add-rule-btn" onClick={handleAddRule}>
                + Add Rule
              </button>
            </div>
            <div className="form-field">
              <label>Prize Pool (optional)</label>
              <input
                className="field-input"
                value={createForm.prizePool}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, prizePool: e.target.value }))}
                placeholder="$0"
              />
            </div>
            <div className="form-field">
              <label>Duration (days)</label>
              <input
                type="number"
                className="field-input"
                value={createForm.duration}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, duration: Number(e.target.value) }))
                }
                min={1}
                max={30}
              />
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button className="submit-challenge-btn" onClick={handleCreateChallenge}>
                Create Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengesPage;
