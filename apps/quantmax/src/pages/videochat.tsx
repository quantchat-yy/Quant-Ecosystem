// ============================================================================
// QuantMax - Random Video Chat (Omegle-style)
// Interest tags, match button, video streams (self PiP + remote main),
// text chat sidebar, skip/next, report, connection quality, auto-skip timer
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { ErrorState } from '@quant/shared-ui';

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

interface MatchedUser {
  id: string;
  username: string;
  avatarUrl: string;
  interests: string[];
  country: string;
}

type ConnectionState = 'idle' | 'searching' | 'connecting' | 'connected' | 'disconnected' | 'error';
type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';

interface ConnectionStats {
  quality: ConnectionQuality;
  latency: number;
  bandwidth: number;
  packetLoss: number;
}

const SUGGESTED_INTERESTS = [
  'Music',
  'Gaming',
  'Travel',
  'Tech',
  'Sports',
  'Art',
  'Movies',
  'Cooking',
  'Fitness',
  'Books',
  'Photography',
  'Dance',
  'Comedy',
  'Fashion',
  'Science',
  'Nature',
  'Languages',
  'Anime',
  'Coding',
];

const VideoChatPage: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [matchedUser, setMatchedUser] = useState<MatchedUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState<string>('');
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [showChat, setShowChat] = useState<boolean>(true);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    quality: 'good',
    latency: 45,
    bandwidth: 2500,
    packetLoss: 0.1,
  });
  const [autoSkipEnabled, setAutoSkipEnabled] = useState<boolean>(false);
  const [autoSkipSeconds, setAutoSkipSeconds] = useState<number>(30);
  const [autoSkipTimer, setAutoSkipTimer] = useState<number>(0);
  const [matchedInterests, setMatchedInterests] = useState<string[]>([]);
  const [searchDuration, setSearchDuration] = useState<number>(0);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSkipRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (autoSkipRef.current) clearInterval(autoSkipRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (connectionState === 'connected') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [connectionState]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (connectionState === 'connected' && autoSkipEnabled) {
      setAutoSkipTimer(autoSkipSeconds);
      autoSkipRef.current = setInterval(() => {
        setAutoSkipTimer((prev) => {
          if (prev <= 1) {
            handleSkip();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (autoSkipRef.current) clearInterval(autoSkipRef.current);
    };
  }, [connectionState, autoSkipEnabled, autoSkipSeconds]);

  useEffect(() => {
    if (connectionState === 'connected') {
      statsRef.current = setInterval(() => {
        setConnectionStats((prev) => ({
          ...prev,
          latency: Math.max(10, prev.latency + Math.floor(Math.random() * 20) - 10),
          packetLoss: Math.max(0, Math.min(5, prev.packetLoss + (Math.random() - 0.5) * 0.5)),
        }));
      }, 2000);
    }
    return () => {
      if (statsRef.current) clearInterval(statsRef.current);
    };
  }, [connectionState]);

  const startSearch = useCallback(() => {
    setConnectionState('searching');
    setMatchedUser(null);
    setMessages([]);
    setMatchedInterests([]);
    setSearchDuration(0);

    searchTimerRef.current = setInterval(() => {
      setSearchDuration((prev) => prev + 1);
    }, 1000);

    // Simulate finding a match
    const searchTime = 2000 + Math.random() * 3000;
    setTimeout(() => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      setConnectionState('connecting');

      setTimeout(() => {
        const userInterests = ['Music', 'Gaming', 'Travel', 'Tech', 'Sports'];
        const matched = interests.filter((i) => userInterests.includes(i));
        setMatchedInterests(matched.length > 0 ? matched : []);
        setMatchedUser({
          id: `user-${Date.now()}`,
          username: `User${globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 9999}`,
          avatarUrl: `https://cdn.quantmax.app/avatars/random${Math.floor(Math.random() * 50)}.jpg`,
          interests: userInterests,
          country: ['US', 'UK', 'DE', 'FR', 'JP', 'BR', 'IN'][Math.floor(Math.random() * 7)],
        });
        setConnectionState('connected');
        setSessionCount((prev) => prev + 1);
      }, 1000);
    }, searchTime);
  }, [interests]);

  const handleSkip = useCallback(() => {
    setConnectionState('idle');
    setMatchedUser(null);
    setMessages([]);
    setAutoSkipTimer(0);
    if (autoSkipRef.current) clearInterval(autoSkipRef.current);
    // Immediately start searching again
    setTimeout(() => startSearch(), 500);
  }, [startSearch]);

  const handleDisconnect = useCallback(() => {
    setConnectionState('idle');
    setMatchedUser(null);
    setMessages([]);
    setAutoSkipTimer(0);
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (autoSkipRef.current) clearInterval(autoSkipRef.current);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || connectionState !== 'connected') return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      text: messageInput,
      timestamp: Date.now(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessageInput('');

    // Simulate reply
    setTimeout(
      () => {
        const reply: ChatMessage = {
          id: `msg-reply-${Date.now()}`,
          senderId: matchedUser?.id || 'other',
          text: ['Hey!', 'Nice to meet you!', 'Cool, what are you into?', 'Thats awesome!', 'haha'][
            Math.floor(Math.random() * 5)
          ],
          timestamp: Date.now(),
          isOwn: false,
        };
        setMessages((prev) => [...prev, reply]);
      },
      1500 + Math.random() * 2000,
    );
  }, [messageInput, connectionState, matchedUser]);

  const handleAddInterest = useCallback(
    (interest: string) => {
      const trimmed = interest.trim();
      if (trimmed && !interests.includes(trimmed) && interests.length < 10) {
        setInterests((prev) => [...prev, trimmed]);
        setInterestInput('');
      }
    },
    [interests],
  );

  const handleRemoveInterest = useCallback((interest: string) => {
    setInterests((prev) => prev.filter((i) => i !== interest));
  }, []);

  const handleReport = useCallback(() => {
    if (!reportReason.trim()) return;
    setShowReportModal(false);
    setReportReason('');
    handleSkip();
  }, [reportReason, handleSkip]);

  const getQualityBars = useMemo(() => {
    switch (connectionStats.quality) {
      case 'excellent':
        return 4;
      case 'good':
        return 3;
      case 'fair':
        return 2;
      case 'poor':
        return 1;
      default:
        return 0;
    }
  }, [connectionStats.quality]);

  const qualityColor = useMemo(() => {
    switch (connectionStats.quality) {
      case 'excellent':
        return '#00ff00';
      case 'good':
        return '#88ff00';
      case 'fair':
        return '#ffaa00';
      case 'poor':
        return '#ff0000';
      default:
        return '#888888';
    }
  }, [connectionStats.quality]);

  // Idle state - interest selection and start
  if (connectionState === 'idle') {
    return (
      <div className="min-h-screen bg-[var(--quant-background)] text-[var(--quant-foreground)]">
        <div className="max-w-md mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', ...spring.gentle }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold mb-2">Video Chat</h1>
            <p className="text-sm text-[var(--quant-muted-foreground)]">
              Meet new people with shared interests
            </p>
          </motion.div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--quant-muted-foreground)] mb-3">
              Your Interests
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 h-11 px-4 rounded-lg bg-[var(--quant-card)] border border-[var(--quant-border)] text-sm text-[var(--quant-foreground)] placeholder-[var(--quant-muted-foreground)] focus:outline-none focus:border-[var(--brand-primary)]"
                placeholder="Add an interest..."
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddInterest(interestInput)}
              />
              <button
                className="h-11 w-11 rounded-lg bg-[var(--brand-primary)] text-white font-bold flex items-center justify-center"
                onClick={() => handleAddInterest(interestInput)}
              >
                +
              </button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-sm font-medium border border-[var(--brand-primary)]/30"
                  >
                    {interest}
                    <button
                      className="ml-0.5 text-xs hover:opacity-70"
                      onClick={() => handleRemoveInterest(interest)}
                    >
                      &#10005;
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-[var(--quant-muted-foreground)] mb-2">
                Suggested
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_INTERESTS.filter((s) => !interests.includes(s))
                  .slice(0, 12)
                  .map((suggestion) => (
                    <button
                      key={suggestion}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--quant-card)] border border-[var(--quant-border)] text-[var(--quant-muted-foreground)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                      onClick={() => handleAddInterest(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 text-sm text-[var(--quant-muted-foreground)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSkipEnabled}
                onChange={(e) => setAutoSkipEnabled(e.target.checked)}
                className="rounded border-[var(--quant-border)]"
              />
              Auto-skip after
            </label>
            <input
              type="number"
              className="w-14 h-8 px-2 rounded bg-[var(--quant-card)] border border-[var(--quant-border)] text-center text-[var(--quant-foreground)] text-sm"
              value={autoSkipSeconds}
              onChange={(e) => setAutoSkipSeconds(Number(e.target.value))}
              min={10}
              max={120}
            />
            <span>seconds</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 min-h-[44px] rounded-xl bg-[var(--brand-primary)] text-white font-semibold text-base hover:opacity-90 transition-opacity"
            onClick={startSearch}
          >
            Start Matching
          </motion.button>

          {sessionCount > 0 && (
            <p className="text-center text-xs text-[var(--quant-muted-foreground)] mt-4">
              Sessions today: {sessionCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Searching state
  if (connectionState === 'searching') {
    return (
      <div className="min-h-screen bg-[var(--quant-background)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', ...spring.gentle }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative w-24 h-24">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[var(--brand-primary)] opacity-30"
              animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-[var(--brand-primary)] opacity-30"
              animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.div
              className="absolute inset-4 rounded-full border-2 border-[var(--brand-primary)] opacity-30"
              animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
              &#128269;
            </div>
          </div>
          <h2 className="text-xl font-bold text-[var(--quant-foreground)]">Finding someone...</h2>
          <p className="text-sm text-[var(--quant-muted-foreground)]">
            Searching for {searchDuration}s
          </p>
          {interests.length > 0 && (
            <p className="text-xs text-[var(--quant-muted-foreground)]">
              Looking for: {interests.join(', ')}
            </p>
          )}
          <button
            className="mt-4 px-6 py-2 min-h-[44px] text-sm font-medium border border-[var(--quant-border)] rounded-lg text-[var(--quant-foreground)] hover:bg-[var(--quant-card)] transition-colors"
            onClick={handleDisconnect}
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

  // Connecting state
  if (connectionState === 'connecting') {
    return (
      <div className="min-h-screen bg-[var(--quant-background)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', ...spring.gentle }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative w-32 h-24 rounded-xl bg-[var(--quant-muted)] overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--quant-card)] to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <h2 className="text-lg font-semibold text-[var(--quant-foreground)]">Connecting...</h2>
          <p className="text-sm text-[var(--quant-muted-foreground)]">
            Establishing secure connection
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (connectionState === 'error') {
    return (
      <div className="min-h-screen bg-[var(--quant-background)] flex items-center justify-center">
        <ErrorState message="Connection failed. Please try again." onRetry={startSearch} />
      </div>
    );
  }

  // Connected state
  return (
    <div className="videochat-page connected">
      {/* Main Video Area */}
      <div className="video-streams">
        {/* Remote Video (Main) */}
        <div className="remote-stream">
          <div className="remote-video-placeholder">
            {matchedUser && (
              <div className="remote-user-info">
                <span className="remote-username">{matchedUser.username}</span>
                <span className="remote-country">{matchedUser.country}</span>
              </div>
            )}
          </div>
        </div>

        {/* Self Video (PiP) */}
        <div className="self-stream-pip">
          <div className="self-video-placeholder">
            {!isCameraOn && <span className="camera-off-label">Camera Off</span>}
          </div>
        </div>

        {/* Connection Quality Indicator */}
        <div className="connection-quality" title={`Latency: ${connectionStats.latency}ms`}>
          <span className="call-timer" aria-label="Call duration">
            {Math.floor(callDuration / 60)
              .toString()
              .padStart(2, '0')}
            :{(callDuration % 60).toString().padStart(2, '0')}
          </span>
          <div className="quality-bars">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className={`quality-bar ${bar <= getQualityBars ? 'active' : ''}`}
                style={{ backgroundColor: bar <= getQualityBars ? qualityColor : '#444' }}
              />
            ))}
          </div>
          <span className="quality-label">{connectionStats.latency}ms</span>
        </div>

        {/* Matched Interests */}
        {matchedInterests.length > 0 && (
          <div className="matched-interests-banner">
            <span className="match-label">Common interests:</span>
            {matchedInterests.map((interest) => (
              <span key={interest} className="matched-interest-tag">
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Auto-skip timer */}
        {autoSkipEnabled && autoSkipTimer > 0 && (
          <div className="auto-skip-indicator">
            <span className="skip-timer">Auto-skip in {autoSkipTimer}s</span>
            <button
              className="cancel-auto-skip"
              onClick={() => {
                setAutoSkipEnabled(false);
                if (autoSkipRef.current) clearInterval(autoSkipRef.current);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Text Chat Sidebar */}
      {showChat && (
        <div className="chat-sidebar">
          <div className="chat-header">
            <h4 className="chat-title">Chat</h4>
            <button className="minimize-chat" onClick={() => setShowChat(false)}>
              &#8722;
            </button>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">Say hi to start the conversation!</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.isOwn ? 'own' : 'other'}`}>
                <span className="message-text">{msg.text}</span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              className="chat-text-input"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="send-msg-btn" onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      )}

      {!showChat && (
        <button className="show-chat-btn" onClick={() => setShowChat(true)}>
          Chat {messages.length > 0 && `(${messages.length})`}
        </button>
      )}

      {/* Control Bar */}
      <div className="videochat-controls">
        <button
          className={`control-btn ${!isCameraOn ? 'off' : ''}`}
          onClick={() => setIsCameraOn(!isCameraOn)}
        >
          <span className="control-icon">{isCameraOn ? '📷' : '📷'}</span>
          <span className="control-label">{isCameraOn ? 'Cam On' : 'Cam Off'}</span>
        </button>
        <button
          className={`control-btn ${!isMicOn ? 'off' : ''}`}
          onClick={() => setIsMicOn(!isMicOn)}
        >
          <span className="control-icon">{isMicOn ? '🎤' : '🔇'}</span>
          <span className="control-label">{isMicOn ? 'Mic On' : 'Mic Off'}</span>
        </button>
        <button className="control-btn skip-btn" onClick={handleSkip}>
          <span className="control-icon">⏭️</span>
          <span className="control-label">Next</span>
        </button>
        <button className="control-btn report-btn" onClick={() => setShowReportModal(true)}>
          <span className="control-icon">⚠️</span>
          <span className="control-label">Report</span>
        </button>
        <button className="control-btn end-btn" onClick={handleDisconnect}>
          <span className="control-icon">📞</span>
          <span className="control-label">End</span>
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="report-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="report-title">Report User</h3>
            <div className="report-reasons">
              {['Inappropriate content', 'Harassment', 'Spam', 'Underage user', 'Other'].map(
                (reason) => (
                  <button
                    key={reason}
                    className={`report-reason-btn ${reportReason === reason ? 'selected' : ''}`}
                    onClick={() => setReportReason(reason)}
                  >
                    {reason}
                  </button>
                ),
              )}
            </div>
            <div className="report-actions">
              <button className="cancel-report" onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
              <button className="submit-report" onClick={handleReport} disabled={!reportReason}>
                Report & Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChatPage;
