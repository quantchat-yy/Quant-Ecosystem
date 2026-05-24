// ============================================================================
// QuantNeon - Story Viewer Page
// Progress bars, tap navigation, interactive elements, reactions
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryItem {
  id: string;
  type: 'image' | 'video';
  mediaUrl: string;
  duration: number;
  timestamp: string;
  viewCount: number;
  interactive?: StoryInteractive;
}

interface StoryInteractive {
  type: 'poll' | 'question' | 'quiz' | 'slider' | 'countdown';
  data: PollData | QuestionData | QuizData;
}

interface PollData {
  question: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  userVote: 'A' | 'B' | null;
}

interface QuestionData {
  question: string;
  answers: string[];
}

interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  userAnswer: number | null;
}

interface StoryUser {
  id: string;
  username: string;
  avatarUrl: string;
  isVerified: boolean;
  stories: StoryItem[];
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const generateStoryUsers = (): StoryUser[] => {
  const users = [
    { id: 'su1', username: 'travel_vibes', avatarUrl: 'https://picsum.photos/seed/su1/80/80', isVerified: true },
    { id: 'su2', username: 'food_diary', avatarUrl: 'https://picsum.photos/seed/su2/80/80', isVerified: false },
    { id: 'su3', username: 'fitness_daily', avatarUrl: 'https://picsum.photos/seed/su3/80/80', isVerified: true },
    { id: 'su4', username: 'art_studio', avatarUrl: 'https://picsum.photos/seed/su4/80/80', isVerified: false },
    { id: 'su5', username: 'tech_news', avatarUrl: 'https://picsum.photos/seed/su5/80/80', isVerified: true },
  ];

  return users.map((user, ui) => ({
    ...user,
    stories: Array.from({ length: Math.floor(Math.random() * 4) + 2 }, (_, si) => {
      const hasInteractive = si === 1 && ui < 3;
      let interactive: StoryInteractive | undefined;

      if (hasInteractive) {
        if (ui === 0) {
          interactive = {
            type: 'poll',
            data: {
              question: 'Which destination next?',
              optionA: 'Bali',
              optionB: 'Tokyo',
              votesA: 1247,
              votesB: 893,
              userVote: null,
            } as PollData,
          };
        } else if (ui === 1) {
          interactive = {
            type: 'question',
            data: {
              question: 'What should I cook next?',
              answers: [],
            } as QuestionData,
          };
        } else {
          interactive = {
            type: 'quiz',
            data: {
              question: 'How many calories in an avocado?',
              options: ['160', '240', '320', '80'],
              correctIndex: 1,
              userAnswer: null,
            } as QuizData,
          };
        }
      }

      return {
        id: `story-${ui}-${si}`,
        type: si % 3 === 0 ? 'video' as const : 'image' as const,
        mediaUrl: `https://picsum.photos/seed/story${ui}${si}/400/700`,
        duration: si % 3 === 0 ? 15 : 5,
        timestamp: `${Math.floor(Math.random() * 12) + 1}h ago`,
        viewCount: Math.floor(Math.random() * 5000) + 100,
        interactive,
      };
    }),
  }));
};

const QUICK_REACTIONS = ['❤️', '🔥', '👏', '😂', '😮', '😢'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StoriesPage: React.FC = () => {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState<number>(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplyInput, setShowReplyInput] = useState<boolean>(false);
  const [pollVote, setPollVote] = useState<'A' | 'B' | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState<string>('');

  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load stories
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 400));
        setStoryUsers(generateStoryUsers());
      } catch (err) {
        setError('Failed to load stories.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Progress timer
  useEffect(() => {
    if (loading || storyUsers.length === 0 || paused) return;

    const currentUser = storyUsers[currentUserIndex];
    if (!currentUser) return;
    const currentStory = currentUser.stories[currentStoryIndex];
    if (!currentStory) return;

    const duration = currentStory.duration * 1000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentUserIndex, currentStoryIndex, paused, loading, storyUsers.length]);

  // Navigation
  const handleNextStory = useCallback(() => {
    setStoryUsers(users => {
      if (users.length === 0) return users;
      const currentUser = users[currentUserIndex];
      if (!currentUser) return users;

      if (currentStoryIndex < currentUser.stories.length - 1) {
        setCurrentStoryIndex(prev => prev + 1);
      } else if (currentUserIndex < users.length - 1) {
        setCurrentUserIndex(prev => prev + 1);
        setCurrentStoryIndex(0);
      }
      setProgress(0);
      setPollVote(null);
      setQuizAnswer(null);
      setQuestionAnswer('');
      return users;
    });
  }, [currentUserIndex, currentStoryIndex]);

  const handlePrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(prev => prev - 1);
      const prevUser = storyUsers[currentUserIndex - 1];
      if (prevUser) {
        setCurrentStoryIndex(prevUser.stories.length - 1);
      }
    }
    setProgress(0);
    setPollVote(null);
    setQuizAnswer(null);
    setQuestionAnswer('');
  }, [currentStoryIndex, currentUserIndex, storyUsers]);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      handlePrevStory();
    } else if (x > (width * 2) / 3) {
      handleNextStory();
    }
  }, [handlePrevStory, handleNextStory]);

  // Pause on long press
  const handlePauseStart = useCallback(() => {
    pauseTimeoutRef.current = setTimeout(() => {
      setPaused(true);
    }, 200);
  }, []);

  const handlePauseEnd = useCallback(() => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    setPaused(false);
  }, []);

  // Reply
  const handleSendReply = useCallback(() => {
    if (!replyText.trim()) return;
    setReplyText('');
    setShowReplyInput(false);
  }, [replyText]);

  const handleSendReaction = useCallback((emoji: string) => {
    // Send reaction
  }, []);

  // Poll vote
  const handlePollVote = useCallback((option: 'A' | 'B') => {
    setPollVote(option);
  }, []);

  // Quiz answer
  const handleQuizAnswer = useCallback((index: number) => {
    setQuizAnswer(index);
  }, []);

  const handleClose = useCallback(() => {
    // Navigate back
    if (typeof window !== 'undefined') window.history.back();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading stories...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <p className="text-white text-center">{error}</p>
          <button
            onClick={() => { setError(null); setStoryUsers(generateStoryUsers()); setLoading(false); }}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (storyUsers.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-4xl">📸</span>
          </div>
          <h2 className="text-white text-xl font-semibold">No Stories</h2>
          <p className="text-gray-400 text-center">Stories from people you follow will appear here.</p>
        </div>
      </div>
    );
  }

  const currentUser = storyUsers[currentUserIndex];
  if (!currentUser) return null;
  const currentStory = currentUser.stories[currentStoryIndex];
  if (!currentStory) return null;

  return (
    <div className="relative h-screen bg-black overflow-hidden select-none">
      {/* Progress Bars */}
      <div className="absolute top-2 left-2 right-2 z-30 flex gap-1">
        {currentUser.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{
                width: i < currentStoryIndex ? '100%' : i === currentStoryIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50">
            <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white text-sm font-semibold">{currentUser.username}</span>
            {currentUser.isVerified && (
              <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
          </div>
          <span className="text-gray-400 text-xs">{currentStory.timestamp}</span>
        </div>
        <div className="flex items-center gap-3">
          {paused && <span className="text-white text-xs bg-white/20 px-2 py-0.5 rounded">Paused</span>}
          <button onClick={handleClose} className="text-white hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div
        className="w-full h-full"
        onClick={handleTap}
        onMouseDown={handlePauseStart}
        onMouseUp={handlePauseEnd}
        onMouseLeave={handlePauseEnd}
        onTouchStart={handlePauseStart}
        onTouchEnd={handlePauseEnd}
      >
        <img
          src={currentStory.mediaUrl}
          alt="Story"
          className="w-full h-full object-cover"
        />

        {/* Interactive Elements */}
        {currentStory.interactive && (
          <div className="absolute inset-x-6 top-1/3 z-20">
            {/* Poll */}
            {currentStory.interactive.type === 'poll' && (() => {
              const poll = currentStory.interactive!.data as PollData;
              const totalVotes = poll.votesA + poll.votesB;
              const percentA = totalVotes > 0 ? Math.round((poll.votesA / totalVotes) * 100) : 50;
              const percentB = 100 - percentA;
              return (
                <div className="bg-white/95 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-black font-bold text-center mb-3">{poll.question}</p>
                  <div className="space-y-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePollVote('A'); }}
                      className={`relative w-full py-3 px-4 rounded-xl text-left font-semibold overflow-hidden transition-all ${
                        pollVote === 'A' ? 'bg-blue-500 text-white' : pollVote ? 'bg-gray-200 text-black' : 'bg-gray-100 text-black hover:bg-gray-200'
                      }`}
                    >
                      {pollVote && (
                        <div className="absolute inset-y-0 left-0 bg-blue-200/50 transition-all" style={{ width: `${percentA}%` }} />
                      )}
                      <span className="relative z-10">{poll.optionA}</span>
                      {pollVote && <span className="relative z-10 float-right">{percentA}%</span>}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePollVote('B'); }}
                      className={`relative w-full py-3 px-4 rounded-xl text-left font-semibold overflow-hidden transition-all ${
                        pollVote === 'B' ? 'bg-blue-500 text-white' : pollVote ? 'bg-gray-200 text-black' : 'bg-gray-100 text-black hover:bg-gray-200'
                      }`}
                    >
                      {pollVote && (
                        <div className="absolute inset-y-0 left-0 bg-blue-200/50 transition-all" style={{ width: `${percentB}%` }} />
                      )}
                      <span className="relative z-10">{poll.optionB}</span>
                      {pollVote && <span className="relative z-10 float-right">{percentB}%</span>}
                    </button>
                  </div>
                  {pollVote && <p className="text-center text-gray-500 text-xs mt-2">{totalVotes.toLocaleString()} votes</p>}
                </div>
              );
            })()}

            {/* Question */}
            {currentStory.interactive.type === 'question' && (() => {
              const q = currentStory.interactive!.data as QuestionData;
              return (
                <div className="bg-white/95 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-black font-bold text-center mb-3">{q.question}</p>
                  <input
                    type="text"
                    value={questionAnswer}
                    onChange={(e) => { e.stopPropagation(); setQuestionAnswer(e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Type your answer..."
                    className="w-full py-2 px-4 bg-gray-100 rounded-full text-black text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              );
            })()}

            {/* Quiz */}
            {currentStory.interactive.type === 'quiz' && (() => {
              const quiz = currentStory.interactive!.data as QuizData;
              return (
                <div className="bg-white/95 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-black font-bold text-center mb-3">{quiz.question}</p>
                  <div className="space-y-2">
                    {quiz.options.map((option, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); handleQuizAnswer(i); }}
                        className={`w-full py-2.5 px-4 rounded-xl text-left font-medium transition-all ${
                          quizAnswer === null
                            ? 'bg-gray-100 text-black hover:bg-gray-200'
                            : i === quiz.correctIndex
                              ? 'bg-green-500 text-white'
                              : quizAnswer === i
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-500'
                        }`}
                        disabled={quizAnswer !== null}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Swipe to next user indicator */}
      {currentUserIndex < storyUsers.length - 1 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 opacity-30">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {/* Bottom - Reply & Reactions */}
      <div className="absolute bottom-4 left-3 right-3 z-30">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onFocus={() => { setPaused(true); setShowReplyInput(true); }}
            onBlur={() => { setPaused(false); setShowReplyInput(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
            placeholder={`Reply to ${currentUser.username}...`}
            className="flex-1 py-2.5 px-4 bg-transparent border border-white/40 rounded-full text-white text-sm placeholder-white/60 outline-none focus:border-white"
          />
          {replyText.trim() ? (
            <button onClick={handleSendReply} className="text-white font-semibold text-sm">Send</button>
          ) : (
            <div className="flex gap-2">
              {QUICK_REACTIONS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => handleSendReaction(emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View count (for own stories) */}
      <div className="absolute bottom-16 left-4 z-20">
        <div className="flex items-center gap-1 text-white/70 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{currentStory.viewCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default StoriesPage;
