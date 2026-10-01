import { View } from 'react-native';
import { SignIn } from '@clerk/expo/web';

import { colors, spacing } from '@/constants/design-system';

export default function WebSignInScreen() {
  return (
    <View style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg }}>
      <SignIn fallbackRedirectUrl="/onboarding/access" />
    </View>
  );
}
