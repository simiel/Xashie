import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, controls, fonts, radii, spacing, surfaces, textStyles } from '@/constants/design-system';

type SurfaceProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function Surface({ children, style }: SurfaceProps) {
  return <View style={[surfaces.card, style]}>{children}</View>;
}

type ButtonProps = PressableProps & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
};

export function Button({ children, disabled, style, variant = 'primary', ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'text' && styles.textButton,
        pressed && !disabled && styles.pressedButton,
        disabled && styles.disabledButton,
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

type TextFieldProps = TextInputProps & {
  label?: string;
};

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      {label ? <Text style={textStyles.bodyStrong}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.textField, style]}
        {...props}
      />
    </View>
  );
}

type BadgeProps = {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'urgent' | 'neutral';
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, badgeToneStyles[tone]]}>
      <Text style={[textStyles.caption, styles.badgeText]}>{children}</Text>
    </View>
  );
}

type MessageBubbleProps = {
  children: ReactNode;
  fromUser?: boolean;
};

export function MessageBubble({ children, fromUser = false }: MessageBubbleProps) {
  return (
    <View style={[styles.messageBubble, fromUser ? styles.userMessage : styles.assistantMessage]}>
      <Text style={[textStyles.body, fromUser && styles.userMessageText]} selectable>
        {children}
      </Text>
    </View>
  );
}

type ChoiceProps = PressableProps & {
  children: ReactNode;
  selected?: boolean;
};

export function Choice({ children, selected = false, style, ...props }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.selectedChoice,
        pressed && styles.choicePressed,
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
      {...props}
    >
      <Text style={[textStyles.bodyStrong, selected && styles.selectedChoiceText]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: controls.buttonHeight,
    paddingHorizontal: spacing.lg,
  },
  primaryButton: { backgroundColor: colors.accent },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.textPrimary, borderWidth: 1 },
  textButton: { minHeight: controls.minTouchTarget, paddingHorizontal: spacing.sm },
  pressedButton: { opacity: 0.82 },
  disabledButton: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  fieldGroup: { gap: spacing.xs },
  textField: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: controls.inputHeight,
    paddingHorizontal: spacing.md,
  },
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  badgeText: { color: colors.textPrimary },
  messageBubble: { borderCurve: 'continuous', borderRadius: radii.md, maxWidth: '88%', padding: spacing.md },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  userMessage: { alignSelf: 'flex-end', backgroundColor: colors.textPrimary },
  userMessageText: { color: colors.surface },
  choice: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: controls.minTouchTarget,
    padding: spacing.md,
  },
  selectedChoice: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  selectedChoiceText: { color: colors.textPrimary },
  choicePressed: { opacity: 0.82 },
});

const badgeToneStyles = {
  success: { backgroundColor: colors.success },
  warning: { backgroundColor: colors.warning },
  urgent: { backgroundColor: colors.urgentSoft },
  neutral: { backgroundColor: colors.surfaceSubtle },
} as const;
