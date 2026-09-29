/** Web must use Clerk's browser SSO flow, never the native Google module. */
export function useNativeGoogleSignIn() {
  return {
    startNativeGoogleSignIn: async () => {
      throw new Error('Native Google sign-in is unavailable on web. Use Clerk browser SSO instead.');
    },
  };
}
