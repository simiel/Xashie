import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView as NativeScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthProfile } from '@/auth/auth-context';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatTypingIndicator } from '@/components/chat/chat-typing-indicator';
import { chatText } from '@/content/chat-copy';
import { useHashieChat } from '@/hooks/use-hashie-chat';
import { getChatBottomContentInset } from '@/lib/chat-layout';
import { View } from '@/ui/primitives';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { profile, sessionType, userId } = useAuthProfile();
  const text = chatText(profile.language);
  const owner = sessionType === 'account' && userId ? `account:${userId}` : null;
  const chat = useHashieChat({ owner, language: profile.language, ageGroup: profile.ageGroup });
  const bottomContentInset = getChatBottomContentInset(Platform.OS === 'android' ? 'android' : 'ios', chat.keyboardState, insets.bottom);

  const onNewConversation = useCallback(() => {
    chat.requestClear();
    Alert.alert(text.clearTitle, text.clearBody, [
      { text: text.cancel, style: 'cancel', onPress: chat.cancelClear },
      { text: text.clearConfirm, style: 'destructive', onPress: () => { void chat.confirmClear(); } },
    ], { cancelable: true, onDismiss: chat.cancelClear });
  }, [chat, text]);

  const onSend = useCallback(() => {
    if (chat.sendMessage()) Keyboard.dismiss();
  }, [chat]);

  const onSuggestion = useCallback((suggestion: string) => {
    if (chat.sendMessage(suggestion)) Keyboard.dismiss();
  }, [chat]);

  const labels = {
    copy: text.copy,
    listen: text.listen,
    listening: text.listening,
    helpful: text.helpful,
    notHelpful: text.notHelpful,
    retry: text.retry,
    cancelled: text.cancelled,
    typing: text.typing,
  };

  return (
    <>
      <Stack.Screen options={{ title: text.title }} />
      <View style={{ flex: 1, paddingBottom: Platform.OS === 'ios' ? bottomContentInset : 0 }} className="bg-slate-50 dark:bg-slate-950">
        <KeyboardAvoidingView style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? bottomContentInset : 0 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ChatHeader
          title={text.title}
          subtitle={text.subtitle}
          mockLabel={text.mockLabel}
          newConversationLabel={text.newConversation}
          disabled={chat.isHydrating || chat.showClearConfirmation}
          topInset={insets.top}
          onNewConversation={onNewConversation}
        />
        {chat.isHydrating ? (
          <View className="flex-1 items-center justify-center px-5">
            <ChatTypingIndicator label={text.restored} />
          </View>
        ) : chat.messages.length === 0 ? (
          <NativeScrollView
            style={{ flex: 1, minHeight: 0 }}
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}>
            <ChatEmptyState language={profile.language} ageGroup={profile.ageGroup} disabled={chat.isGenerating || chat.showClearConfirmation} onSuggestion={onSuggestion} />
          </NativeScrollView>
        ) : (
          <View style={{ flex: 1, minHeight: 0 }}>
            <ChatMessageList
              messages={chat.messages}
              largeText={profile.accessibility.largeText}
              voiceState={chat.voiceState}
              labels={labels}
              disabled={chat.isGenerating || chat.showClearConfirmation}
              onCopy={message => { void chat.copyMessage(message); }}
              onListen={chat.listenToMessage}
              onFeedback={chat.setFeedback}
              onRetry={() => { void chat.retryLast(); }}
            />
          </View>
        )}
        <ChatComposer
          draftText={chat.draftText}
          isGenerating={chat.isGenerating}
          isClearing={chat.showClearConfirmation}
          placeholder={text.composerPlaceholder}
          sendLabel={text.send}
          stopLabel={text.stop}
          maxLengthLabel={text.maxLength}
          onChangeText={chat.setDraftText}
          onSend={onSend}
          onStop={chat.stopGeneration}
        />
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
