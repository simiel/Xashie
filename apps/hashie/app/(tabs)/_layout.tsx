import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { colors } from '@/constants/design-system';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        headerShown: false,
        tabBarLabelStyle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 64 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabGlyph color={color} glyph="⌂" />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => (
            <TabGlyph color={color} glyph="▱" />
          ),
        }}
      />
      <Tabs.Screen name="ask" options={{ title: 'Ask', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="…" /> }} />
      <Tabs.Screen name="check-in" options={{ title: 'Check-in', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="♡" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="○" /> }} />
    </Tabs>
  );
}

function TabGlyph({ color, glyph }: { color: ColorValue; glyph: string }) {
  return <Text accessibilityElementsHidden style={{ color, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, lineHeight: 24 }}>{glyph}</Text>;
}
