import type { AgeGroup } from '@/auth/types';
import type { SupportedLanguage } from '@/content/copy';
import { copy } from '@/content/copy';
import { chatSuggestions, chatText } from '@/content/chat-copy';
import { Text, View } from '@/ui/primitives';
import { ChatSuggestion } from './chat-suggestion';

type ChatEmptyStateProps = {
  language: SupportedLanguage;
  ageGroup: AgeGroup;
  disabled: boolean;
  onSuggestion: (text: string) => void;
};

export function ChatEmptyState({ language, ageGroup, disabled, onSuggestion }: ChatEmptyStateProps) {
  const text = chatText(language);
  const appCopy = copy[language];
  const suggestions = chatSuggestions(ageGroup, language);
  return (
    <View className="mx-auto w-full max-w-2xl gap-5 px-5 py-7">
      <View className="gap-2">
        <Text selectable accessibilityRole="header" className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{text.emptyTitle}</Text>
        <Text selectable className="text-base leading-6 text-slate-700 dark:text-slate-200">{text.emptyBody}</Text>
      </View>
      <View accessibilityRole="alert" className="gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950">
        <Text selectable className="text-base font-semibold text-sky-950 dark:text-sky-50">{appCopy.privacy}</Text>
        <Text selectable className="text-sm leading-5 text-sky-950 dark:text-sky-50">{appCopy.privacyBody} {appCopy.limitation} {appCopy.emergency}</Text>
      </View>
      <View className="gap-3">
        <Text selectable className="text-lg font-bold text-slate-950 dark:text-white">{text.suggestionsTitle}</Text>
        <Text selectable className="text-sm leading-5 text-slate-600 dark:text-slate-300">{text.suggestionsNote}</Text>
        <View className="gap-2">
          {suggestions.map(suggestion => <ChatSuggestion key={suggestion.id} text={suggestion.text} disabled={disabled} onPress={() => onSuggestion(suggestion.text)} />)}
        </View>
      </View>
    </View>
  );
}
