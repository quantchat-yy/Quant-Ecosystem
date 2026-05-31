'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import type { VideoTileProps } from '../types/components';

export function VideoTile({
  participantId,
  stream,
  displayName,
  audioEnabled,
  videoEnabled,
  isSpeaking,
  isPinned,
  isScreenShare,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden bg-gray-900 aspect-video ${
        isSpeaking ? 'ring-2 ring-green-400' : ''
      }`}
      data-participant-id={participantId}
      role="group"
      aria-label={`${displayName}${isScreenShare ? ' screen share' : ''}`}
      animate={{ scale: isSpeaking ? 1.02 : 1 }}
      transition={{ type: 'spring', ...spring.snappy }}
    >
      {videoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : videoEnabled ? (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <span className="text-gray-500 text-xs">Video</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-xl text-gray-200 font-medium">{initials}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm truncate">{displayName}</span>
          {!audioEnabled && (
            <span className="text-red-400 text-xs" aria-label="Microphone muted">
              &#x1F507;
            </span>
          )}
          {!videoEnabled && (
            <span className="text-red-400 text-xs" aria-label="Camera off">
              &#x1F4F7;
            </span>
          )}
          {isScreenShare && (
            <span className="text-blue-400 text-xs" aria-label="Screen sharing">
              &#x1F4BB;
            </span>
          )}
        </div>
      </div>

      {isPinned && (
        <div className="absolute top-2 right-2">
          <span className="text-yellow-400 text-sm" aria-label="Pinned">
            &#x1F4CC;
          </span>
        </div>
      )}
    </motion.div>
  );
}
