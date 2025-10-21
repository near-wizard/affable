// components/auth/sign-in-button.tsx
'use client';

import { ClerkProvider, SignInButton as ClerkSignInButton } from '@clerk/nextjs';

export function SignInButton() {
  // Wrapper around Clerk component
  return (<ClerkProvider>
    <ClerkSignInButton mode="modal" />
  </ClerkProvider>);
}
