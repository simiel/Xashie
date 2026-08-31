'use client';

import { SignedIn, SignedOut, SignIn } from '@clerk/nextjs';
import { AdminPortal } from './admin-portal';

export function ClerkAdminEntry() {
  return <>
    <SignedIn><AdminPortal previewMode={false} /></SignedIn>
    <SignedOut><div className="auth-entry"><div className="auth-copy"><span className="brand-mark">H</span><h1>Hashie admin</h1><p>Sign in with your Clerk account to access the private operations workspace.</p></div><SignIn routing="hash" /></div></SignedOut>
  </>;
}
