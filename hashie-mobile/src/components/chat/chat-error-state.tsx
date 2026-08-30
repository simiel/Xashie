import { Pressable, Text, View } from '@/ui/primitives';

export function ChatErrorState({ message, retryLabel, onRetry, disabled }: { message: string; retryLabel: string; onRetry: () => void; disabled: boolean }) {
  return (
    <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-700 dark:bg-rose-950">
      <Text selectable className="text-sm leading-6 text-rose-950 dark:text-rose-50">{message}</Text>
      <Pressable
        accessibilityLabel={retryLabel}
        accessibilityHint="Try the same question again without sending another copy"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onRetry}
        className="min-h-11 self-start items-center justify-center rounded-xl bg-rose-700 px-4 active:bg-rose-800 disabled:opacity-50 dark:bg-rose-500 dark:active:bg-rose-400">
        <Text className="text-sm font-bold text-white">{retryLabel}</Text>
      </Pressable>
    </View>
  );
}
