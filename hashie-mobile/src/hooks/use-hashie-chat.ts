import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard } from 'react-native';

import type { AgeGroup } from '@/auth/types';
import type { SupportedLanguage } from '@/content/copy';

import { clearChatHistory, readChatHistory, writeChatHistory } from '@/lib/chat-storage';
import {
  chatReducer,
  createChatMessage,
  initialChatState,
  type ChatMessage,
  type MessageFeedback,
} from '@/lib/chat-state';
import { MockResponderCancelledError, streamMockResponse } from '@/lib/mock-chat-responder';

const cancelledNotice = 'This local mock response was stopped before it finished.';
const failureNotice = 'We could not finish this local mock response. You can try again without sending your question again.';

type UseHashieChatOptions = {
  owner: string | null;
  language: SupportedLanguage;
  ageGroup: AgeGroup;
};

function announce(message: string) {
  void AccessibilityInfo.announceForAccessibility(message);
}

export function useHashieChat({ owner, language, ageGroup }: UseHashieChatOptions) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState(language, ageGroup));
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const isHydrating = Boolean(owner && hydratedOwner !== owner);
  const generationRef = useRef<{ assistantMessageId: string; controller: AbortController } | null>(null);
  const mountedRef = useRef(true);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current?.controller.abort();
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    dispatch({ type: 'set_context', language, ageGroup });
  }, [ageGroup, language]);

  useEffect(() => {
    let active = true;
    dispatch({ type: 'restore', messages: [] });
    if (!owner) {
      return () => { active = false; };
    }
    void readChatHistory(owner).then(messages => {
      if (!active || !mountedRef.current) return;
      dispatch({ type: 'restore', messages });
      setHydratedOwner(owner);
    });
    return () => { active = false; };
  }, [owner]);

  useEffect(() => {
    if (!owner || isHydrating) return;
    void writeChatHistory(owner, state.messages);
  }, [isHydrating, owner, state.messages]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => dispatch({ type: 'set_keyboard', value: 'open' }));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => dispatch({ type: 'set_keyboard', value: 'closed' }));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const runGeneration = useCallback(async (
    userMessageId: string,
    assistantMessageId: string,
    text: string,
    responseLanguage: SupportedLanguage,
    responseAgeGroup: AgeGroup,
  ) => {
    const controller = new AbortController();
    generationRef.current = { assistantMessageId, controller };
    dispatch({ type: 'begin_generation', assistantMessageId });
    try {
      await streamMockResponse(
        { text, language: responseLanguage, ageGroup: responseAgeGroup },
        {
          signal: controller.signal,
          onChunk: partial => dispatch({ type: 'append_assistant_text', assistantMessageId, text: partial }),
        },
      );
      if (!mountedRef.current) return;
      dispatch({ type: 'complete_generation', assistantMessageId });
      announce('Hashie finished a local mock response.');
    } catch (error) {
      if (!mountedRef.current) return;
      if (error instanceof MockResponderCancelledError) {
        dispatch({ type: 'cancel_generation', assistantMessageId, notice: cancelledNotice });
      } else {
        dispatch({
          type: 'fail_generation',
          failedMessage: { userMessageId, assistantMessageId, text, language: responseLanguage, ageGroup: responseAgeGroup },
          message: failureNotice,
        });
        announce('The local mock response could not be completed. Retry is available.');
      }
    } finally {
      if (generationRef.current?.assistantMessageId === assistantMessageId) generationRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((textOverride?: string) => {
    if (generationRef.current || state.isGenerating || state.showClearConfirmation) return false;
    const text = (textOverride ?? state.draftText).trim();
    if (!text) return false;
    const userMessage = createChatMessage('user', text, language, 'complete', false);
    const assistantMessage = createChatMessage('assistant', '', language, 'sending', true);
    dispatch({ type: 'add_message_pair', userMessage, assistantMessage });
    void runGeneration(userMessage.id, assistantMessage.id, text, language, ageGroup);
    return true;
  }, [ageGroup, language, runGeneration, state.draftText, state.isGenerating, state.showClearConfirmation]);

  const retryLast = useCallback(() => {
    if (!state.lastFailedMessage || generationRef.current || state.showClearConfirmation) return false;
    const failed = state.lastFailedMessage;
    dispatch({ type: 'retry_generation', assistantMessageId: failed.assistantMessageId });
    void runGeneration(failed.userMessageId, failed.assistantMessageId, failed.text, failed.language, failed.ageGroup);
    return true;
  }, [runGeneration, state.lastFailedMessage, state.showClearConfirmation]);

  const stopGeneration = useCallback(() => {
    generationRef.current?.controller.abort();
  }, []);

  const copyMessage = useCallback(async (message: ChatMessage) => {
    if (!message.text) return false;
    await Clipboard.setStringAsync(message.text);
    announce('Message copied.');
    return true;
  }, []);

  const setFeedback = useCallback((messageId: string, feedback: MessageFeedback) => {
    dispatch({ type: 'set_feedback', messageId, feedback });
    announce(feedback === 'helpful' ? 'Marked as helpful.' : 'Marked as not helpful.');
  }, []);

  const listenToMessage = useCallback((message: ChatMessage) => {
    if (!message.text) return;
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    dispatch({ type: 'set_voice_state', voiceState: 'reading' });
    announce('Read aloud is a placeholder in this local mobile preview.');
    voiceTimerRef.current = setTimeout(() => dispatch({ type: 'set_voice_state', voiceState: 'idle' }), 1400);
  }, []);

  const requestClear = useCallback(() => dispatch({ type: 'set_clear_confirmation', value: true }), []);
  const cancelClear = useCallback(() => dispatch({ type: 'set_clear_confirmation', value: false }), []);
  const confirmClear = useCallback(async () => {
    generationRef.current?.controller.abort();
    if (owner) await clearChatHistory(owner);
    dispatch({ type: 'set_clear_confirmation', value: false });
    dispatch({ type: 'clear' });
    announce('Conversation cleared.');
  }, [owner]);
  const setDraftText = useCallback((text: string) => dispatch({ type: 'set_draft', text }), []);

  return {
    ...state,
    isHydrating,
    setDraftText,
    sendMessage,
    retryLast,
    stopGeneration,
    copyMessage,
    setFeedback,
    listenToMessage,
    requestClear,
    cancelClear,
    confirmClear,
  };
}
