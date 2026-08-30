import type { SessionType } from './types';

export type AuthRouteState = {
  isReady: boolean;
  sessionType: SessionType;
  onboardingComplete: boolean;
  sessionExpired: boolean;
};

export function resolveInitialRoute(state: AuthRouteState) {
  if (!state.isReady) return null;
  if (state.sessionExpired) return '/session-expired';
  if (!state.sessionType) return '/welcome';
  return state.onboardingComplete ? '/home' : '/language';
}
