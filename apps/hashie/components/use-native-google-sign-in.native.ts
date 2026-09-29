import { useSignInWithGoogle } from '@clerk/expo/google';

/** Native Clerk Google sign-in for Android and iOS development/release builds. */
export function useNativeGoogleSignIn() {
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  return { startNativeGoogleSignIn: startGoogleAuthenticationFlow };
}
