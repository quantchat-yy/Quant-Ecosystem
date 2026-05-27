// ============================================================================
// Shared UI - Route Guard Component
// ============================================================================

import React from 'react';

export interface RouteGuardProps {
  userRole: string;
  requiredRoles: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  userRole,
  requiredRoles,
  fallback,
  children,
}) => {
  const hasAccess = requiredRoles.includes(userRole);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-8"
        role="alert"
        aria-label="Access denied"
      >
        <svg
          className="w-16 h-16 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};
