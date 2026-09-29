const assert = require('node:assert/strict');
const test = require('node:test');
const { classifyNativeGoogleSignInError } = require('../.test-build/google-sign-in.js');

test('native Google cancellation remains non-fatal', () => {
  assert.deepEqual(classifyNativeGoogleSignInError({ code: 'SIGN_IN_CANCELLED' }), {
    kind: 'cancelled', diagnosticCode: 'GOOGLE_SIGN_IN_CANCELLED', notice: null,
  });
});

test('native Google configuration errors have a stable, safe diagnostic', () => {
  const result = classifyNativeGoogleSignInError({ code: 'NOT_CONFIGURED', message: 'do not show this' });
  assert.equal(result.kind, 'configuration');
  assert.equal(result.diagnosticCode, 'GOOGLE_SIGN_IN_CONFIGURATION');
  assert.doesNotMatch(result.notice, /do not show this/);
});

test('native provider and activity failures are distinguishable without provider details', () => {
  assert.equal(classifyNativeGoogleSignInError({ code: 'GOOGLE_SIGN_IN_ERROR' }).diagnosticCode, 'GOOGLE_SIGN_IN_PROVIDER');
  assert.equal(classifyNativeGoogleSignInError({ code: 'E_ACTIVITY_UNAVAILABLE' }).diagnosticCode, 'GOOGLE_SIGN_IN_UNAVAILABLE');
});

test('unknown failures remain safe and actionable', () => {
  const result = classifyNativeGoogleSignInError(new Error('private provider detail'));
  assert.equal(result.diagnosticCode, 'GOOGLE_SIGN_IN_UNKNOWN');
  assert.doesNotMatch(result.notice, /private provider detail/);
});
