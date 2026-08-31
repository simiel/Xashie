import { ClerkProvider } from '@clerk/nextjs';
import { AdminPortal } from '../src/components/admin-portal';
import { ClerkAdminEntry } from '../src/components/clerk-admin-entry';

export default function Page() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) return <AdminPortal previewMode />;

  return <ClerkProvider publishableKey={publishableKey}><ClerkAdminEntry /></ClerkProvider>;
}
