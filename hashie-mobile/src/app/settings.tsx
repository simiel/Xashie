import { Stack } from 'expo-router';
import { Switch } from 'react-native';

import { copy } from '@/content/copy';
import { ScrollView, Text, View } from '@/ui/primitives';

export default function SettingsScreen() {
  const text = copy.en;
  return (
    <>
      <Stack.Screen options={{ title: text.settings }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="mx-auto w-full max-w-2xl gap-4 px-5 pb-10 pt-6">
        <Text selectable className="text-3xl font-bold text-slate-950 dark:text-white">{text.settings}</Text>
        <View className="flex-row items-center justify-between rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
          <View className="flex-1 gap-1 pr-4">
            <Text selectable className="text-base font-semibold text-slate-950 dark:text-white">{text.language}</Text>
            <Text selectable className="text-sm text-slate-700 dark:text-slate-200">English / Akan-Twi preference will be selected during onboarding.</Text>
          </View>
          <Switch value={false} disabled accessibilityLabel="Language preference is unavailable until onboarding" />
        </View>
      </ScrollView>
    </>
  );
}
