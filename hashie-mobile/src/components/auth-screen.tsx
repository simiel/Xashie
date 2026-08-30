import { type PropsWithChildren, useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator, useColorScheme } from 'react-native';

import { Pressable, ScrollView, Text, View } from '@/ui/primitives';

type ScreenProps = PropsWithChildren<{ eyebrow?: string; title: string; body?: string; step?: { current: number; total: number } }>;

export function AuthScreen({ eyebrow, title, body, step, children }: ScreenProps) {
  const scheme = useColorScheme();
  useEffect(() => { AccessibilityInfo.announceForAccessibility(title); }, [title]);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="mx-auto min-h-full w-full max-w-xl justify-center gap-6 px-5 py-8">
      <View className="gap-3">
        {eyebrow ? <Text className="text-sm font-semibold text-sky-700 dark:text-sky-300">{eyebrow}</Text> : null}
        {step ? <Progress current={step.current} total={step.total} /> : null}
        <Text accessibilityRole="header" className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</Text>
        {body ? <Text className="text-lg leading-7 text-slate-700 dark:text-slate-200">{body}</Text> : null}
      </View>
      {children}
      <Text className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{scheme === 'dark' ? 'Hashie respects your device appearance.' : 'Hashie is designed to be clear and private.'}</Text>
    </ScrollView>
  );
}

export function PrimaryButton({ label, hint, onPress, disabled = false, loading = false }: { label: string; hint: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return <Pressable accessibilityLabel={label} accessibilityHint={hint} accessibilityRole="button" accessibilityState={{ disabled, busy: loading }} disabled={disabled || loading} onPress={onPress} className="min-h-14 items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 active:bg-sky-800 disabled:opacity-50 dark:bg-sky-500 dark:active:bg-sky-600">{loading ? <ActivityIndicator color="white" /> : <Text className="text-center text-base font-bold text-white">{label}</Text>}</Pressable>;
}

export function SecondaryButton({ label, hint, onPress, disabled = false }: { label: string; hint: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityLabel={label} accessibilityHint={hint} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} className="min-h-14 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 active:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:active:bg-slate-800"><Text className="text-center text-base font-semibold text-slate-900 dark:text-white">{label}</Text></Pressable>;
}

export function ChoiceButton({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} accessibilityHint={hint} accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} className={`min-h-16 rounded-2xl border p-4 ${selected ? 'border-sky-700 bg-sky-50 dark:border-sky-300 dark:bg-sky-950' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'}`}><Text className="text-base font-semibold text-slate-950 dark:text-white">{label}</Text><Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{hint}</Text></Pressable>;
}

export function StatusMessage({ tone = 'info', children }: PropsWithChildren<{ tone?: 'info' | 'error' | 'warning' }>) {
  const classes = tone === 'error' ? 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950' : tone === 'warning' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950' : 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950';
  return <View accessibilityRole="alert" className={`rounded-2xl border p-4 ${classes}`}><Text className="text-sm leading-6 text-slate-900 dark:text-white">{children}</Text></View>;
}

function Progress({ current, total }: { current: number; total: number }) {
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current }} accessibilityLabel={`Onboarding step ${current} of ${total}`} className="flex-row gap-1">{Array.from({ length: total }, (_, index) => <View key={index} className={`h-1 flex-1 rounded-full ${index < current ? 'bg-sky-700 dark:bg-sky-400' : 'bg-slate-200 dark:bg-slate-700'}`} />)}</View>;
}
