export type NativeGoogleSignInIssue =
  | { kind: 'cancelled'; diagnosticCode: 'GOOGLE_SIGN_IN_CANCELLED'; notice: null }
  | { kind: 'configuration'; diagnosticCode: 'GOOGLE_SIGN_IN_CONFIGURATION'; notice: string }
  | { kind: 'provider'; diagnosticCode: 'GOOGLE_SIGN_IN_PROVIDER'; notice: string }
  | { kind: 'unavailable'; diagnosticCode: 'GOOGLE_SIGN_IN_UNAVAILABLE'; notice: string }
  | { kind: 'unknown'; diagnosticCode: 'GOOGLE_SIGN_IN_UNKNOWN'; notice: string };

type ErrorWithCode = { code: unknown };

function errorCode(error: unknown): string | null {
  if (error === null || typeof error !== 'object' || !('code' in error)) return null;
  const code = (error as ErrorWithCode).code;
  return typeof code === 'string' ? code : null;
}

/** Maps provider failures to safe, stable UI text without exposing raw provider details. */
export function classifyNativeGoogleSignInError(error: unknown): NativeGoogleSignInIssue {
  switch (errorCode(error)) {
    case 'SIGN_IN_CANCELLED':
      return { kind: 'cancelled', diagnosticCode: 'GOOGLE_SIGN_IN_CANCELLED', notice: null };
    case 'NOT_CONFIGURED':
      return {
        kind: 'configuration',
        diagnosticCode: 'GOOGLE_SIGN_IN_CONFIGURATION',
        notice: 'Google sign-in needs an app configuration update. Please update Hashie and try again.',
      };
    case 'GOOGLE_SIGN_IN_ERROR':
      return {
        kind: 'provider',
        diagnosticCode: 'GOOGLE_SIGN_IN_PROVIDER',
        notice: 'Google sign-in is unavailable right now. Please try again, or continue as a guest.',
      };
    case 'E_ACTIVITY_UNAVAILABLE':
      return {
        kind: 'unavailable',
        diagnosticCode: 'GOOGLE_SIGN_IN_UNAVAILABLE',
        notice: 'Google sign-in is unavailable right now. Restart Hashie and try again.',
      };
    default:
      return {
        kind: 'unknown',
        diagnosticCode: 'GOOGLE_SIGN_IN_UNKNOWN',
        notice: 'Google sign-in could not be completed. Please try again, or continue as a guest.',
      };
  }
}
