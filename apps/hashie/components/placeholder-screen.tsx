import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors, spacing, surfaces, textStyles } from '@/constants/design-system';
import { FeatureNotice, ScreenHeader, ScreenScroll } from '@/components/hashie-ui';

export function PlaceholderScreen({ title, subtitle, children, notice }: { title: string; subtitle: string; children?: ReactNode; notice: string }) {
  return (
    <ScreenScroll contentContainerStyle={{ gap: spacing.lg }}>
      <ScreenHeader title={title} subtitle={subtitle} />
      <View style={{ ...surfaces.card, gap: spacing.md, padding: spacing.lg }}>
        <Text style={textStyles.heading1} selectable>{title}</Text>
        <Text style={textStyles.body} selectable>{notice}</Text>
        {children}
      </View>
      <FeatureNotice>
        <Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>Prototype boundary</Text>
        <Text style={textStyles.body} selectable>This screen is a clear visual shell. No health advice, scoring, AI response, audio, or external action is connected yet.</Text>
      </FeatureNotice>
    </ScreenScroll>
  );
}
