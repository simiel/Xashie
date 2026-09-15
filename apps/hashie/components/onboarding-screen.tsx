import { ReactNode } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionButton, HashieLogo, ProgressSteps, ScreenScroll } from '@/components/hashie-ui';
import { colors, spacing, textStyles } from '@/constants/design-system';

export function OnboardingScreen({ step, title, body, children, onContinue, continueLabel = 'Continue', onSkip, skipLabel = 'Skip for now', canContinue = true, testID, hideNavigation = false }: { step: number; title: string; body: string; children: ReactNode; onContinue: () => void; continueLabel?: string; onSkip?: () => void; skipLabel?: string; canContinue?: boolean; testID?: string; hideNavigation?: boolean }) {
  return (
    <ScreenScroll contentContainerStyle={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}><HashieLogo compact /><ProgressSteps step={step} /></View>
      <View style={{ backgroundColor: colors.surface, borderCurve: 'continuous', borderRadius: 28, boxShadow: '0 2px 8px rgba(20, 59, 103, 0.08)', gap: spacing.lg, padding: spacing.lg }}>
        <View style={{ gap: spacing.sm }}><Text style={textStyles.heading1} selectable>{title}</Text><Text style={textStyles.body} selectable>{body}</Text></View>
        {children}
        {!hideNavigation ? <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <ActionButton onPress={() => router.back()} variant="secondary" accessibilityLabel="Go back">←  Back</ActionButton>
          <View style={{ flex: 1 }}><ActionButton onPress={onContinue} disabled={!canContinue} testID={testID} accessibilityLabel={continueLabel}>{continueLabel}  →</ActionButton></View>
        </View> : null}
        {onSkip ? <ActionButton onPress={onSkip} variant="text" accessibilityLabel={skipLabel}>{skipLabel}</ActionButton> : null}
      </View>
    </ScreenScroll>
  );
}
