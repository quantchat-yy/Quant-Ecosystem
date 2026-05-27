// ============================================================================
// Shared UI - Loading State Component
// ============================================================================

import React from 'react';

export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'dots';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  text,
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className="flex flex-col items-center justify-center p-8"
      role="status"
      aria-label={text || 'Loading'}
    >
      {variant === 'spinner' && (
        <svg
          className={`${sizeMap[size]} animate-spin text-blue-600`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {variant === 'skeleton' && (
        <div className="w-full max-w-sm space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
      )}
      {variant === 'dots' && (
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      )}
      {text && <p className="mt-3 text-sm text-gray-500">{text}</p>}
    </div>
  );
};
