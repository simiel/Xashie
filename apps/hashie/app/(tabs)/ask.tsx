import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HashieLogo, PrivacyPill } from '@/components/hashie-ui';
import { useOnboarding } from '@/components/onboarding-provider';
import { type SupportMessage, useSupportChat } from '@/components/support-chat-provider';
import { colors, controls, fonts, radii, spacing, textStyles } from '@/constants/design-system';

const starterQuestions = ['What happens during puberty?', 'How can I ask for help?', 'What changes are normal?'];

function MessageBubble({ item, largerText, higherContrast }: { item: SupportMessage; largerText: boolean; higherContrast: boolean }) {
  const isUser = item.role === 'user';
  const isStreaming = item.status === 'streaming';
  return (
    <View accessibilityLabel={isUser ? `You said: ${item.content}` : `Hashie says: ${item.content || 'Writing a reply'}`} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
      {!isUser ? <Text style={[textStyles.caption, { marginBottom: spacing.xxs, paddingHorizontal: spacing.xs }]}>Hashie</Text> : null}
      <View style={{ backgroundColor: isUser ? colors.success : colors.surface, borderColor: isUser ? colors.successText : colors.border, borderRadius: radii.md, borderTopLeftRadius: isUser ? radii.md : 8, borderTopRightRadius: isUser ? 8 : radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        {isStreaming && !item.content ? <ActivityIndicator accessibilityLabel="Hashie is writing a reply" color={colors.focus} /> : null}
        {item.content ? <Text selectable style={[textStyles.body, { color: colors.textPrimary, fontSize: largerText ? 18 : 16, lineHeight: largerText ? 28 : 24 }]}>{item.content}</Text> : null}
      </View>
      {item.status === 'stopped' ? <Text style={[textStyles.caption, { marginTop: spacing.xxs, paddingHorizontal: spacing.xs }]}>Reply stopped</Text> : null}
      {item.status === 'failed' ? <Text accessibilityRole="alert" style={[textStyles.caption, { color: higherContrast ? colors.textPrimary : colors.urgent, marginTop: spacing.xxs, paddingHorizontal: spacing.xs }]}>Reply incomplete — you can retry.</Text> : null}
    </View>
  );
}

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<SupportMessage>>(null);
  const [draft, setDraft] = useState('');
  const { clearError, error, isSending, messages, retry, send, stop } = useSupportChat();
  const { state } = useOnboarding();
  const largerText = state.accessibilityPreferences.includes('larger-text');
  const higherContrast = state.accessibilityPreferences.includes('higher-contrast');
  const canSend = draft.trim().length >= 2 && !isSending;

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: messages.length > 1 }), 60);
    return () => clearTimeout(timer);
  }, [messages]);

  const submit = async () => {
    if (!canSend) return;
    const message = draft;
    setDraft('');
    const completed = await send(message);
    if (!completed) setDraft(message);
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ backgroundColor: higherContrast ? colors.surface : colors.background, flex: 1 }}>
      <Stack.Screen options={{ title: 'Ask Hashie' }} />
      <View style={{ backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: Math.max(insets.top, spacing.sm) }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
          <HashieLogo compact />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={textStyles.heading2}>Ask Hashie</Text>
            <Text style={textStyles.caption}>English text support</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.sm }}><PrivacyPill>Private session</PrivacyPill></View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble item={item} largerText={largerText} higherContrast={higherContrast} />}
        contentContainerStyle={{ flexGrow: 1, gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg }}>
            <Text style={textStyles.heading2}>A private place to ask</Text>
            <Text selectable style={[textStyles.body, largerText && { fontSize: 18, lineHeight: 28 }]}>Ask a health question in your own words. Hashie gives educational support, not a diagnosis or emergency care.</Text>
            <Text selectable style={[textStyles.caption, largerText && { fontSize: 15, lineHeight: 22 }]}>Avoid sharing names, phone numbers, addresses, or other identifying details. Messages are sent to Hashie’s model service, which may retain them.</Text>
          </View>
          <View accessibilityLabel="Suggested questions" style={{ gap: spacing.xs }}>
            {starterQuestions.map((question) => <Pressable key={question} accessibilityHint="Places this question in the message box" accessibilityLabel={question} accessibilityRole="button" onPress={() => setDraft(question)} style={({ pressed }) => ({ backgroundColor: colors.surfaceSubtle, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, minHeight: controls.minTouchTarget, opacity: pressed ? 0.78 : 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm })}>
              <Text style={[textStyles.bodyStrong, { color: colors.textPrimary }, largerText && { fontSize: 18, lineHeight: 28 }]}>{question}</Text>
            </Pressable>)}
          </View>
        </View>}
      />

      <View style={{ backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.xs, paddingBottom: Math.max(insets.bottom, spacing.sm), paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        {error ? <View accessibilityRole="alert" style={{ alignItems: 'center', backgroundColor: colors.urgentSoft, borderRadius: radii.sm, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm }}>
          <Text style={[textStyles.caption, { color: higherContrast ? colors.textPrimary : colors.urgent, flex: 1 }, largerText && { fontSize: 15, lineHeight: 22 }]}>{error}</Text>
          <Pressable accessibilityLabel="Retry last question" accessibilityRole="button" onPress={retry} style={({ pressed }) => ({ minHeight: controls.minTouchTarget, justifyContent: 'center', opacity: pressed ? 0.72 : 1, paddingHorizontal: spacing.xs })}><Text style={[textStyles.bodyStrong, { color: colors.focus }]}>Retry</Text></Pressable>
          <Pressable accessibilityLabel="Dismiss error" accessibilityRole="button" onPress={clearError} style={({ pressed }) => ({ minHeight: controls.minTouchTarget, justifyContent: 'center', opacity: pressed ? 0.72 : 1, paddingHorizontal: spacing.xs })}><Text style={[textStyles.bodyStrong, { color: colors.focus }]}>Close</Text></Pressable>
        </View> : null}
        <View style={{ alignItems: 'flex-end', backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, minHeight: controls.inputHeight, padding: spacing.xs }}>
          <TextInput accessibilityHint="Your question is sent to Hashie’s model service when you choose Send" accessibilityLabel="Your health question" autoCapitalize="sentences" maxLength={1200} multiline onChangeText={setDraft} placeholder="Type your question…" placeholderTextColor={colors.textMuted} style={{ color: colors.textPrimary, flex: 1, fontFamily: fonts.body, fontSize: largerText ? 18 : 16, lineHeight: largerText ? 28 : 23, maxHeight: 120, minHeight: 40, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }} value={draft} />
          {isSending ? <Pressable accessibilityLabel="Stop generating reply" accessibilityRole="button" onPress={stop} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: colors.urgentSoft, borderRadius: radii.pill, justifyContent: 'center', minHeight: controls.minTouchTarget, opacity: pressed ? 0.72 : 1, width: controls.minTouchTarget })}><Text style={{ color: colors.urgent, fontFamily: fonts.bold, fontSize: 16 }}>■</Text></Pressable> : <Pressable accessibilityLabel="Send question" accessibilityRole="button" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={submit} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: canSend ? colors.accent : colors.disabled, borderRadius: radii.pill, justifyContent: 'center', minHeight: controls.minTouchTarget, opacity: pressed ? 0.72 : 1, width: controls.minTouchTarget })}><Text style={{ color: canSend ? colors.textPrimary : colors.textMuted, fontFamily: fonts.bold, fontSize: 18 }}>↑</Text></Pressable>}
        </View>
        <Text selectable style={[textStyles.caption, { color: higherContrast ? colors.textPrimary : colors.textMuted, paddingHorizontal: spacing.xs }, largerText && { fontSize: 15, lineHeight: 22 }]}>Responses are educational. If someone may be in immediate danger, contact local emergency services or a trusted adult now.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
