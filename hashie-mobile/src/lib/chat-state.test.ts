import { describe, expect, it } from 'vitest';

import { chatReducer, createChatMessage, initialChatState } from './chat-state';

describe('chat reducer', () => {
  it('tracks sending, streaming, complete, and feedback transitions by stable IDs', () => {
    const user = createChatMessage('user', 'Help me prepare for a clinic visit.', 'en', 'complete', false);
    const assistant = createChatMessage('assistant', '', 'en', 'sending', true);
    let state = chatReducer(initialChatState('en', '18_plus'), { type: 'add_message_pair', userMessage: user, assistantMessage: assistant });
    expect(state.messages.map(message => message.id)).toEqual([user.id, assistant.id]);
    state = chatReducer(state, { type: 'begin_generation', assistantMessageId: assistant.id });
    state = chatReducer(state, { type: 'append_assistant_text', assistantMessageId: assistant.id, text: 'A local preview.' });
    state = chatReducer(state, { type: 'complete_generation', assistantMessageId: assistant.id });
    state = chatReducer(state, { type: 'set_feedback', messageId: assistant.id, feedback: 'helpful' });
    expect(state.messages.find(message => message.id === assistant.id)?.status).toBe('complete');
    expect(state.feedbackByMessageId[assistant.id]).toBe('helpful');
    expect(state.isGenerating).toBe(false);
  });

  it('keeps the question for retry and preserves partial output on cancellation', () => {
    const user = createChatMessage('user', 'Please try again.', 'en', 'complete', false);
    const assistant = createChatMessage('assistant', '', 'en', 'sending', true);
    let state = chatReducer(initialChatState('en', '13_to_15'), { type: 'add_message_pair', userMessage: user, assistantMessage: assistant });
    state = chatReducer(state, { type: 'begin_generation', assistantMessageId: assistant.id });
    state = chatReducer(state, { type: 'append_assistant_text', assistantMessageId: assistant.id, text: 'Partial ' });
    state = chatReducer(state, { type: 'cancel_generation', assistantMessageId: assistant.id, notice: 'Incomplete' });
    expect(state.messages.find(message => message.id === assistant.id)?.text).toBe('Partial ');
    state = chatReducer(state, { type: 'fail_generation', failedMessage: { userMessageId: user.id, assistantMessageId: assistant.id, text: user.text, language: 'en', ageGroup: '13_to_15' }, message: 'Try again.' });
    expect(state.lastFailedMessage?.userMessageId).toBe(user.id);
    state = chatReducer(state, { type: 'retry_generation', assistantMessageId: assistant.id });
    expect(state.messages.find(message => message.id === assistant.id)?.status).toBe('streaming');
  });

  it('clears only messages while keeping language, age, and keyboard context', () => {
    const state = { ...initialChatState('tw', 'under_13'), keyboardState: 'open' as const, draftText: 'discard this draft' };
    const cleared = chatReducer(state, { type: 'clear' });
    expect(cleared.messages).toEqual([]);
    expect(cleared.selectedLanguage).toBe('tw');
    expect(cleared.ageGroup).toBe('under_13');
    expect(cleared.keyboardState).toBe('open');
    expect(cleared.draftText).toBe('');
  });
});
