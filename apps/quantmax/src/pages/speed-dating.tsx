// ============================================================================
// QuantMax - Speed Dating
// Lobby with time slots, 3-minute circular countdown timer, video call area,
// extend time button (+1 min, max 2), add contact button, thumbs up/down
// rating after call, next match queue indicator
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  maxParticipants: number;
  status: 'available' | 'full' | 'joined' | 'in_progress';
}

interface SpeedDateMatch {
  id: string;
  userId: string;
  displayName: string;
  age: number;
  avatarUrl: string;
  bio: string;
  interests: string[];
  distance: number;
  isVerified: boolean;
}

interface DateRating {
  matchId: string;
  rating: 'thumbs_up' | 'thumbs_down' | null;
  addedContact: boolean;
}

type SpeedDateState = 'lobby' | 'waiting' | 'in_call' | 'rating' | 'between_matches';

const SpeedDatingPage: React.FC = () => {
  const [state, setState] = useState<SpeedDateState>('lobby');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [currentMatch, setCurrentMatch] = useState<SpeedDateMatch | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(180); // 3 minutes in seconds
  const [totalTime, setTotalTime] = useState<number>(180);
  const [extensionsUsed, setExtensionsUsed] = useState<number>(0);
  const [maxExtensions] = useState<number>(2);
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [addedContact, setAddedContact] = useState<boolean>(false);
  const [matchQueue, setMatchQueue] = useState<number>(0);
  const [completedDates, setCompletedDates] = useState<DateRating[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [waitingTime, setWaitingTime] = useState<number>(0);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTimeSlots();
  }, []);

  useEffect(() => {
    if (state === 'in_call' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            endCurrentDate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, timeRemaining]);

  useEffect(() => {
    if (state === 'waiting') {
      setWaitingTime(0);
      waitingRef.current = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);

      // Simulate finding a match
      const matchTime = 3000 + Math.random() * 5000;
      setTimeout(() => {
        if (waitingRef.current) clearInterval(waitingRef.current);
        startDate();
      }, matchTime);
    }
    return () => {
      if (waitingRef.current) clearInterval(waitingRef.current);
    };
  }, [state]);

  const loadTimeSlots = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      const now = new Date();
      const slots: TimeSlot[] = Array.from({ length: 8 }, (_, i) => {
        const start = new Date(now.getTime() + i * 30 * 60000);
        const end = new Date(start.getTime() + 30 * 60000);
        return {
          id: `slot-${i}`,
          startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          participantCount: Math.floor(Math.random() * 20) + 5,
          maxParticipants: 30,
          status: i === 0 ? 'in_progress' : i < 2 ? 'available' : Math.random() > 0.7 ? 'full' : 'available',
        };
      });
      setTimeSlots(slots);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleJoinSlot = useCallback((slotId: string) => {
    setSelectedSlot(slotId);
    setTimeSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'joined' } : s));
    setState('waiting');
    setMatchQueue(Math.floor(Math.random() * 5) + 2);
  }, []);

  const startDate = useCallback(() => {
    const match: SpeedDateMatch = {
      id: `match-${Date.now()}`,
      userId: `user-${crypto.randomUUID()}`,
      displayName: ['Emma', 'Sophia', 'Liam', 'Noah', 'Olivia', 'Ava', 'Lucas', 'Mia'][Math.floor(Math.random() * 8)],
      age: 22 + Math.floor(Math.random() * 10),
      avatarUrl: `https://cdn.quantmax.app/speed-dating/avatars/${Math.floor(Math.random() * 20)}.jpg`,
      bio: 'Looking for meaningful connections and fun conversations!',
      interests: ['Travel', 'Music', 'Coffee', 'Hiking', 'Photography'].sort(() => Math.random() - 0.5).slice(0, 3),
      distance: Math.floor(Math.random() * 20) + 1,
      isVerified: Math.random() > 0.5,
    };
    setCurrentMatch(match);
    setTimeRemaining(180);
    setTotalTime(180);
    setExtensionsUsed(0);
    setRating(null);
    setAddedContact(false);
    setState('in_call');
    setMatchQueue(prev => Math.max(0, prev - 1));
  }, []);

  const endCurrentDate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('rating');
  }, []);

  const handleExtendTime = useCallback(() => {
    if (extensionsUsed >= maxExtensions) return;
    setExtensionsUsed(prev => prev + 1);
    setTimeRemaining(prev => prev + 60);
    setTotalTime(prev => prev + 60);
  }, [extensionsUsed, maxExtensions]);

  const handleRate = useCallback((ratingValue: 'thumbs_up' | 'thumbs_down') => {
    setRating(ratingValue);
  }, []);

  const handleAddContact = useCallback(() => {
    setAddedContact(true);
  }, []);

  const handleNextMatch = useCallback(() => {
    if (!currentMatch) return;
    setCompletedDates(prev => [...prev, {
      matchId: currentMatch.id,
      rating,
      addedContact,
    }]);
    setState('between_matches');
    setTimeout(() => {
      if (matchQueue > 0) {
        setState('waiting');
      } else {
        setState('lobby');
      }
    }, 2000);
  }, [currentMatch, rating, addedContact, matchQueue]);

  const handleLeaveSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waitingRef.current) clearInterval(waitingRef.current);
    setState('lobby');
    setCurrentMatch(null);
  }, []);

  const timerPercentage = useMemo(() => {
    return (timeRemaining / totalTime) * 100;
  }, [timeRemaining, totalTime]);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const timerColor = useMemo(() => {
    if (timeRemaining > 60) return '#4caf50';
    if (timeRemaining > 30) return '#ff9800';
    return '#f44336';
  }, [timeRemaining]);

  if (loading) {
    return (
      <div className="speed-dating-loading">
        <div className="loading-spinner" />
        <p>Loading speed dating sessions...</p>
      </div>
    );
  }

  // Lobby State
  if (state === 'lobby') {
    return (
      <div className="speed-dating-page lobby">
        <div className="lobby-header">
          <h1 className="page-title">Speed Dating</h1>
          <button className="history-btn" onClick={() => setShowHistory(!showHistory)}>
            History ({completedDates.length})
          </button>
        </div>

        <p className="lobby-description">
          3-minute video dates with real people. Quick, fun, and pressure-free!
        </p>

        <div className="how-it-works">
          <h3>How It Works</h3>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <span className="step-text">Join a time slot</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span className="step-text">3-min video date</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span className="step-text">Rate & connect</span>
            </div>
          </div>
        </div>

        <div className="time-slots-section">
          <h3>Available Sessions</h3>
          <div className="slots-list">
            {timeSlots.map(slot => (
              <div key={slot.id} className={`slot-card ${slot.status}`}>
                <div className="slot-time">
                  <span className="time-range">{slot.startTime} - {slot.endTime}</span>
                </div>
                <div className="slot-info">
                  <span className="slot-participants">{slot.participantCount}/{slot.maxParticipants} joined</span>
                  <div className="slot-fill-bar">
                    <div className="fill" style={{ width: `${(slot.participantCount / slot.maxParticipants) * 100}%` }} />
                  </div>
                </div>
                <button
                  className="join-slot-btn"
                  onClick={() => handleJoinSlot(slot.id)}
                  disabled={slot.status === 'full' || slot.status === 'joined'}
                >
                  {slot.status === 'full' ? 'Full' : slot.status === 'joined' ? 'Joined' : slot.status === 'in_progress' ? 'Join Now' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && completedDates.length > 0 && (
          <div className="history-panel">
            <h3>Date History</h3>
            <div className="history-list">
              {completedDates.map((date, idx) => (
                <div key={idx} className="history-item">
                  <span className="history-rating">{date.rating === 'thumbs_up' ? '👍' : '👎'}</span>
                  <span className="history-contact">{date.addedContact ? 'Connected' : 'Passed'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Waiting State
  if (state === 'waiting') {
    return (
      <div className="speed-dating-page waiting">
        <div className="waiting-animation">
          <div className="pulse-circle c1" />
          <div className="pulse-circle c2" />
          <div className="pulse-circle c3" />
          <span className="heart-icon">💕</span>
        </div>
        <h2 className="waiting-title">Finding your next date...</h2>
        <p className="waiting-time">Waiting for {waitingTime}s</p>
        <p className="queue-info">{matchQueue} people in queue</p>
        <button className="leave-btn" onClick={handleLeaveSession}>Leave Session</button>
      </div>
    );
  }

  // Between matches
  if (state === 'between_matches') {
    return (
      <div className="speed-dating-page between">
        <div className="between-content">
          <h2>Getting your next match ready...</h2>
          <div className="loading-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      </div>
    );
  }

  // In Call State
  if (state === 'in_call' && currentMatch) {
    return (
      <div className="speed-dating-page in-call">
        {/* Video Area */}
        <div className="date-video-area">
          <div className="remote-video-section">
            <div className="match-info-overlay">
              <span className="match-name">{currentMatch.displayName}, {currentMatch.age}</span>
              {currentMatch.isVerified && <span className="verified-badge">&#10003;</span>}
              <span className="match-distance">{currentMatch.distance} km away</span>
            </div>
            <div className="match-interests-overlay">
              {currentMatch.interests.map(i => (
                <span key={i} className="interest-pill">{i}</span>
              ))}
            </div>
          </div>
          <div className="self-video-pip">
            {!isCameraOn && <span className="camera-off-text">Camera Off</span>}
          </div>
        </div>

        {/* Circular Timer */}
        <div className="timer-container">
          <svg className="timer-svg" viewBox="0 0 100 100">
            <circle className="timer-bg" cx="50" cy="50" r="45" fill="none" strokeWidth="4" stroke="#333" />
            <circle
              className="timer-progress"
              cx="50" cy="50" r="45"
              fill="none"
              strokeWidth="4"
              stroke={timerColor}
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - timerPercentage / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="timer-text" style={{ color: timerColor }}>{formatTime(timeRemaining)}</span>
        </div>

        {/* Queue Indicator */}
        <div className="queue-indicator">
          <span className="queue-text">{matchQueue} next in queue</span>
        </div>

        {/* Controls */}
        <div className="call-controls">
          <button className={`call-control ${!isMuted ? '' : 'off'}`} onClick={() => setIsMuted(!isMuted)}>
            <span>{isMuted ? '🔇' : '🎤'}</span>
          </button>
          <button className={`call-control ${isCameraOn ? '' : 'off'}`} onClick={() => setIsCameraOn(!isCameraOn)}>
            <span>{isCameraOn ? '📷' : '📷'}</span>
          </button>
          <button
            className="call-control extend"
            onClick={handleExtendTime}
            disabled={extensionsUsed >= maxExtensions}
          >
            <span>+1 min</span>
            <span className="extension-count">({maxExtensions - extensionsUsed} left)</span>
          </button>
          <button className="call-control add-contact" onClick={handleAddContact} disabled={addedContact}>
            <span>{addedContact ? '&#10003; Added' : '+ Contact'}</span>
          </button>
          <button className="call-control end-call" onClick={endCurrentDate}>
            <span>End</span>
          </button>
        </div>
      </div>
    );
  }

  // Rating State
  if (state === 'rating' && currentMatch) {
    return (
      <div className="speed-dating-page rating">
        <div className="rating-card">
          <img className="rating-avatar" src={currentMatch.avatarUrl} alt={currentMatch.displayName} />
          <h2 className="rating-name">{currentMatch.displayName}</h2>
          <p className="rating-question">How was your date?</p>

          <div className="rating-buttons">
            <button
              className={`rating-btn thumbs-down ${rating === 'thumbs_down' ? 'selected' : ''}`}
              onClick={() => handleRate('thumbs_down')}
            >
              <span className="rating-icon">👎</span>
              <span>Pass</span>
            </button>
            <button
              className={`rating-btn thumbs-up ${rating === 'thumbs_up' ? 'selected' : ''}`}
              onClick={() => handleRate('thumbs_up')}
            >
              <span className="rating-icon">👍</span>
              <span>Great!</span>
            </button>
          </div>

          {!addedContact && rating === 'thumbs_up' && (
            <button className="add-contact-rating-btn" onClick={handleAddContact}>
              Add to Contacts
            </button>
          )}
          {addedContact && (
            <p className="contact-added-msg">Contact added! You can message them now.</p>
          )}

          <button className="next-match-btn" onClick={handleNextMatch}>
            {matchQueue > 0 ? 'Next Date' : 'Back to Lobby'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SpeedDatingPage;
