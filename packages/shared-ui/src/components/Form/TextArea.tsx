// ============================================================================
// Shared UI - TextArea Component
// ============================================================================

import React from 'react';

export interface TextAreaProps {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  resize = 'vertical',
  disabled = false,
  id,
  name,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const resizeStyles: Record<string, string> = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  };

  return (
    <div className="relative">
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${resizeStyles[resize]} ${className}`}
        aria-label={ariaLabel}
        aria-disabled={disabled}
      />
      {maxLength && (
        <span className="absolute bottom-2 right-2 text-xs text-gray-400">
          {(value || '').length}/{maxLength}
        </span>
      )}
    </div>
  );
};
