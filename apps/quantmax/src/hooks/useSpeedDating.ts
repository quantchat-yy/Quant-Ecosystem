// ============================================================================
// QuantMax - useSpeedDating Hook
// Speed dating state: sessions, timer, matching, ratings
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeedDateSession {
  id: string;
  status: 'waiting' | 'matched' | 'active' | 'rating' | 'completed';
  partnerId: string | null;
  partnerName: string | null;
  partnerAvatar: string | null;
  timeRemaining: number;
  extensions: number;
  maxExtensions: number;
  startedAt: number | null;
}

interface DateRating {
  partnerId: string;
  rating: 'like' | 'pass';
  timestamp: number;
}

interface SpeedDateMatch {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  matchedAt: number;
  mutual: boolean;
}

interface UseSpeedDatingReturn {
  session: SpeedDateSession;
  matches: SpeedDateMatch[];
  ratings: DateRating[];
  isInQueue: boolean;
  isConnected: boolean;
  joinQueue: () => void;
  leaveQueue: () => void;
  extendTime: () => boolean;
  endDate: () => void;
  ratePartner: (rating: 'like' | 'pass') => void;
  addContact: () => void;
}

export function useSpeedDating(userId: string): UseSpeedDatingReturn {
  const [session, setSession] = useState<SpeedDateSession>({
    id: '',
    status: 'waiting',
    partnerId: null,
    partnerName: null,
    partnerAvatar: null,
    timeRemaining: 180,
    extensions: 0,
    maxExtensions: 2,
    startedAt: null,
  });
  const [matches, setMatches] = useState<SpeedDateMatch[]>([]);
  const [ratings, setRatings] = useState<DateRating[]>([]);
  const [isInQueue, setIsInQueue] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (matchRef.current) clearTimeout(matchRef.current);
    };
  }, []);

  const joinQueue = useCallback(() => {
    setIsInQueue(true);
    setSession((prev) => ({ ...prev, status: 'waiting', id: `session-${Date.now()}` }));
    matchRef.current = setTimeout(
      () => {
        const partnerId = `user-${Math.floor(Math.random() * 10000)}`;
        const partnerName = `User${Math.floor(Math.random() * 1000)}`;
        setSession((prev) => ({
          ...prev,
          status: 'active',
          partnerId,
          partnerName,
          partnerAvatar: `/avatars/${partnerId}.jpg`,
          timeRemaining: 180,
          startedAt: Date.now(),
          extensions: 0,
        }));
        setIsInQueue(false);
        timerRef.current = setInterval(() => {
          setSession((prev) => {
            if (prev.timeRemaining <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return { ...prev, timeRemaining: 0, status: 'rating' };
            }
            return { ...prev, timeRemaining: prev.timeRemaining - 1 };
          });
        }, 1000);
      },
      Math.random() * 5000 + 2000,
    );
  }, []);

  const leaveQueue = useCallback(() => {
    setIsInQueue(false);
    if (matchRef.current) clearTimeout(matchRef.current);
    setSession((prev) => ({ ...prev, status: 'waiting' }));
  }, []);

  const extendTime = useCallback((): boolean => {
    if (session.extensions >= session.maxExtensions) return false;
    setSession((prev) => ({
      ...prev,
      timeRemaining: prev.timeRemaining + 60,
      extensions: prev.extensions + 1,
    }));
    return true;
  }, [session.extensions, session.maxExtensions]);

  const endDate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSession((prev) => ({ ...prev, status: 'rating' }));
  }, []);

  const ratePartner = useCallback(
    (rating: 'like' | 'pass') => {
      if (!session.partnerId) return;
      const newRating: DateRating = { partnerId: session.partnerId, rating, timestamp: Date.now() };
      setRatings((prev) => [...prev, newRating]);
      if (rating === 'like' && Math.random() > 0.5) {
        const match: SpeedDateMatch = {
          partnerId: session.partnerId,
          partnerName: session.partnerName || '',
          partnerAvatar: session.partnerAvatar || '',
          matchedAt: Date.now(),
          mutual: true,
        };
        setMatches((prev) => [...prev, match]);
      }
      setSession((prev) => ({
        ...prev,
        status: 'completed',
        partnerId: null,
        partnerName: null,
        partnerAvatar: null,
      }));
    },
    [session],
  );

  const addContact = useCallback(() => {
    // Contact add would be triggered here in production
  }, [session.partnerId]);

  return {
    session,
    matches,
    ratings,
    isInQueue,
    isConnected: session.status === 'active',
    joinQueue,
    leaveQueue,
    extendTime,
    endDate,
    ratePartner,
    addContact,
  };
}

export default useSpeedDating;
