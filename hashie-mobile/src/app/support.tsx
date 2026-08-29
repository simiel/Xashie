import { Stack } from 'expo-router';

import { copy } from '@/content/copy';
import { ScrollView, Text, View } from '@/ui/primitives';

export default function SupportScreen() {
  const text = copy.en;
  return (
    <>
      <Stack.Screen options={{ title: text.support }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="mx-auto w-full max-w-2xl gap-4 px-5 pb-10 pt-6">
        <Text selectable className="text-3xl font-bold text-slate-950 dark:text-white">{text.support}</Text>
        <View accessibilityRole="alert" className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950">
          <Text selectable className="text-base leading-6 text-amber-950 dark:text-amber-50">{text.emergency}</Text>
        </View>
      </ScrollView>
    </>
  );
}
