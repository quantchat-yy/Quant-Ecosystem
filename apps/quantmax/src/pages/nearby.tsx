// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - Nearby People
// Distance-sorted card list, mutual interests badges, wave button (poke),
// accept/decline waves panel, filter controls (interests, age range, distance)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface NearbyPerson {
  id: string;
  displayName: string;
  age: number;
  distance: number;
  avatarUrl: string;
  bio: string;
  interests: string[];
  mutualInterests: string[];
  isOnline: boolean;
  lastActive: string;
  isVerified: boolean;
  hasWaved: boolean;
  receivedWave: boolean;
}

interface WaveNotification {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar: string;
  fromAge: number;
  message: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface NearbyFilters {
  interests: string[];
  ageMin: number;
  ageMax: number;
  maxDistance: number;
  onlineOnly: boolean;
  verifiedOnly: boolean;
}

const ALL_INTERESTS = [
  'Travel',
  'Music',
  'Hiking',
  'Photography',
  'Cooking',
  'Yoga',
  'Reading',
  'Coffee',
  'Art',
  'Dancing',
  'Movies',
  'Gaming',
  'Fitness',
  'Pets',
  'Wine',
  'Brunch',
  'Sports',
  'Fashion',
  'Tech',
  'Nature',
];

const NearbyPage: React.FC = () => {
  const [people, setPeople] = useState<NearbyPerson[]>([]);
  const [waves, setWaves] = useState<WaveNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NearbyFilters>({
    interests: [],
    ageMin: 18,
    ageMax: 50,
    maxDistance: 50,
    onlineOnly: false,
    verifiedOnly: false,
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showWavesPanel, setShowWavesPanel] = useState<boolean>(false);
  const [waveMessage, setWaveMessage] = useState<string>('');
  const [wavingTo, setWavingTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'active' | 'mutual'>('distance');

  useEffect(() => {
    loadNearbyPeople();
    loadWaves();
  }, []);

  const loadNearbyPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const myInterests = ['Music', 'Travel', 'Coffee', 'Hiking', 'Photography'];
      const mockPeople: NearbyPerson[] = Array.from({ length: 20 }, (_, i) => {
        const personInterests = ALL_INTERESTS.sort(() => Math.random() - 0.5).slice(0, 5);
        const mutual = personInterests.filter((pi) => myInterests.includes(pi));
        return {
          id: `nearby-${i}`,
          displayName: [
            'Alex',
            'Jordan',
            'Sam',
            'Morgan',
            'Taylor',
            'Casey',
            'Riley',
            'Avery',
            'Quinn',
            'Reese',
            'Blake',
            'Dakota',
            'Finley',
            'Harper',
            'Kendall',
            'Logan',
            'Parker',
            'Rowan',
            'Skyler',
            'Sage',
          ][i],
          age: 20 + Math.floor(Math.random() * 15),
          distance: (i + 1) * 0.5 + Math.random() * 2,
          avatarUrl: `https://cdn.quantmax.app/nearby/avatars/${i}.jpg`,
          bio: [
            `Love exploring new places`,
            `Music is my life`,
            `Here for good vibes`,
            `Looking for adventure buddies`,
            `Coffee enthusiast`,
          ][i % 5],
          interests: personInterests,
          mutualInterests: mutual,
          isOnline: Math.random() > 0.4,
          lastActive: Math.random() > 0.5 ? 'Now' : `${Math.floor(Math.random() * 60) + 1}m ago`,
          isVerified: i % 4 === 0,
          hasWaved: i === 3 || i === 7,
          receivedWave: i === 1 || i === 5,
        };
      });
      setPeople(mockPeople);
    } catch (err) {
      setError('Could not find nearby people. Check your location settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWaves = useCallback(async () => {
    const mockWaves: WaveNotification[] = Array.from({ length: 5 }, (_, i) => ({
      id: `wave-${i}`,
      fromUserId: `user-wave-${i}`,
      fromUsername: ['Sophie', 'Liam', 'Emma', 'Noah', 'Olivia'][i],
      fromAvatar: `https://cdn.quantmax.app/nearby/waves/${i}.jpg`,
      fromAge: 22 + i,
      message: [
        'Hey! Noticed we both like music',
        'Your profile is cool!',
        'Hi neighbor!',
        'We have so much in common!',
        'Want to grab coffee?',
      ][i],
      timestamp: `${(i + 1) * 10}m ago`,
      status: 'pending',
    }));
    setWaves(mockWaves);
  }, []);

  const handleWave = useCallback((personId: string) => {
    setWavingTo(personId);
  }, []);

  const handleSendWave = useCallback(() => {
    if (!wavingTo) return;
    setPeople((prev) => prev.map((p) => (p.id === wavingTo ? { ...p, hasWaved: true } : p)));
    setWavingTo(null);
    setWaveMessage('');
  }, [wavingTo]);

  const handleAcceptWave = useCallback((waveId: string) => {
    setWaves((prev) => prev.map((w) => (w.id === waveId ? { ...w, status: 'accepted' } : w)));
  }, []);

  const handleDeclineWave = useCallback((waveId: string) => {
    setWaves((prev) => prev.map((w) => (w.id === waveId ? { ...w, status: 'declined' } : w)));
  }, []);

  const handleToggleInterestFilter = useCallback((interest: string) => {
    setFilters((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }, []);

  const filteredPeople = useMemo(() => {
    let result = people.filter((p) => {
      if (p.age < filters.ageMin || p.age > filters.ageMax) return false;
      if (p.distance > filters.maxDistance) return false;
      if (filters.onlineOnly && !p.isOnline) return false;
      if (filters.verifiedOnly && !p.isVerified) return false;
      if (filters.interests.length > 0 && !filters.interests.some((fi) => p.interests.includes(fi)))
        return false;
      return true;
    });

    switch (sortBy) {
      case 'distance':
        result.sort((a, b) => a.distance - b.distance);
        break;
      case 'active':
        result.sort((a, b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1));
        break;
      case 'mutual':
        result.sort((a, b) => b.mutualInterests.length - a.mutualInterests.length);
        break;
    }
    return result;
  }, [people, filters, sortBy]);

  const pendingWaves = useMemo(() => waves.filter((w) => w.status === 'pending'), [waves]);

  if (loading) {
    return (
      <div className="nearby-loading">
        <div className="loading-spinner" />
        <p>Finding people near you...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nearby-error">
        <p className="error-message">{error}</p>
        <button className="retry-btn" onClick={loadNearbyPeople}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="nearby-page">
      {/* Header */}
      <div className="nearby-header">
        <h1 className="page-title">Nearby</h1>
        <div className="header-actions">
          <button className="waves-btn" onClick={() => setShowWavesPanel(!showWavesPanel)}>
            Waves
            {pendingWaves.length > 0 && <span className="wave-count">{pendingWaves.length}</span>}
          </button>
          <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
            Filters
          </button>
        </div>
      </div>

      {/* Sort Options */}
      <div className="sort-options">
        {(['distance', 'active', 'mutual'] as const).map((s) => (
          <button
            key={s}
            className={`sort-btn ${sortBy === s ? 'active' : ''}`}
            onClick={() => setSortBy(s)}
          >
            {s === 'distance' ? 'Nearest' : s === 'active' ? 'Active Now' : 'Most in Common'}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <h3 className="filters-title">Filters</h3>

          <div className="filter-group">
            <label className="filter-label">
              Age Range: {filters.ageMin} - {filters.ageMax}
            </label>
            <div className="dual-range">
              <input
                type="range"
                min="18"
                max="65"
                value={filters.ageMin}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    ageMin: Math.min(Number(e.target.value), prev.ageMax - 1),
                  }))
                }
              />
              <input
                type="range"
                min="18"
                max="65"
                value={filters.ageMax}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    ageMax: Math.max(Number(e.target.value), prev.ageMin + 1),
                  }))
                }
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Max Distance: {filters.maxDistance} km</label>
            <input
              type="range"
              min="1"
              max="100"
              value={filters.maxDistance}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, maxDistance: Number(e.target.value) }))
              }
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Interests</label>
            <div className="interests-filter-grid">
              {ALL_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  className={`interest-filter-btn ${filters.interests.includes(interest) ? 'selected' : ''}`}
                  onClick={() => handleToggleInterestFilter(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-toggles">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={filters.onlineOnly}
                onChange={(e) => setFilters((prev) => ({ ...prev, onlineOnly: e.target.checked }))}
              />
              Online only
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, verifiedOnly: e.target.checked }))
                }
              />
              Verified only
            </label>
          </div>

          <button className="apply-filters-btn" onClick={() => setShowFilters(false)}>
            Apply Filters
          </button>
        </div>
      )}

      {/* Waves Panel */}
      {showWavesPanel && (
        <div className="waves-panel">
          <h3 className="waves-title">Incoming Waves</h3>
          {pendingWaves.length === 0 && <p className="no-waves">No pending waves</p>}
          {pendingWaves.map((wave) => (
            <div key={wave.id} className="wave-item">
              <img className="wave-avatar" src={wave.fromAvatar} alt={wave.fromUsername} />
              <div className="wave-content">
                <span className="wave-name">
                  {wave.fromUsername}, {wave.fromAge}
                </span>
                <p className="wave-message">{wave.message}</p>
                <span className="wave-time">{wave.timestamp}</span>
              </div>
              <div className="wave-actions">
                <button className="accept-wave-btn" onClick={() => handleAcceptWave(wave.id)}>
                  Accept
                </button>
                <button className="decline-wave-btn" onClick={() => handleDeclineWave(wave.id)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* People Cards List */}
      <div className="nearby-cards-list">
        {filteredPeople.length === 0 && (
          <div className="no-people">
            <p>No one found matching your filters. Try expanding your search.</p>
          </div>
        )}
        {filteredPeople.map((person) => (
          <div key={person.id} className="nearby-card">
            <div className="card-left">
              <div className="avatar-wrapper">
                <img className="person-avatar" src={person.avatarUrl} alt={person.displayName} />
                {person.isOnline && <span className="online-dot" />}
                {person.isVerified && <span className="verified-mini">&#10003;</span>}
              </div>
            </div>
            <div className="card-center">
              <div className="person-name-row">
                <h3 className="person-name">
                  {person.displayName}, {person.age}
                </h3>
                <span className="person-distance">{person.distance.toFixed(1)} km</span>
              </div>
              <p className="person-bio">{person.bio}</p>
              {person.mutualInterests.length > 0 && (
                <div className="mutual-interests">
                  {person.mutualInterests.map((mi) => (
                    <span key={mi} className="mutual-badge">
                      {mi}
                    </span>
                  ))}
                </div>
              )}
              <span className="last-active">
                {person.isOnline ? 'Online now' : person.lastActive}
              </span>
            </div>
            <div className="card-right">
              {person.hasWaved ? (
                <span className="waved-label">Waved</span>
              ) : person.receivedWave ? (
                <button className="wave-back-btn" onClick={() => handleWave(person.id)}>
                  Wave Back
                </button>
              ) : (
                <button className="wave-btn" onClick={() => handleWave(person.id)}>
                  <span className="wave-icon">&#128075;</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Wave Message Modal */}
      {wavingTo && (
        <div className="wave-modal-overlay" onClick={() => setWavingTo(null)}>
          <div className="wave-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send a Wave</h3>
            <p>Add a message (optional)</p>
            <input
              className="wave-message-input"
              placeholder="Hey there!"
              value={waveMessage}
              onChange={(e) => setWaveMessage(e.target.value)}
              maxLength={100}
            />
            <div className="wave-modal-actions">
              <button className="cancel-btn" onClick={() => setWavingTo(null)}>
                Cancel
              </button>
              <button className="send-wave-btn" onClick={handleSendWave}>
                Send Wave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyPage;
