import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, surfaces, textStyles } from '@/constants/design-system';
import { Badge, Surface } from '@/components/ui';

export default function HomeScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: 'Hashie' }} />

      <View style={styles.hero}>
        <Text style={textStyles.utility}>PRIVATE HEALTH EDUCATION</Text>
        <Text style={textStyles.display} selectable>
          Welcome to Hashie
        </Text>
        <Text style={textStyles.body} selectable>
          Clear, respectful support for sexual and reproductive health questions,
          created with Ghanaian teens and young adults in mind.
        </Text>
      </View>

      <Surface style={styles.card}>
        <Badge tone="success">A SAFE PLACE TO START</Badge>
        <Text style={textStyles.heading2} selectable>
          A safe place to start
        </Text>
        <Text style={textStyles.body} selectable>
          Hashie is an educational prototype, not a doctor or emergency service.
          For urgent concerns, contact local emergency services or a qualified
          health professional.
        </Text>
      </Surface>

      <Text style={textStyles.caption} selectable>
        English and Akan/Twi support are part of Hashie’s vision.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { ...surfaces.screen, gap: spacing.lg, padding: spacing.lg },
  hero: { gap: spacing.sm, paddingTop: spacing.lg },
  card: {
    ...surfaces.cardSoft,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  footer: { color: colors.textMuted, paddingBottom: spacing.lg },
});
