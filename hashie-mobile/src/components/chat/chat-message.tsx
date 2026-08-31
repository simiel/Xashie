import type { ChatMessage as ChatMessageModel, ChatVoiceState, MessageFeedback } from '@/lib/chat-state';
import { Pressable, Text, View } from '@/ui/primitives';
import { ChatErrorState } from './chat-error-state';
import { ChatFeedback } from './chat-feedback';
import { ChatTypingIndicator } from './chat-typing-indicator';

type ChatMessageProps = {
  message: ChatMessageModel;
  largeText: boolean;
  voiceState: ChatVoiceState;
  labels: {
    copy: string;
    listen: string;
    listening: string;
    helpful: string;
    notHelpful: string;
    retry: string;
    cancelled: string;
    typing: string;
    safetyGuidance: string;
  };
  disabled: boolean;
  onCopy: (message: ChatMessageModel) => void;
  onListen: (message: ChatMessageModel) => void;
  onFeedback: (messageId: string, feedback: MessageFeedback) => void;
  onRetry: () => void;
};

function MessageBody({ text, largeText, isUser }: { text: string; largeText: boolean; isUser: boolean }) {
  return (
    <View className="gap-3">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <Text key={`${index}-${paragraph.slice(0, 12)}`} selectable className={`${largeText ? 'text-lg' : 'text-base'} leading-6 ${isUser ? 'text-white' : 'text-slate-900 dark:text-slate-50'}`}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

export function ChatMessage({ message, largeText, voiceState, labels, disabled, onCopy, onListen, onFeedback, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user';
  if (!isUser && message.status === 'streaming' && !message.text) {
    return <ChatTypingIndicator label={labels.typing} />;
  }
  if (!isUser && message.status === 'failed') {
    return <ChatErrorState message={message.text} retryLabel={labels.retry} onRetry={onRetry} disabled={disabled} />;
  }
  return (
    <View className={`w-full ${isUser ? 'items-end' : 'items-start'}`}>
      <View className={`max-w-[92%] gap-3 rounded-3xl px-4 py-3 ${isUser ? 'rounded-br-lg bg-sky-700 dark:bg-sky-600' : 'rounded-bl-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
        {!isUser ? <Text selectable className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">Hashie · health support</Text> : null}
        <MessageBody text={message.text} largeText={largeText} isUser={isUser} />
        {message.safetyEscalated ? <Text selectable accessibilityRole="alert" className="text-xs font-semibold text-amber-800 dark:text-amber-200">{labels.safetyGuidance}</Text> : null}
        {message.status === 'cancelled' ? <Text selectable className="text-xs font-semibold text-amber-700 dark:text-amber-300">{labels.cancelled}</Text> : null}
        {isUser ? null : (
          <View className="gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                accessibilityLabel={labels.copy}
                accessibilityHint="Copy this response to the clipboard"
                accessibilityRole="button"
                accessibilityState={{ disabled: disabled || !message.text }}
                disabled={disabled || !message.text}
                onPress={() => onCopy(message)}
                className="min-h-11 rounded-xl px-2 py-2 active:bg-slate-100 disabled:opacity-50 dark:active:bg-slate-800">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">{labels.copy}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={voiceState === 'reading' ? labels.listening : labels.listen}
                accessibilityHint="Use the read-aloud placeholder for this response"
                accessibilityRole="button"
                accessibilityState={{ disabled: disabled || !message.text, busy: voiceState === 'reading' }}
                disabled={disabled || !message.text}
                onPress={() => onListen(message)}
                className="min-h-11 rounded-xl px-2 py-2 active:bg-slate-100 disabled:opacity-50 dark:active:bg-slate-800">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">{voiceState === 'reading' ? labels.listening : labels.listen}</Text>
              </Pressable>
            </View>
            <ChatFeedback feedback={message.feedback} helpfulLabel={labels.helpful} notHelpfulLabel={labels.notHelpful} disabled={disabled} onFeedback={feedback => onFeedback(message.id, feedback)} />
          </View>
        )}
      </View>
    </View>
  );
}
