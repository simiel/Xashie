import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard } from 'react-native';

import type { AgeGroup } from '@/auth/types';
import type { SupportedLanguage } from '@/content/copy';

import { clearChatHistory, readChatDraft, readChatHistory, writeChatDraft, writeChatHistory } from '@/lib/chat-storage';
import {
  chatReducer,
  createChatMessage,
  initialChatState,
  type ChatMessage,
  type MessageFeedback,
} from '@/lib/chat-state';
import { HashieApiError, hashieApi, type ServerMessage } from '@/lib/hashie-api-client';
import { useAuth } from '@clerk/expo';
import { useAuthProfile } from '@/auth/auth-context';

const cancelledNotice = 'This response was stopped. You can try again when you are ready.';

type UseHashieChatOptions = {
  owner: string | null;
  language: SupportedLanguage;
  ageGroup: AgeGroup;
};

function announce(message: string) {
  void AccessibilityInfo.announceForAccessibility(message);
}

function serverMessageToChatMessage(message: ServerMessage): ChatMessage {
  return {
    id: message.id,
    serverId: message.id,
    role: message.role,
    text: message.content,
    createdAt: message.createdAt,
    status: 'complete',
    language: message.language,
    isMock: false,
    safetyEscalated: Boolean(message.safetyResult && message.safetyResult.decision !== 'allow'),
  };
}

export function useHashieChat({ owner, language, ageGroup }: UseHashieChatOptions) {
  const { getToken } = useAuth();
  const { markSessionExpired } = useAuthProfile();
  const [state, dispatch] = useReducer(chatReducer, initialChatState(language, ageGroup));
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const isHydrating = Boolean(owner && hydratedOwner !== owner);
  const generationRef = useRef<{ assistantMessageId: string; controller: AbortController } | null>(null);
  const mountedRef = useRef(true);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

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
    conversationIdRef.current = null;
    if (!owner) {
      dispatch({ type: 'restore', messages: [] });
      return () => { active = false; };
    }
    void (async () => {
      const localMessages = await readChatHistory(owner);
      try {
        const token = await getTokenRef.current();
        if (!token) throw new HashieApiError('Your session has expired.', 401, 'unauthorized');
        const conversations = await hashieApi.listConversations(token);
        const latest = [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        if (latest) {
          conversationIdRef.current = latest.id;
          const detail = await hashieApi.getConversation(token, latest.id);
          dispatch({ type: 'restore', messages: detail.messages.map(serverMessageToChatMessage) });
        } else dispatch({ type: 'restore', messages: localMessages });
      } catch (error) {
        dispatch({ type: 'restore', messages: localMessages });
        if (error instanceof HashieApiError && error.status === 401) markSessionExpired();
      }
      if (active && mountedRef.current) {
        const draft = await readChatDraft(owner);
        dispatch({ type: 'set_draft', text: draft });
        setHydratedOwner(owner);
      }
    })();
    return () => { active = false; };
  }, [markSessionExpired, owner]);

  useEffect(() => {
    if (!owner || isHydrating) return;
    void writeChatHistory(owner, state.messages);
    void writeChatDraft(owner, state.draftText);
  }, [isHydrating, owner, state.draftText, state.messages]);

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
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 35_000);
    generationRef.current = { assistantMessageId, controller };
    dispatch({ type: 'begin_generation', assistantMessageId });
    try {
      const token = await getToken();
      if (!owner) throw new HashieApiError('Connected chat requires an account. You can sign in to continue safely.', 403, 'guest_forbidden');
      if (!token) throw new HashieApiError('Your session has expired. Please sign in again.', 401, 'unauthorized');
      if (!conversationIdRef.current) {
        const conversation = await hashieApi.createConversation(token, responseLanguage);
        conversationIdRef.current = conversation.id;
      }
      let answer = '';
      let completed = false;
      await hashieApi.sendMessage(token, conversationIdRef.current, text, responseLanguage, responseAgeGroup, {
        signal: controller.signal,
        onEvent: event => {
          if (event.type === 'delta') {
            answer += event.text;
            dispatch({ type: 'append_assistant_text', assistantMessageId, text: answer });
          } else if (event.type === 'completed') {
            completed = true;
            if (event.messageId) dispatch({ type: 'set_server_message_id', assistantMessageId, serverId: event.messageId });
            if (event.safety) dispatch({ type: 'mark_safety_escalation', assistantMessageId });
          } else if (event.type === 'error') throw new HashieApiError(event.message ?? 'Hashie could not complete that response.', 502, event.code);
        },
      });
      if (!completed) throw new HashieApiError('The response stream was disconnected.', 0, 'disconnected');
      if (!mountedRef.current) return;
      dispatch({ type: 'complete_generation', assistantMessageId });
      announce('Hashie finished the response.');
    } catch (error) {
      if (!mountedRef.current) return;
      if (timedOut) {
        dispatch({ type: 'fail_generation_with_code', failedMessage: { userMessageId, assistantMessageId, text, language: responseLanguage, ageGroup: responseAgeGroup }, message: 'Hashie took too long to respond. Please try again.', code: 'timeout' });
      } else if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        dispatch({ type: 'cancel_generation', assistantMessageId, notice: cancelledNotice });
      } else {
        const apiError = error instanceof HashieApiError ? error : null;
        const code = apiError?.status === 401 ? 'session' : apiError?.code === 'disconnected' ? 'disconnected' : apiError?.code === 'timeout' ? 'timeout' : apiError?.code === 'safety' ? 'safety' : apiError?.status === 0 ? 'offline' : 'unavailable';
        const message = apiError?.status === 401 ? 'Your session has expired. Please sign in again.' : apiError?.code === 'guest_forbidden' ? 'Connected chat requires an account. Please sign in to continue safely.' : apiError?.code === 'timeout' ? 'Hashie took too long to respond. Please try again.' : apiError?.code === 'disconnected' ? 'The connection was interrupted. Your question is ready to retry.' : apiError?.message ?? 'Hashie could not complete that response. You can try again.';
        dispatch({
          type: 'fail_generation_with_code',
          failedMessage: { userMessageId, assistantMessageId, text, language: responseLanguage, ageGroup: responseAgeGroup },
          message,
          code,
        });
        if (code === 'session') markSessionExpired();
        announce('The response could not be completed. Retry is available.');
      }
    } finally {
      clearTimeout(timeout);
      if (generationRef.current?.assistantMessageId === assistantMessageId) generationRef.current = null;
    }
  }, [getToken, markSessionExpired, owner]);

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
    const message = state.messages.find(item => item.id === messageId);
    void (async () => {
      if (!message?.serverId) return;
      const token = await getToken();
      if (token) await hashieApi.sendFeedback(token, message.serverId, feedback).catch(() => undefined);
    })();
    announce(feedback === 'helpful' ? 'Marked as helpful.' : 'Marked as not helpful.');
  }, [getToken, state.messages]);

  const listenToMessage = useCallback((message: ChatMessage) => {
    if (!message.text) return;
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    dispatch({ type: 'set_voice_state', voiceState: 'reading' });
    announce('Read aloud is not available yet.');
    voiceTimerRef.current = setTimeout(() => dispatch({ type: 'set_voice_state', voiceState: 'idle' }), 1400);
  }, []);

  const requestClear = useCallback(() => dispatch({ type: 'set_clear_confirmation', value: true }), []);
  const cancelClear = useCallback(() => dispatch({ type: 'set_clear_confirmation', value: false }), []);
  const confirmClear = useCallback(async () => {
    generationRef.current?.controller.abort();
    conversationIdRef.current = null;
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
