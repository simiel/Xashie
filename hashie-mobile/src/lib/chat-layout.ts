import type { ChatKeyboardState } from './chat-state';

export const ANDROID_NATIVE_TAB_BAR_HEIGHT = 80;

export function getChatBottomContentInset(
  platform: 'android' | 'ios',
  keyboardState: ChatKeyboardState,
  safeAreaBottom: number,
) {
  if (platform === 'ios') return keyboardState === 'closed' ? safeAreaBottom : 0;
  return ANDROID_NATIVE_TAB_BAR_HEIGHT + (keyboardState === 'closed' ? safeAreaBottom : 0);
}
