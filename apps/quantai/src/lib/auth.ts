// ============================================================================
// QuantAI - Centralized Auth Token Utilities
// Single source of truth for auth token access and header construction
// ============================================================================

/**
 * Reads the auth token from localStorage.
 * Returns null if no token is stored or localStorage is unavailable.
 */
export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Returns Authorization headers if a token exists, otherwise an empty object.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
