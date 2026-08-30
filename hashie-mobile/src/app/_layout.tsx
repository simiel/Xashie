import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AuthProfileProvider } from '@/auth/auth-context';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthScreen, StatusMessage } from '@/components/auth-screen';

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  if (!publishableKey) {
    return <AuthScreen title="Authentication needs setup" body="Hashie cannot connect securely until its Clerk publishable key is added to this development build."><StatusMessage tone="warning">Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the local .env file, then restart the app. Do not add a Clerk secret key to the mobile app.</StatusMessage></AuthScreen>;
  }
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthProfileProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </AuthProfileProvider>
    </ClerkProvider>
  );
}
