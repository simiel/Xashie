import type { AgeGroup } from '@/auth/types';
import type { SupportedLanguage } from './copy';

export type ChatSuggestion = { id: string; text: string };

const adultSuggestions: ChatSuggestion[] = [
  { id: 'stress', text: 'What are common signs of stress?' },
  { id: 'clinic', text: 'How can I prepare for a clinic visit?' },
  { id: 'menstrual', text: 'What should I know about menstrual health?' },
  { id: 'wellbeing', text: 'How can I support my wellbeing?' },
];

const youngerSuggestions: ChatSuggestion[] = [
  { id: 'worry', text: 'What can I do when I feel worried?' },
  { id: 'health-worker', text: 'How can I prepare to ask a health worker a question?' },
  { id: 'wellbeing', text: 'What helps me look after my wellbeing?' },
];

export function chatSuggestions(ageGroup: AgeGroup, language: SupportedLanguage) {
  // Akan/Twi suggestion translations require native-speaker and clinical review.
  // Keep the prompt text in English until that review is complete.
  return ageGroup === 'under_13' || ageGroup === '13_to_15' || ageGroup === '16_to_17'
    ? youngerSuggestions
    : adultSuggestions;
}

export function chatText(language: SupportedLanguage) {
  if (language === 'tw') {
    return {
      title: 'Chat support',
      subtitle: 'A private place to learn and prepare questions.',
      mockLabel: 'Connected support',
      mockBody: 'Responses come through Hashie support services and are not a diagnosis.',
      emptyTitle: 'What would you like to learn?',
      emptyBody: 'Ask a health question in your own words. Share only what feels comfortable.',
      suggestionsTitle: 'Try a prompt',
      suggestionsNote: 'Prompts are shown in English until Akan/Twi wording is reviewed.',
      composerPlaceholder: 'Write a question',
      send: 'Send question',
      stop: 'Stop response',
      newConversation: 'New conversation',
      clearTitle: 'Clear this conversation?',
      clearBody: 'This removes the messages in this local conversation. Your language and preferences stay unchanged.',
      clearConfirm: 'Clear conversation',
      cancel: 'Cancel',
      copy: 'Copy response',
      listen: 'Listen placeholder',
      listening: 'Read-aloud placeholder active',
      helpful: 'Helpful',
      notHelpful: 'Not helpful',
      retry: 'Retry response',
      cancelled: 'Incomplete response',
      typing: 'Preparing a local preview',
      safetyGuidance: 'Safety guidance',
      restored: 'Conversation restored on this device.',
      emptyHistory: 'No messages yet',
      maxLength: 'Question limit: 4,000 characters.',
    };
  }
  return {
    title: 'Chat support',
    subtitle: 'A private place to learn and prepare questions.',
    mockLabel: 'Connected support',
    mockBody: 'Responses come through Hashie support services and are not a diagnosis.',
    emptyTitle: 'What would you like to learn?',
    emptyBody: 'Ask a health question in your own words. Share only what feels comfortable.',
    suggestionsTitle: 'Try a prompt',
    suggestionsNote: 'Suggestions are general education prompts. They do not replace a qualified health professional.',
    composerPlaceholder: 'Write a question',
    send: 'Send question',
    stop: 'Stop response',
    newConversation: 'New conversation',
    clearTitle: 'Clear this conversation?',
    clearBody: 'This removes the messages in this local conversation. Your language and preferences stay unchanged.',
    clearConfirm: 'Clear conversation',
    cancel: 'Cancel',
    copy: 'Copy response',
    listen: 'Listen placeholder',
    listening: 'Read-aloud placeholder active',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    retry: 'Retry response',
    cancelled: 'Incomplete response',
    typing: 'Preparing a local preview',
    safetyGuidance: 'Safety guidance',
    restored: 'Conversation restored on this device.',
    emptyHistory: 'No messages yet',
    maxLength: 'Question limit: 4,000 characters.',
  };
}
