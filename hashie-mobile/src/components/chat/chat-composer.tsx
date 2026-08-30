import { ActivityIndicator } from 'react-native';

import { Pressable, Text, TextInput, View } from '@/ui/primitives';

type ChatComposerProps = {
  draftText: string;
  isGenerating: boolean;
  isClearing: boolean;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  maxLengthLabel: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
};

export function ChatComposer({ draftText, isGenerating, isClearing, placeholder, sendLabel, stopLabel, maxLengthLabel, onChangeText, onSend, onStop }: ChatComposerProps) {
  const disabled = isClearing || isGenerating;
  const hasText = draftText.trim().length > 0;
  const lineCount = Math.min(5, Math.max(1, draftText.split('\n').length));
  const inputHeight = 50 + (lineCount - 1) * 22;
  return (
    <View style={{ paddingBottom: 8 }} className="border-t border-slate-200 bg-white px-4 pt-3 dark:border-slate-800 dark:bg-slate-950">
      <View className="mx-auto w-full max-w-2xl gap-2">
        <View className="flex-row items-end gap-2">
          <TextInput
            accessibilityLabel="Health question"
            accessibilityHint="Type a question for Hashie. Do not share anything you do not feel comfortable sharing."
            accessibilityRole="text"
            accessibilityState={{ disabled: isClearing }}
            editable={!isClearing}
            multiline
            maxLength={4000}
            value={draftText}
            onChangeText={onChangeText}
            onSubmitEditing={() => { if (hasText && !disabled) onSend(); }}
            placeholder={placeholder}
            placeholderTextColor="#64748B"
            textAlignVertical="top"
            style={{ height: inputHeight }}
            className="min-h-12 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base leading-6 text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
          {isGenerating ? (
            <Pressable
              accessibilityLabel={stopLabel}
              accessibilityHint="Stop the local mock response and keep any partial text"
              accessibilityRole="button"
              accessibilityState={{ disabled: isClearing, busy: true }}
              disabled={isClearing}
              onPress={onStop}
              className="min-h-12 min-w-12 items-center justify-center rounded-2xl border border-amber-500 bg-amber-50 px-3 dark:border-amber-400 dark:bg-amber-950">
              <Text className="text-center text-xs font-bold text-amber-900 dark:text-amber-100">{stopLabel}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel={sendLabel}
              accessibilityHint={hasText ? 'Send this health question' : 'Type a question before sending'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasText || disabled, busy: isGenerating }}
              disabled={!hasText || disabled}
              onPress={onSend}
              className="min-h-12 min-w-12 items-center justify-center rounded-2xl bg-sky-700 px-3 active:bg-sky-800 disabled:opacity-40 dark:bg-sky-500 dark:active:bg-sky-400">
              {isClearing ? <ActivityIndicator color="white" /> : <Text className="text-center text-xs font-bold text-white">{sendLabel}</Text>}
            </Pressable>
          )}
        </View>
        <Text selectable className="px-1 text-xs leading-4 text-slate-500 dark:text-slate-400">{maxLengthLabel} {draftText.length}/4000</Text>
      </View>
    </View>
  );
}
