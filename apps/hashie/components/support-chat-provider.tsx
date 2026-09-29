import { AccessibilityInfo } from 'react-native';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { canApplyActorScopedUpdate } from '@/lib/actor-session';
import { compactAgentHistory } from '@/lib/agent-history';
import { useOnboarding } from '@/components/onboarding-provider';
import { getHashieErrorMessage, HashieApiError, hashieApi } from '@/lib/hashie-api';

export type SupportMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'complete' | 'streaming' | 'stopped' | 'failed';
};

type SupportChatContextValue = {
  actorKey: string | null;
  messages: SupportMessage[];
  isSending: boolean;
  error: string;
  send: (message: string) => Promise<boolean>;
  stop: () => void;
  retry: () => Promise<void>;
  clearError: () => void;
};

const SupportChatContext = createContext<SupportChatContextValue | null>(null);
function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

export function SupportChatProvider({ children }: { children: ReactNode }) {
  const { actor, getActiveCredentials, handleAuthenticationFailure } = useOnboarding();
  const actorKey = actor?.key ?? null;
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<{ actorKey: string; message: string } | null>(null);
  const actorKeyRef = useRef<string | null>(actorKey);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (actorKeyRef.current === actorKey) return;
    actorKeyRef.current = actorKey;
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    retryRef.current = null;
    setMessages([]);
    setError('');
    setIsSending(false);
  }, [actorKey]);

  const isCurrentOperation = useCallback((requestId: number, requestActorKey: string) => canApplyActorScopedUpdate({
    requestActorKey,
    currentActorKey: actorKeyRef.current,
    requestId,
    currentRequestId: requestIdRef.current,
  }), []);

  const send = useCallback(async (rawMessage: string) => {
    const message = rawMessage.trim();
    const requestActorKey = actorKeyRef.current;
    if (message.length < 2 || isSending || !requestActorKey) return false;
    const requestId = ++requestIdRef.current;
    setError('');
    const previousHistory = compactAgentHistory(messages
      .filter((item) => item.status === 'complete' && item.content.trim().length > 0)
      .map((item) => ({ role: item.role, content: item.content })));
    const userMessage: SupportMessage = { id: `user-${Date.now()}`, role: 'user', content: message, status: 'complete' };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', content: '', status: 'streaming' }]);
    setIsSending(true);
    retryRef.current = { actorKey: requestActorKey, message };
    announce('Hashie is preparing a response.');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const credentials = await getActiveCredentials(requestActorKey);
      if (!credentials || !isCurrentOperation(requestId, requestActorKey)) return false;
      let receivedText = false;
      await hashieApi.streamAgent({
        message,
        history: previousHistory,
        ...credentials,
        signal: controller.signal,
        onText: (text) => {
          if (!isCurrentOperation(requestId, requestActorKey)) return;
          if (!receivedText) announce('Hashie is replying.');
          receivedText = true;
          setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: item.content + text } : item));
        },
      });
      if (!isCurrentOperation(requestId, requestActorKey)) return false;
      if (!receivedText) throw new HashieApiError('Hashie sent an empty reply.', 502, 'service_unavailable');
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, status: 'complete' } : item));
      announce('Hashie’s response is ready.');
      return true;
    } catch (caught) {
      if (!isCurrentOperation(requestId, requestActorKey)) return false;
      if (caught instanceof HashieApiError && caught.status === 401) {
        await handleAuthenticationFailure(requestActorKey);
        return false;
      }
      if (caught instanceof HashieApiError && caught.code === 'aborted') {
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, status: 'stopped', content: item.content || 'Reply stopped.' } : item));
        announce('Reply stopped.');
      } else {
        const messageForUser = getHashieErrorMessage(caught);
        setMessages((current) => current.map((item) => item.id === assistantId
          ? { ...item, status: 'failed', content: item.content || 'Hashie could not finish this reply.' }
          : item));
        setError(messageForUser);
        announce(messageForUser);
      }
      return false;
    } finally {
      if (isCurrentOperation(requestId, requestActorKey)) {
        abortRef.current = null;
        setIsSending(false);
      }
    }
  }, [getActiveCredentials, handleAuthenticationFailure, isCurrentOperation, isSending, messages]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const retry = useCallback(async () => {
    const retryState = retryRef.current;
    if (retryState && retryState.actorKey === actorKeyRef.current) await send(retryState.message);
  }, [send]);
  const value = useMemo(() => ({ actorKey, messages, isSending, error, send, stop, retry, clearError: () => setError('') }), [actorKey, error, isSending, messages, retry, send, stop]);
  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}

export function useSupportChat() {
  const context = useContext(SupportChatContext);
  if (!context) throw new Error('useSupportChat must be used inside SupportChatProvider');
  return context;
}
