import { useEffect, useRef, type ComponentProps } from 'react';
import { ScrollView as NativeScrollView } from 'react-native';

import type { ChatMessage as ChatMessageModel, ChatVoiceState, MessageFeedback } from '@/lib/chat-state';
import { View } from '@/ui/primitives';
import { ChatMessage } from './chat-message';

type ChatMessageListProps = {
  messages: ChatMessageModel[];
  largeText: boolean;
  voiceState: ChatVoiceState;
  labels: ComponentProps<typeof ChatMessage>['labels'];
  disabled: boolean;
  onCopy: (message: ChatMessageModel) => void;
  onListen: (message: ChatMessageModel) => void;
  onFeedback: (messageId: string, feedback: MessageFeedback) => void;
  onRetry: () => void;
};

export function ChatMessageList({ messages, largeText, voiceState, labels, disabled, onCopy, onListen, onFeedback, onRetry }: ChatMessageListProps) {
  const scrollRef = useRef<NativeScrollView>(null);
  const latestMessageText = messages.at(-1)?.text;
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
    return () => clearTimeout(timer);
  }, [messages.length, latestMessageText]);

  return (
    <NativeScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 }}>
      <View className="mx-auto w-full max-w-2xl gap-3">
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            message={message}
            largeText={largeText}
            voiceState={voiceState}
            labels={labels}
            disabled={disabled}
            onCopy={onCopy}
            onListen={onListen}
            onFeedback={onFeedback}
            onRetry={onRetry}
          />
        ))}
      </View>
    </NativeScrollView>
  );
}
