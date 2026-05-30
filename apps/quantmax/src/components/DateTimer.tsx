// ============================================================================
// QuantMax - Date Timer Component
// Speed dating circular SVG countdown from 3:00, extend button (+1 min, max 2),
// visual pulse animation when under 30 seconds, end date button,
// time elapsed display, extension count indicator
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface DateTimerProps {
  initialSeconds?: number;
  maxExtensions?: number;
  extensionSeconds?: number;
  onTimeUp: () => void;
  onExtend: (extensionsUsed: number) => void;
  onEndDate: () => void;
  isActive: boolean;
}

export const DateTimer: React.FC<DateTimerProps> = ({
  initialSeconds = 180,
  maxExtensions = 2,
  extensionSeconds = 60,
  onTimeUp,
  onExtend,
  onEndDate,
  isActive,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(initialSeconds);
  const [totalTime, setTotalTime] = useState<number>(initialSeconds);
  const [extensionsUsed, setExtensionsUsed] = useState<number>(0);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [pulseOpacity, setPulseOpacity] = useState<number>(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = useMemo(() => {
    return totalTime > 0 ? timeRemaining / totalTime : 0;
  }, [timeRemaining, totalTime]);

  const circumference = useMemo(() => 2 * Math.PI * 70, []);

  const strokeDashoffset = useMemo(() => {
    return circumference * (1 - progress);
  }, [circumference, progress]);

  const isLowTime = useMemo(() => timeRemaining <= 30, [timeRemaining]);
  const isCriticalTime = useMemo(() => timeRemaining <= 10, [timeRemaining]);

  const strokeColor = useMemo(() => {
    if (isCriticalTime) return '#ff1744';
    if (isLowTime) return '#ff6d00';
    return '#4caf50';
  }, [isLowTime, isCriticalTime]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Main timer countdown
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else if (!isActive && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeRemaining, onTimeUp]);

  // Pulse animation for low time
  useEffect(() => {
    if (isLowTime && isActive) {
      setIsPulsing(true);
      pulseRef.current = setInterval(() => {
        setPulseOpacity((prev) => (prev === 1 ? 0.5 : 1));
      }, 500);
    } else {
      setIsPulsing(false);
      setPulseOpacity(1);
      if (pulseRef.current) clearInterval(pulseRef.current);
    }
    return () => {
      if (pulseRef.current) clearInterval(pulseRef.current);
    };
  }, [isLowTime, isActive]);

  const handleExtend = useCallback(() => {
    if (extensionsUsed >= maxExtensions) return;
    const newExtensions = extensionsUsed + 1;
    setExtensionsUsed(newExtensions);
    setTimeRemaining((prev) => prev + extensionSeconds);
    setTotalTime((prev) => prev + extensionSeconds);
    onExtend(newExtensions);
  }, [extensionsUsed, maxExtensions, extensionSeconds, onExtend]);

  const handleEndDate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(0);
    onEndDate();
  }, [onEndDate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
      }}
    >
      {/* Circular SVG Countdown */}
      <div
        style={{
          position: 'relative',
          width: '160px',
          height: '160px',
          opacity: pulseOpacity,
          transition: 'opacity 0.3s',
        }}
      >
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle cx="80" cy="80" r="70" fill="none" stroke="#2a2a2a" strokeWidth="8" />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
          {/* Pulse glow ring for low time */}
          {isPulsing && (
            <circle
              cx="80"
              cy="80"
              r="74"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              opacity={0.4}
            />
          )}
        </svg>

        {/* Time Display */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: strokeColor,
              fontFamily: 'monospace',
            }}
          >
            {formatTime(timeRemaining)}
          </div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>remaining</div>
        </div>
      </div>

      {/* Time Elapsed Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#666', fontSize: '13px' }}>Elapsed:</span>
        <span style={{ color: '#ccc', fontSize: '13px', fontFamily: 'monospace' }}>
          {formatTime(timeElapsed)}
        </span>
      </div>

      {/* Extension Count Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Array.from({ length: maxExtensions }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i < extensionsUsed ? '#ff2d55' : '#444',
              transition: 'background 0.3s',
            }}
          />
        ))}
        <span style={{ color: '#999', fontSize: '11px', marginLeft: '4px' }}>
          {extensionsUsed}/{maxExtensions} extensions used
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '300px' }}>
        <button
          onClick={handleExtend}
          disabled={extensionsUsed >= maxExtensions || !isActive}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: extensionsUsed >= maxExtensions ? '#333' : '#4caf50',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: extensionsUsed >= maxExtensions ? 'not-allowed' : 'pointer',
            opacity: extensionsUsed >= maxExtensions ? 0.5 : 1,
          }}
        >
          +1 min
        </button>
        <button
          onClick={handleEndDate}
          disabled={!isActive}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: '#ff4458',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          End Date
        </button>
      </div>
    </div>
  );
};

export default DateTimer;
