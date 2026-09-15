import { Stack } from 'expo-router';
import { Text } from 'react-native';

import { ChoiceCard, FeatureNotice } from '@/components/hashie-ui';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { textStyles } from '@/constants/design-system';

const exampleChoices = ['Worried', 'Scared', 'Confused', 'Calm but looking for information'];

export default function CheckInScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Check-in' }} />
      <PlaceholderScreen title="Check in" subtitle="A gentle moment for you" notice="This space is prepared for a future check-in flow. Nothing is scored, classified, or sent anywhere in this prototype.">
        {exampleChoices.map((choice) => <ChoiceCard key={choice} disabled accessibilityLabel={`${choice}, preview only`}><Text style={textStyles.bodyStrong} selectable>{choice}</Text></ChoiceCard>)}
        <FeatureNotice tone="blue">
          <Text style={textStyles.body} selectable>You can skip a check-in at any time. Future support should guide you toward qualified human care when appropriate.</Text>
        </FeatureNotice>
      </PlaceholderScreen>
    </>
  );
}
