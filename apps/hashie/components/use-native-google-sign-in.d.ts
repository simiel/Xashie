export declare function useNativeGoogleSignIn(): {
  startNativeGoogleSignIn: () => Promise<{
    createdSessionId: string | null;
    setActive?: (params: { session: string }) => Promise<unknown>;
  }>;
};
