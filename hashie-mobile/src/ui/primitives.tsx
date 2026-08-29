import { useCssElement } from 'react-native-css';
import type React from 'react';
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';

type WithClassName = { className?: string };
type CssElement = (
  component: React.ElementType,
  props: object,
  mapping: Record<string, string>,
) => React.ReactElement;

const renderCssElement = useCssElement as unknown as CssElement;

export function View(props: React.ComponentProps<typeof RNView> & WithClassName) {
  return renderCssElement(RNView, props, { className: 'style' });
}

export function Text(props: React.ComponentProps<typeof RNText> & WithClassName) {
  return renderCssElement(RNText, props, { className: 'style' });
}

export function Pressable(props: React.ComponentProps<typeof RNPressable> & WithClassName) {
  return renderCssElement(RNPressable, props, { className: 'style' });
}

export function TextInput(props: React.ComponentProps<typeof RNTextInput> & WithClassName) {
  return renderCssElement(RNTextInput, props, { className: 'style' });
}

export function ScrollView(
  props: React.ComponentProps<typeof RNScrollView> &
    WithClassName & { contentContainerClassName?: string },
) {
  return renderCssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
}
