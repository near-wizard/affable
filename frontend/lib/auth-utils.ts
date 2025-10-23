/**
 * Authentication Utility Functions
 * Handles token storage, retrieval, and logout
 */

/**
 * Store authentication tokens and user info
 */
export function storeAuthCredentials(
  accessToken: string,
  refreshToken: string | undefined,
  userRole: 'partner' | 'vendor',
  userId?: string,
  userEmail?: string
): void {
  // Store in localStorage for API client
  localStorage.setItem('auth_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
  localStorage.setItem('user_role', userRole);
  if (userId) {
    localStorage.setItem('user_id', userId);
  }
  if (userEmail) {
    localStorage.setItem('user_email', userEmail);
  }

  // Store in cookies for middleware authentication
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  const cookieRole = userRole === 'partner' ? 'partner' : 'vendor_user';

  document.cookie = `auth_token=${accessToken}; path=/; expires=${expirationDate.toUTCString()}`;
  document.cookie = `user_role=${cookieRole}; path=/; expires=${expirationDate.toUTCString()}`;
}

/**
 * Clear all authentication data
 */
export function clearAuthCredentials(): void {
  // Clear localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_email');

  // Clear cookies
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
  document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
}

/**
 * Get current auth token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Get current user role
 */
export function getUserRole(): 'partner' | 'vendor' | null {
  if (typeof window === 'undefined') return null;
  const role = localStorage.getItem('user_role');
  return role === 'partner' || role === 'vendor' ? role : null;
}

/**
 * Get current user ID
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_id');
}

/**
 * Get current user email
 */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_email');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}
