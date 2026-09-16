import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton, FeatureNotice, HashieLogo, PrivacyPill, ScreenScroll } from '@/components/hashie-ui';
import { colors, spacing, textStyles } from '@/constants/design-system';

export default function StartScreen() {
  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Welcome to Hashie' }} />
      <View style={styles.brand}><HashieLogo /><Text style={textStyles.body} selectable>Health knowledge for a brighter Ghana.</Text></View>
      <View style={styles.hero}>
        <Text style={textStyles.utility} selectable>PRIVATE HEALTH EDUCATION</Text>
        <Text style={textStyles.display} selectable>A safe place to start</Text>
        <Text style={textStyles.body} selectable>Clear, respectful support for sexual and reproductive health questions, created with Ghanaian teens and young adults in mind.</Text>
      </View>
      <View style={styles.card}>
        <PrivacyPill />
        <Text style={textStyles.heading2} selectable>Your choice stays in your control.</Text>
        <Text style={textStyles.body} selectable>Start privately as a guest. You can share only the preferences that help Hashie communicate clearly and accessibly in this session.</Text>
        <ActionButton onPress={() => router.push('/onboarding/access')} testID="start-onboarding" accessibilityLabel="Start privately as a guest">Start privately as a guest  →</ActionButton>
      </View>
      <FeatureNotice>
        <Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>Start with care</Text>
        <Text style={textStyles.body} selectable>Guest sessions and Google sign-in are connected for this setup. The support agent and health library are still being built.</Text>
      </FeatureNotice>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, justifyContent: 'center', minHeight: '100%' },
  brand: { alignItems: 'center', gap: spacing.xs },
  hero: { gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderCurve: 'continuous', borderRadius: 28, boxShadow: '0 8px 24px rgba(20, 59, 103, 0.12)', gap: spacing.md, padding: spacing.lg },
});
