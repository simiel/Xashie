import { describe, expect, it } from 'vitest';

import { ANDROID_NATIVE_TAB_BAR_HEIGHT, getChatBottomContentInset } from './chat-layout';

describe('chat layout insets', () => {
  it('reserves the Android tabs and device inset when the keyboard is closed', () => {
    expect(getChatBottomContentInset('android', 'closed', 48)).toBe(ANDROID_NATIVE_TAB_BAR_HEIGHT + 48);
  });

  it('keeps the composer directly above the tabs while the keyboard is open', () => {
    expect(getChatBottomContentInset('android', 'open', 48)).toBe(ANDROID_NATIVE_TAB_BAR_HEIGHT);
  });

  it('reserves only the iOS home-indicator inset because native tabs bound the route', () => {
    expect(getChatBottomContentInset('ios', 'closed', 34)).toBe(34);
  });
});
