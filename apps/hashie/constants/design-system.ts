import { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#EAF5FF',
  surface: '#FFFFFF',
  surfaceSubtle: '#CFE7FF',
  textPrimary: '#143B67',
  textSecondary: '#416181',
  textMuted: '#6F8AA3',
  accent: '#FFC43D',
  accentPressed: '#E5A916',
  accentSoft: '#FFF2C9',
  success: '#D8F3EA',
  successText: '#176B5D',
  warning: '#FFF2C9',
  warningText: '#805E00',
  urgent: '#B42318',
  urgentSoft: '#FDE7E5',
  border: '#B9D8F2',
  focus: '#2D7BD0',
  disabled: '#E5EBF0',
} as const;

export const fonts = {
  body: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
  utility: 'SpaceMono',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const controls = {
  minTouchTarget: 44,
  inputHeight: 52,
  buttonHeight: 52,
} as const;

export const elevation = {
  card: '0 2px 8px rgba(20, 59, 103, 0.08)',
  raised: '0 8px 24px rgba(20, 59, 103, 0.12)',
} as const;

export const textStyles = {
  display: {
    color: colors.textPrimary,
    fontFamily: fonts.extraBold,
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -0.8,
  } satisfies TextStyle,
  heading1: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
  } satisfies TextStyle,
  heading2: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 29,
  } satisfies TextStyle,
  body: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  bodyStrong: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  caption: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  } satisfies TextStyle,
  utility: {
    color: colors.textSecondary,
    fontFamily: fonts.utility,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;

export const surfaces = {
  screen: {
    backgroundColor: colors.background,
  } satisfies ViewStyle,
  card: {
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: radii.md,
    boxShadow: elevation.card,
  } satisfies ViewStyle,
  cardSoft: {
    backgroundColor: colors.success,
    borderCurve: 'continuous',
    borderRadius: radii.md,
  } satisfies ViewStyle,
} as const;
