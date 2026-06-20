'use client';
// ============================================================================
// @quant/shared-ui - AlienAvatar
// ============================================================================
//
// The visual identity of QuantAI across the whole ecosystem: a small animated
// "alien" assistant that is rendered once per app (via EcosystemShell ->
// QuantSidekick) and reflects what the assistant is doing through motion
// states. Self-contained — it injects its own scoped keyframes and respects
// `prefers-reduced-motion`, so it has no animation-library dependency and is
// deterministic to test.
//
// Motion states (design: "alien avatar that visibly works"):
//   idle      — gentle float/bob, occasional blink (the resting state)
//   listening — antenna bulbs pulse (capturing voice/input)
//   thinking  — eyes scan + a soft glow halo (an AI/LLM call is in flight)
//   speaking  — mouth pulses (delivering a spoken/voice-note reply)
//   acting    — hands wave + body lean (performing an action in an app)

import React from 'react';

export type QuantSidekickStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'acting';

export interface AlienAvatarProps {
  /** Current motion state the alien reflects. */
  state?: QuantSidekickStatus;
  /** Rendered square size in px. */
  size?: number;
  /** Accessible label override; a state-aware default is used otherwise. */
  label?: string;
  className?: string;
}

const STATE_LABEL: Record<QuantSidekickStatus, string> = {
  idle: 'QuantAI assistant, idle',
  listening: 'QuantAI assistant, listening',
  thinking: 'QuantAI assistant, thinking',
  speaking: 'QuantAI assistant, speaking',
  acting: 'QuantAI assistant, working',
};

// Scoped keyframes + per-state animation wiring. Injected once (stable id); a
// duplicate <style> with identical content is harmless. All motion is disabled
// under `prefers-reduced-motion: reduce`.
const STYLE_ID = 'quant-alien-avatar-styles';
const ALIEN_CSS = `
@keyframes qsBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6%); } }
@keyframes qsBlink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@keyframes qsPulse { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.25); } }
@keyframes qsScanX { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-12%); } 75% { transform: translateX(12%); } }
@keyframes qsMouth { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1.15); } }
@keyframes qsWave { 0%,100% { transform: rotate(-12deg); } 50% { transform: rotate(18deg); } }
@keyframes qsHalo { 0%,100% { opacity: 0; transform: scale(0.9); } 50% { opacity: .5; transform: scale(1.12); } }
.qs-root .qs-body { transform-origin: 50% 60%; }
.qs-root .qs-eye { transform-box: fill-box; transform-origin: center; }
.qs-root .qs-mouth { transform-box: fill-box; transform-origin: center; }
.qs-root .qs-bulb { transform-box: fill-box; transform-origin: center; }
.qs-root .qs-hand { transform-box: fill-box; transform-origin: 50% 0%; }
.qs-root .qs-halo { opacity: 0; transform-box: fill-box; transform-origin: center; }
/* idle */
.qs-root[data-state="idle"] .qs-body { animation: qsBob 3.2s ease-in-out infinite; }
.qs-root[data-state="idle"] .qs-eye { animation: qsBlink 4.5s ease-in-out infinite; }
/* listening */
.qs-root[data-state="listening"] .qs-body { animation: qsBob 2.4s ease-in-out infinite; }
.qs-root[data-state="listening"] .qs-bulb { animation: qsPulse 0.9s ease-in-out infinite; }
/* thinking */
.qs-root[data-state="thinking"] .qs-eye { animation: qsScanX 1.6s ease-in-out infinite; }
.qs-root[data-state="thinking"] .qs-halo { animation: qsHalo 1.8s ease-in-out infinite; }
.qs-root[data-state="thinking"] .qs-bulb { animation: qsPulse 1.4s ease-in-out infinite; }
/* speaking */
.qs-root[data-state="speaking"] .qs-mouth { animation: qsMouth 0.36s ease-in-out infinite; }
.qs-root[data-state="speaking"] .qs-body { animation: qsBob 2.8s ease-in-out infinite; }
/* acting */
.qs-root[data-state="acting"] .qs-hand { animation: qsWave 0.5s ease-in-out infinite; }
.qs-root[data-state="acting"] .qs-body { animation: qsBob 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .qs-root * { animation: none !important; }
}
`;

/**
 * The animated QuantAI alien. Presentational only — state is driven by the
 * caller (e.g. {@link useQuantSidekick}). Renders an accessible `img` role with
 * a state-aware label and exposes `data-state` for styling/testing.
 */
export const AlienAvatar: React.FC<AlienAvatarProps> = ({
  state = 'idle',
  size = 56,
  label,
  className = '',
}) => {
  return (
    <span
      className={`qs-root inline-block ${className}`}
      data-state={state}
      data-testid="quant-alien-avatar"
      role="img"
      aria-label={label ?? STATE_LABEL[state]}
      style={{ width: size, height: size, lineHeight: 0 }}
    >
      <style id={STYLE_ID} dangerouslySetInnerHTML={{ __html: ALIEN_CSS }} />
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id="qsSkin" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#7df9d0" />
            <stop offset="100%" stopColor="#19c39a" />
          </radialGradient>
        </defs>
        {/* glow halo (thinking) */}
        <circle className="qs-halo" cx="32" cy="30" r="26" fill="#39e0c4" />
        <g className="qs-body">
          {/* antennae */}
          <line
            x1="24"
            y1="12"
            x2="20"
            y2="3"
            stroke="#19c39a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="40"
            y1="12"
            x2="44"
            y2="3"
            stroke="#19c39a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle className="qs-bulb" cx="20" cy="3" r="2.6" fill="#5ef2ff" />
          <circle className="qs-bulb" cx="44" cy="3" r="2.6" fill="#5ef2ff" />
          {/* head */}
          <path
            d="M32 10c12 0 20 9 20 21 0 13-9 23-20 23S12 44 12 31C12 19 20 10 32 10Z"
            fill="url(#qsSkin)"
          />
          {/* eyes */}
          <ellipse className="qs-eye" cx="24" cy="30" rx="5.2" ry="7" fill="#0b1020" />
          <ellipse className="qs-eye" cx="40" cy="30" rx="5.2" ry="7" fill="#0b1020" />
          <circle cx="22.4" cy="27.5" r="1.4" fill="#fff" />
          <circle cx="38.4" cy="27.5" r="1.4" fill="#fff" />
          {/* mouth */}
          <rect className="qs-mouth" x="28" y="42" width="8" height="4" rx="2" fill="#0b1020" />
          {/* waving hands (acting) */}
          <g className="qs-hand">
            <line
              x1="12"
              y1="40"
              x2="6"
              y2="36"
              stroke="#19c39a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
          <g className="qs-hand">
            <line
              x1="52"
              y1="40"
              x2="58"
              y2="36"
              stroke="#19c39a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>
    </span>
  );
};

AlienAvatar.displayName = 'AlienAvatar';
