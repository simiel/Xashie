import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';

import { copy } from '@/content/copy';
import { Pressable, Text, View } from '@/ui/primitives';

export default function AppTabs() {
  const text = copy.en;
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <View className="flex-row justify-around border-t border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950">
          <WebTab href="/" label={text.home} />
          <WebTab href="/learn" label={text.learn} />
          <WebTab href="/support" label={text.support} />
          <WebTab href="/settings" label={text.settings} />
        </View>
      </TabList>
    </Tabs>
  );
}

function WebTab({ href, label }: { href: '/' | '/learn' | '/support' | '/settings'; label: string }) {
  return (
    <TabTrigger href={href} name={label} asChild>
      <Pressable accessibilityRole="tab" className="min-h-11 justify-center rounded-xl px-3">
        <Text className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</Text>
      </Pressable>
    </TabTrigger>
  );
}
