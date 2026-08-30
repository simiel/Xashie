import { ActivityIndicator } from 'react-native';
import { Text, View } from '@/ui/primitives';

export function RouteLoading({ label = 'Restoring your private session…' }: { label?: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-slate-950"><ActivityIndicator size="large" /><Text className="text-center text-base text-slate-700 dark:text-slate-200">{label}</Text></View>;
}
