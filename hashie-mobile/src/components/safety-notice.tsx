import { copy, type SupportedLanguage } from '@/content/copy';
import { Text, View } from '@/ui/primitives';

type SafetyNoticeProps = { language?: SupportedLanguage };

export function SafetyNotice({ language = 'en' }: SafetyNoticeProps) {
  const text = copy[language];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={text.limitation}
      className="gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
      <Text selectable className="text-base font-semibold text-amber-950 dark:text-amber-50">
        {text.appName}
      </Text>
      <Text selectable className="text-sm leading-5 text-amber-950 dark:text-amber-50">
        {text.limitation}
      </Text>
    </View>
  );
}
