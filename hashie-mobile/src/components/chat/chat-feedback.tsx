import type { MessageFeedback } from '@/lib/chat-state';
import { Pressable, Text, View } from '@/ui/primitives';

type ChatFeedbackProps = {
  feedback?: MessageFeedback;
  helpfulLabel: string;
  notHelpfulLabel: string;
  disabled: boolean;
  onFeedback: (feedback: MessageFeedback) => void;
};

export function ChatFeedback({ feedback, helpfulLabel, notHelpfulLabel, disabled, onFeedback }: ChatFeedbackProps) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
      <Pressable
        accessibilityLabel={helpfulLabel}
        accessibilityHint="Give feedback about this response"
        accessibilityRole="radio"
        accessibilityState={{ disabled, selected: feedback === 'helpful' }}
        disabled={disabled}
        onPress={() => onFeedback('helpful')}
        className={`min-h-11 rounded-xl border px-3 py-2 ${feedback === 'helpful' ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'} disabled:opacity-50`}>
        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">{helpfulLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={notHelpfulLabel}
        accessibilityHint="Give feedback about this response"
        accessibilityRole="radio"
        accessibilityState={{ disabled, selected: feedback === 'not_helpful' }}
        disabled={disabled}
        onPress={() => onFeedback('not_helpful')}
        className={`min-h-11 rounded-xl border px-3 py-2 ${feedback === 'not_helpful' ? 'border-amber-600 bg-amber-50 dark:border-amber-400 dark:bg-amber-950' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'} disabled:opacity-50`}>
        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">{notHelpfulLabel}</Text>
      </Pressable>
    </View>
  );
}
