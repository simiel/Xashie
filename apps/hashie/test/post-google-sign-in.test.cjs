const assert = require('node:assert/strict');
const test = require('node:test');
const { postGoogleSignInAction, sessionActivationDiagnostic } = require('../.test-build/post-google-sign-in.js');

const signedInBase = {
  isClerkLoaded: true,
  isSignedIn: true,
  sessionStatus: 'signed-in',
  sessionRecovery: 'none',
  actorType: 'clerk-user',
  hasSavedPreferences: false,
  hasGuestUpgradeAvailable: false,
};

test('post-Google sign-in waits for the provider to publish the updated session', () => {
  assert.deepEqual(postGoogleSignInAction({ ...signedInBase, sessionStatus: 'signed-out', actorType: null }), { type: 'wait' });
});

test('post-Google sign-in routes only after a Clerk actor is active', () => {
  assert.deepEqual(postGoogleSignInAction(signedInBase), { type: 'route', destination: 'onboarding' });
  assert.deepEqual(postGoogleSignInAction({ ...signedInBase, hasSavedPreferences: true }), { type: 'route', destination: 'tabs' });
  assert.deepEqual(postGoogleSignInAction({ ...signedInBase, hasGuestUpgradeAvailable: true }), { type: 'route', destination: 'upgrade' });
});

test('post-Google sign-in exposes a session activation failure instead of treating it as a provider failure', () => {
  assert.deepEqual(postGoogleSignInAction({ ...signedInBase, sessionStatus: 'signed-out', sessionRecovery: 'clerk-expired', actorType: null }), { type: 'error' });
});

test('session activation diagnostics retain only safe fields', () => {
  assert.deepEqual(sessionActivationDiagnostic({ status: 401, code: 'invalid_credentials', requestId: 'req_safe', message: 'never log this' }), {
    stage: 'session_activation', status: 401, code: 'invalid_credentials', requestId: 'req_safe',
  });
});
