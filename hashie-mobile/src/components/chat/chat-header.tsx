import { Pressable, Text, View } from '@/ui/primitives';

type ChatHeaderProps = {
  title: string;
  subtitle: string;
  mockLabel: string;
  newConversationLabel: string;
  disabled: boolean;
  topInset: number;
  onNewConversation: () => void;
};

export function ChatHeader({ title, subtitle, mockLabel, newConversationLabel, disabled, topInset, onNewConversation }: ChatHeaderProps) {
  return (
    <View style={{ paddingTop: topInset + 12 }} className="border-b border-slate-200 bg-white px-5 pb-4 dark:border-slate-800 dark:bg-slate-950">
      <View className="mx-auto w-full max-w-2xl flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text selectable accessibilityRole="header" className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</Text>
          <Text selectable className="text-sm leading-5 text-slate-600 dark:text-slate-300">{subtitle}</Text>
          <View accessibilityRole="text" className="mt-1 self-start rounded-full bg-sky-50 px-3 py-1 dark:bg-sky-950">
            <Text selectable className="text-xs font-semibold text-sky-800 dark:text-sky-200">{mockLabel}</Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel={newConversationLabel}
          accessibilityHint="Clear this conversation after confirmation"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onNewConversation}
          className="min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 active:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:active:bg-slate-800">
          <Text className="text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{newConversationLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
