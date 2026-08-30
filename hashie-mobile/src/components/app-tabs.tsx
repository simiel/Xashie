import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { useAuthProfile } from '@/auth/auth-context';
import { copy } from '@/content/copy';
import { chatText } from '@/content/chat-copy';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { profile } = useAuthProfile();
  const text = copy[profile.language];
  const chatLabel = chatText(profile.language).title;
  const selectedIndicator = scheme === 'dark' ? '#164E63' : '#E0F2FE';

  return (
    <NativeTabs
      backgroundColor={colors.background}
      blurEffect="systemMaterial"
      iconColor={{ default: colors.textSecondary, selected: colors.text }}
      indicatorColor={selectedIndicator}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>{text.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home_filled' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{chatLabel}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} md={{ default: 'chat_bubble_outline', selected: 'chat_bubble' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn">
        <NativeTabs.Trigger.Label>{text.learn}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md={{ default: 'menu_book', selected: 'menu_book' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="support">
        <NativeTabs.Trigger.Label>{text.support}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md={{ default: 'favorite_border', selected: 'favorite' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{text.settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md={{ default: 'settings', selected: 'settings' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
