import { Stack } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { FeatureNotice } from '@/components/hashie-ui';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { colors, controls, fonts, radii, spacing, textStyles } from '@/constants/design-system';

export default function AskScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ask Hashie' }} />
      <PlaceholderScreen title="Ask Hashie" subtitle="Private support and education" notice="Hashie will help you find clear, grounded information when the reviewed support agent is connected.">
        <View style={{ backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, gap: spacing.sm, padding: spacing.md }}>
          <Text style={textStyles.heading2} selectable>You’re not alone</Text>
          <Text style={textStyles.body} selectable>This preview does not send a question or generate an AI response yet.</Text>
        </View>
        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: controls.inputHeight, padding: spacing.xs }}>
          <TextInput accessibilityLabel="Question composer, not connected" editable={false} placeholder="Type your question…" placeholderTextColor={colors.textMuted} style={{ color: colors.textMuted, flex: 1, fontFamily: fonts.body, fontSize: 16, paddingHorizontal: spacing.sm }} />
          <Pressable accessibilityLabel="Send, not connected" accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={{ alignItems: 'center', backgroundColor: colors.disabled, borderRadius: radii.pill, justifyContent: 'center', width: 52 }}><Text style={{ color: colors.textMuted, fontSize: 22 }}>➤</Text></Pressable>
        </View>
        <FeatureNotice>
          <Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>Reviewed information will come first</Text>
          <Text style={textStyles.body} selectable>Future responses should be clear about uncertainty and when professional care matters.</Text>
        </FeatureNotice>
      </PlaceholderScreen>
    </>
  );
}
