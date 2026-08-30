import { ActivityIndicator } from 'react-native';

import { Text, View } from '@/ui/primitives';

export function ChatTypingIndicator({ label }: { label: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} className="flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <ActivityIndicator />
      <Text selectable className="text-sm text-slate-600 dark:text-slate-300">{label}</Text>
    </View>
  );
}
