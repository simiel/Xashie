import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, textStyles } from '@/constants/design-system';
import { HashieLogo, NavigationCard, PrivacyPill, ScreenScroll } from '@/components/hashie-ui';
import { useOnboarding } from '@/components/onboarding-provider';

export default function HomeScreen() {
  const { state } = useOnboarding();
  const greeting = state.nickname.trim() ? `A safe place to start, ${state.nickname.trim()}` : 'A safe place to start';

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Hashie' }} />
      <View style={styles.header}>
        <HashieLogo compact />
        <PrivacyPill />
      </View>
      <View style={styles.hero}>
        <Text style={textStyles.display} selectable>{greeting}</Text>
        <Text style={textStyles.body} selectable>
          Learn at your own pace with a private, accessible space for health education and support.
        </Text>
      </View>
      <View style={styles.cards}>
        <NavigationCard title="Ask Hashie" body="Bring a question and explore what information may help." symbol="…" tone="gold" onPress={() => router.push('/ask')} testID="home-ask-card" />
        <NavigationCard title="Explore health topics" body="Read clear, respectful learning content at your own pace." symbol="▱" tone="mint" onPress={() => router.push('/learn')} testID="home-learn-card" />
        <NavigationCard title="Check in" body="A gentle space to notice how you are feeling." symbol="♡" tone="blue" onPress={() => router.push('/check-in')} testID="home-check-in-card" />
      </View>
      <View style={styles.urgentWrap}>
        <Text style={styles.urgentLink} accessibilityRole="link" selectable>Need urgent help?  ›</Text>
        <Text style={textStyles.caption} selectable>For urgent concerns, contact local emergency services or a qualified health professional. This informational link is not connected yet.</Text>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  hero: { gap: spacing.sm, maxWidth: 620 },
  cards: { gap: spacing.md },
  urgentWrap: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
  urgentLink: { color: colors.urgent, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, textDecorationLine: 'underline' },
});
