// lib/auth/index.ts
import { AuthProvider } from './types';
import { ClerkAuthProvider } from './providers/clerk';

let authProvider: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (!authProvider) {
    // Easy to swap: just change this line
    authProvider = new ClerkAuthProvider();
  }
  return authProvider;
}

// Convenience functions
export async function getCurrentUser() {
  return getAuthProvider().getCurrentUser();
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requireRole(...roles: string[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}