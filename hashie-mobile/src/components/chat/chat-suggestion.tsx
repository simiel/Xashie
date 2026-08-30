import { Pressable, Text } from '@/ui/primitives';

export function ChatSuggestion({ text, onPress, disabled }: { text: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityLabel={`Use suggested question: ${text}`}
      accessibilityHint="Insert this question into the message composer"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-12 justify-center rounded-2xl border border-sky-200 bg-white px-4 py-3 active:bg-sky-50 disabled:opacity-50 dark:border-sky-800 dark:bg-slate-900 dark:active:bg-sky-950">
      <Text selectable className="text-sm leading-5 text-sky-950 dark:text-sky-100">{text}</Text>
    </Pressable>
  );
}
