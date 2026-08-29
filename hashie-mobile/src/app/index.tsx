import { Stack } from 'expo-router';

import { SafetyNotice } from '@/components/safety-notice';
import { copy } from '@/content/copy';
import { ScrollView, Text, View } from '@/ui/primitives';

export default function HomeScreen() {
  const text = copy.en;
  return (
    <>
      <Stack.Screen options={{ title: text.appName }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="mx-auto w-full max-w-2xl gap-6 px-5 pb-10 pt-6">
        <View className="gap-3">
          <Text selectable className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">{text.welcomeTitle}</Text>
          <Text selectable className="text-lg leading-7 text-slate-700 dark:text-slate-200">{text.welcomeBody}</Text>
        </View>
        <SafetyNotice />
        <View className="gap-2 rounded-2xl bg-sky-50 p-4 dark:bg-sky-950">
          <Text selectable className="text-base font-semibold text-sky-950 dark:text-sky-50">{text.privacy}</Text>
          <Text selectable className="text-sm leading-5 text-sky-950 dark:text-sky-50">{text.privacyBody}</Text>
        </View>
        <Text selectable className="text-sm leading-5 text-slate-600 dark:text-slate-300">{text.emergency}</Text>
      </ScrollView>
    </>
  );
}
