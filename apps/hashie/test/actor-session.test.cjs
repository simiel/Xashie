const assert = require('node:assert/strict');
const test = require('node:test');
const {
  canApplyActorScopedUpdate,
  preferencesToOnboardingState,
  reconcileStoredActor,
} = require('../.test-build/actor-session.js');

test('cold restart restores an explicitly selected guest even when Clerk is also available', () => {
  assert.deepEqual(reconcileStoredActor({ savedChoice: 'guest', guest: 'valid', clerk: 'valid' }), {
    status: 'guest', choice: 'guest', recovery: 'none',
  });
});

test('cold restart restores an explicitly selected signed-in account even when a guest token remains', () => {
  assert.deepEqual(reconcileStoredActor({ savedChoice: 'clerk-user', guest: 'valid', clerk: 'valid' }), {
    status: 'signed-in', choice: 'clerk-user', recovery: 'none',
  });
});

test('two valid unselected credentials require a user choice', () => {
  assert.deepEqual(reconcileStoredActor({ savedChoice: null, guest: 'valid', clerk: 'valid' }), {
    status: 'signed-out', choice: null, recovery: 'choose-actor',
  });
});

test('expired credentials return actor-appropriate recovery instead of selecting another actor', () => {
  assert.deepEqual(reconcileStoredActor({ savedChoice: 'guest', guest: 'expired', clerk: 'valid' }), {
    status: 'signed-out', choice: null, recovery: 'guest-expired',
  });
  assert.deepEqual(reconcileStoredActor({ savedChoice: 'clerk-user', guest: 'valid', clerk: 'expired' }), {
    status: 'signed-out', choice: null, recovery: 'clerk-expired',
  });
});

test('server preferences hydrate into editable onboarding state without substituting a different actor', () => {
  assert.deepEqual(preferencesToOnboardingState({
    language: 'akan-twi', nickname: 'Ama', ageGroup: '16-17', accessibilityPreferences: ['captions'],
  }, 'guest'), {
    accessChoice: 'guest', language: 'akan-twi', nickname: 'Ama', ageGroup: '16-17', accessibilityPreferences: ['captions'],
  });
});

test('a chat callback cannot update state after an actor switch', () => {
  assert.equal(canApplyActorScopedUpdate({
    requestActorKey: 'guest:one', currentActorKey: 'clerk-user:user_two', requestId: 4, currentRequestId: 4,
  }), false);
  assert.equal(canApplyActorScopedUpdate({
    requestActorKey: 'guest:one', currentActorKey: 'guest:one', requestId: 4, currentRequestId: 5,
  }), false);
  assert.equal(canApplyActorScopedUpdate({
    requestActorKey: 'guest:one', currentActorKey: 'guest:one', requestId: 4, currentRequestId: 4,
  }), true);
});
