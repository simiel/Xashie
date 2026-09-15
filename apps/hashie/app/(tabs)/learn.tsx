import { Stack } from 'expo-router';
import { Text } from 'react-native';

import { FeatureNotice } from '@/components/hashie-ui';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { colors, textStyles } from '@/constants/design-system';

export default function LearnScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Learn' }} />
      <PlaceholderScreen title="Learn" subtitle="Explore health topics" notice="Approved health topics will appear here when the reviewed knowledge library is connected.">
        <FeatureNotice tone="blue">
          <Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} selectable>Clear, respectful learning</Text>
          <Text style={textStyles.body} selectable>This prototype keeps the library shell visible without inventing health content or presenting unreviewed advice.</Text>
        </FeatureNotice>
      </PlaceholderScreen>
    </>
  );
}
