import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/expo';

import { getGuestToken, getHashieErrorMessage, HashieApiError, hashieApi } from '@/lib/hashie-api';

export type SupportMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'complete' | 'streaming' | 'stopped';
};

type SupportChatContextValue = {
  messages: SupportMessage[];
  isSending: boolean;
  error: string;
  send: (message: string) => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  clearError: () => void;
};

const SupportChatContext = createContext<SupportChatContextValue | null>(null);
const historyLimit = 8;

export function SupportChatProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<string | null>(null);

  const send = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (message.length < 2 || isSending) return;
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
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const clerkToken = isSignedIn ? await getToken() : null;
      const guestToken = isSignedIn ? null : await getGuestToken();
      if (!clerkToken && !guestToken) throw new HashieApiError('A private session is required.', 401, 'invalid_credentials');
      let receivedText = false;
      await hashieApi.streamAgent({
        message,
        history: previousHistory,
        clerkToken,
        guestToken,
        signal: controller.signal,
        onText: (text) => {
          receivedText = true;
          setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: item.content + text } : item));
        },
      });
      if (!receivedText) throw new HashieApiError('Hashie sent an empty reply.', 502, 'service_unavailable');
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, status: 'complete' } : item));
    } catch (caught) {
      if (controller.signal.aborted) {
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, status: 'stopped', content: item.content || 'Reply stopped.' } : item));
      } else {
        setMessages((current) => current.filter((item) => item.id !== assistantId));
        setError(getHashieErrorMessage(caught));
      }
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  };

  const stop = () => abortRef.current?.abort();
  const retry = async () => { if (retryRef.current) await send(retryRef.current); };
  const value = useMemo(() => ({ messages, isSending, error, send, stop, retry, clearError: () => setError('') }), [messages, isSending, error]);
  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}

export function useSupportChat() {
  const context = useContext(SupportChatContext);
  if (!context) throw new Error('useSupportChat must be used inside SupportChatProvider');
  return context;
}
