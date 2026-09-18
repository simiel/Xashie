import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { AccessibilityInfo } from 'react-native';

import { useOnboarding } from '@/components/onboarding-provider';
import { getGuestToken, getHashieErrorMessage, HashieApiError, hashieApi } from '@/lib/hashie-api';

export type SupportMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'complete' | 'streaming' | 'stopped' | 'failed';
};

type SupportChatContextValue = {
  messages: SupportMessage[];
  isSending: boolean;
  error: string;
  send: (message: string) => Promise<boolean>;
  stop: () => void;
  retry: () => Promise<void>;
  clearError: () => void;
};

const SupportChatContext = createContext<SupportChatContextValue | null>(null);
const historyLimit = 8;

function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

export function SupportChatProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const accessChoice = onboardingState.accessChoice;
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<string | null>(null);

  const send = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (message.length < 2 || isSending) return false;
    setError('');
    const previousHistory = messages
      .filter((item) => item.status === 'complete' && item.content.trim().length > 0)
      .slice(-historyLimit)
      .map((item) => ({ role: item.role, content: item.content }));
    const userMessage: SupportMessage = { id: `user-${Date.now()}`, role: 'user', content: message, status: 'complete' };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', content: '', status: 'streaming' }]);
    setIsSending(true);
    retryRef.current = message;
    announce('Hashie is preparing a response.');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const clerkToken = accessChoice === 'google' ? await getToken() : null;
      const guestToken = accessChoice === 'guest' ? await getGuestToken() : null;
      if (!clerkToken && !guestToken) throw new HashieApiError('A private session is required.', 401, 'invalid_credentials');
      let receivedText = false;
      await hashieApi.streamAgent({
        message,
        history: previousHistory,
        clerkToken,
        guestToken,
        signal: controller.signal,
        onText: (text) => {
          if (!receivedText) announce('Hashie is replying.');
          receivedText = true;
          setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: item.content + text } : item));
        },
      });
      if (!receivedText) throw new HashieApiError('Hashie sent an empty reply.', 502, 'service_unavailable');
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, status: 'complete' } : item));
      announce('Hashie’s response is ready.');
      return true;
    } catch (caught) {
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
      abortRef.current = null;
      setIsSending(false);
    }
  };

  const stop = () => abortRef.current?.abort();
  const retry = async () => { if (retryRef.current) await send(retryRef.current); };
  const value = useMemo(() => ({ messages, isSending, error, send, stop, retry, clearError: () => setError('') }), [accessChoice, messages, isSending, error]);
  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}

export function useSupportChat() {
  const context = useContext(SupportChatContext);
  if (!context) throw new Error('useSupportChat must be used inside SupportChatProvider');
  return context;
}
