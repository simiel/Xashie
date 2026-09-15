import { ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, controls, fonts, radii, spacing, surfaces, textStyles } from '@/constants/design-system';

const logo = require('@/assets/images/hashie-logo-primary.png');

export function HashieLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      accessibilityLabel="Hashie"
      accessible
      resizeMode="contain"
      source={logo}
      style={compact ? styles.compactLogo : styles.logo}
    />
  );
}

export function ScreenScroll({ children, contentContainerStyle }: { children: ReactNode; contentContainerStyle?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.decorations}>
        <View style={[styles.orb, styles.orbTop]} />
        <View style={[styles.orb, styles.orbBottom]} />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          contentContainerStyle,
          { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function PrivacyPill({ children = 'Private for this session' }: { children?: ReactNode }) {
  return (
    <View accessibilityLabel={`${children}`} accessibilityRole="text" style={styles.privacyPill}>
      <Text style={styles.lock} selectable>⌕</Text>
      <Text style={styles.privacyText} selectable>{children}</Text>
    </View>
  );
}

export function ProgressSteps({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`Onboarding step ${step} of ${total}`} accessibilityValue={{ min: 1, max: total, now: step }} style={styles.progressWrap}>
      <Text style={textStyles.bodyStrong} selectable>Step {step} of {total}</Text>
      <View style={styles.progressRow}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.progressSegment, index < step && styles.progressSegmentActive]} />
        ))}
      </View>
    </View>
  );
}

type ActionButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

export function ActionButton({ children, onPress, variant = 'primary', disabled = false, testID, accessibilityLabel }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'text' && styles.textButton,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.actionButtonText, variant === 'text' && styles.textButtonText, disabled && styles.disabledText]}>{children}</Text>
    </Pressable>
  );
}

type ChoiceCardProps = {
  children: ReactNode;
  selected?: boolean;
  multi?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export function ChoiceCard({ children, selected = false, multi = false, onPress, accessibilityLabel, accessibilityHint, testID, disabled = false, style }: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.choiceCard,
        selected && styles.choiceCardSelected,
        pressed && !disabled && styles.pressed,
        disabled && styles.choiceCardDisabled,
        style,
      ]}
    >
      <View style={styles.choiceContent}>{children}</View>
      <View accessibilityLabel={selected ? 'Selected' : 'Not selected'} style={styles.selectionMarkColumn}>
        <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
          <Text style={[styles.selectionMarkText, selected && styles.selectionMarkTextSelected]}>{selected ? '✓' : ''}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function TextField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={textStyles.bodyStrong} selectable>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="words"
        placeholderTextColor={colors.textMuted}
        style={[styles.textField, error && styles.textFieldError]}
        {...props}
      />
      {error ? <Text accessibilityRole="alert" style={styles.errorText} selectable>{error}</Text> : null}
    </View>
  );
}

export function SectionHeading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <View style={styles.headingGroup}>
      {eyebrow ? <Text style={textStyles.utility} selectable>{eyebrow}</Text> : null}
      <Text style={textStyles.heading1} selectable>{title}</Text>
      {body ? <Text style={textStyles.body} selectable>{body}</Text> : null}
    </View>
  );
}

export function FeatureNotice({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'blue' | 'urgent' }) {
  return <View style={[styles.featureNotice, tone === 'blue' && styles.featureNoticeBlue, tone === 'urgent' && styles.featureNoticeUrgent]}>{children}</View>;
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.screenHeader}>
      <HashieLogo compact />
      <View style={styles.screenHeaderText}>
        <Text style={textStyles.heading2} selectable>{title}</Text>
        {subtitle ? <Text style={textStyles.caption} selectable>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function NavigationCard({ title, body, symbol, tone, onPress, testID }: { title: string; body: string; symbol: string; tone: 'gold' | 'mint' | 'blue'; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      accessibilityHint={`Opens ${title}`}
      accessibilityLabel={`${title}. ${body}`}
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.navigationCard, pressed && styles.pressed]}
    >
      <View style={[styles.navigationSymbol, tone === 'gold' && styles.navigationSymbolGold, tone === 'mint' && styles.navigationSymbolMint, tone === 'blue' && styles.navigationSymbolBlue]}>
        <Text style={styles.navigationSymbolText}>{symbol}</Text>
      </View>
      <View style={styles.navigationCardCopy}>
        <Text style={textStyles.heading2} selectable>{title}</Text>
        <Text style={textStyles.body} selectable>{body}</Text>
      </View>
      <Text style={styles.navigationArrow} accessibilityElementsHidden>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { ...surfaces.screen, flex: 1 },
  decorations: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  orb: { borderRadius: 999, opacity: 0.5, position: 'absolute' },
  orbTop: { backgroundColor: colors.surfaceSubtle, height: 260, right: -110, top: -100, width: 260 },
  orbBottom: { backgroundColor: colors.success, bottom: -150, height: 320, left: -160, width: 320 },
  scrollContent: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  logo: { height: 80, width: 214 },
  compactLogo: { height: 45, width: 120 },
  privacyPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.surfaceSubtle, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, minHeight: controls.minTouchTarget, paddingHorizontal: spacing.md },
  lock: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20 },
  privacyText: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 13 },
  progressWrap: { alignItems: 'center', gap: spacing.sm },
  progressRow: { flexDirection: 'row', gap: spacing.xs, width: '100%' },
  progressSegment: { backgroundColor: colors.surfaceSubtle, borderRadius: radii.pill, flex: 1, height: 8 },
  progressSegmentActive: { backgroundColor: colors.accent },
  actionButton: { alignItems: 'center', borderCurve: 'continuous', borderRadius: radii.pill, justifyContent: 'center', minHeight: controls.buttonHeight, paddingHorizontal: spacing.lg },
  primaryButton: { backgroundColor: colors.accent },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  textButton: { minHeight: controls.minTouchTarget, paddingHorizontal: spacing.sm },
  actionButtonText: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 16 },
  textButtonText: { color: colors.focus, textDecorationLine: 'underline' },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  disabledText: { color: colors.textMuted },
  pressed: { opacity: 0.78 },
  choiceCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderCurve: 'continuous', borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 72, padding: spacing.md },
  choiceCardSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 2 },
  choiceCardDisabled: { opacity: 0.6 },
  choiceContent: { flex: 1, gap: spacing.xs, minWidth: 0 },
  selectionMarkColumn: { alignItems: 'center', flexShrink: 0, justifyContent: 'center', minWidth: controls.minTouchTarget, width: controls.minTouchTarget },
  selectionMark: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.pill, borderWidth: 2, height: 30, justifyContent: 'center', width: 30 },
  selectionMarkSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectionMarkText: { color: 'transparent', fontFamily: fonts.bold, fontSize: 17 },
  selectionMarkTextSelected: { color: colors.textPrimary },
  fieldGroup: { gap: spacing.xs },
  textField: { backgroundColor: colors.surface, borderColor: colors.border, borderCurve: 'continuous', borderRadius: radii.sm, borderWidth: 1, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 16, minHeight: controls.inputHeight, paddingHorizontal: spacing.md },
  textFieldError: { borderColor: colors.urgent },
  errorText: { color: colors.urgent, fontFamily: fonts.medium, fontSize: 13 },
  headingGroup: { gap: spacing.sm },
  featureNotice: { backgroundColor: colors.success, borderRadius: radii.md, gap: spacing.xs, padding: spacing.md },
  featureNoticeBlue: { backgroundColor: colors.surfaceSubtle },
  featureNoticeUrgent: { backgroundColor: colors.urgentSoft },
  screenHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  screenHeaderText: { flex: 1, gap: spacing.xxs },
  navigationCard: { alignItems: 'center', backgroundColor: colors.surface, borderCurve: 'continuous', borderRadius: radii.lg, boxShadow: '0 2px 8px rgba(20, 59, 103, 0.08)', flexDirection: 'row', gap: spacing.md, minHeight: 112, padding: spacing.md },
  navigationSymbol: { alignItems: 'center', borderRadius: radii.pill, height: 64, justifyContent: 'center', width: 64 },
  navigationSymbolGold: { backgroundColor: colors.accentSoft },
  navigationSymbolMint: { backgroundColor: colors.success },
  navigationSymbolBlue: { backgroundColor: colors.surfaceSubtle },
  navigationSymbolText: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 29 },
  navigationCardCopy: { flex: 1, gap: spacing.xxs },
  navigationArrow: { color: colors.focus, fontFamily: fonts.body, fontSize: 36, lineHeight: 38 },
});
