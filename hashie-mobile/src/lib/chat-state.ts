import type { AgeGroup } from '@/auth/types';
import type { SupportedLanguage } from '@/content/copy';

export type ChatRole = 'user' | 'assistant';
export type ChatMessageStatus = 'sending' | 'streaming' | 'complete' | 'failed' | 'cancelled';
export type MessageFeedback = 'helpful' | 'not_helpful';
export type ChatVoiceState = 'idle' | 'reading';
export type ChatKeyboardState = 'closed' | 'open';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  status: ChatMessageStatus;
  language: SupportedLanguage;
  isMock: boolean;
  serverId?: string;
  safetyEscalated?: boolean;
  feedback?: MessageFeedback;
};

export type FailedMessage = {
  userMessageId: string;
  assistantMessageId: string;
  text: string;
  language: SupportedLanguage;
  ageGroup: AgeGroup;
};

export type ChatState = {
  messages: ChatMessage[];
  draftText: string;
  isGenerating: boolean;
  isStreaming: boolean;
  generationError: string | null;
  generationErrorCode: 'timeout' | 'disconnected' | 'safety' | 'session' | 'offline' | 'unavailable' | null;
  activeMessageId: string | null;
  lastFailedMessage: FailedMessage | null;
  selectedLanguage: SupportedLanguage;
  ageGroup: AgeGroup;
  voiceState: ChatVoiceState;
  feedbackByMessageId: Record<string, MessageFeedback>;
  showClearConfirmation: boolean;
  keyboardState: ChatKeyboardState;
};

export const initialChatState = (selectedLanguage: SupportedLanguage, ageGroup: AgeGroup): ChatState => ({
  messages: [],
  draftText: '',
  isGenerating: false,
  isStreaming: false,
  generationError: null,
  generationErrorCode: null,
  activeMessageId: null,
  lastFailedMessage: null,
  selectedLanguage,
  ageGroup,
  voiceState: 'idle',
  feedbackByMessageId: {},
  showClearConfirmation: false,
  keyboardState: 'closed',
});

export type ChatAction =
  | { type: 'set_draft'; text: string }
  | { type: 'set_context'; language: SupportedLanguage; ageGroup: AgeGroup }
  | { type: 'restore'; messages: ChatMessage[] }
  | { type: 'add_message_pair'; userMessage: ChatMessage; assistantMessage: ChatMessage }
  | { type: 'begin_generation'; assistantMessageId: string }
  | { type: 'append_assistant_text'; assistantMessageId: string; text: string }
  | { type: 'set_server_message_id'; assistantMessageId: string; serverId: string }
  | { type: 'mark_safety_escalation'; assistantMessageId: string }
  | { type: 'complete_generation'; assistantMessageId: string }
  | { type: 'cancel_generation'; assistantMessageId: string; notice: string }
  | { type: 'fail_generation'; failedMessage: FailedMessage; message: string }
  | { type: 'fail_generation_with_code'; failedMessage: FailedMessage; message: string; code: ChatState['generationErrorCode'] }
  | { type: 'retry_generation'; assistantMessageId: string }
  | { type: 'set_feedback'; messageId: string; feedback: MessageFeedback }
  | { type: 'set_voice_state'; voiceState: ChatVoiceState }
  | { type: 'set_clear_confirmation'; value: boolean }
  | { type: 'clear' }
  | { type: 'set_keyboard'; value: ChatKeyboardState };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'set_draft':
      return { ...state, draftText: action.text };
    case 'set_context':
      return { ...state, selectedLanguage: action.language, ageGroup: action.ageGroup };
    case 'restore':
      return {
        ...state,
        messages: action.messages,
        feedbackByMessageId: Object.fromEntries(
          action.messages.filter(message => message.feedback).map(message => [message.id, message.feedback as MessageFeedback]),
        ),
      };
    case 'add_message_pair':
      return {
        ...state,
        messages: [...state.messages, action.userMessage, action.assistantMessage],
        draftText: '',
        generationError: null,
        generationErrorCode: null,
        lastFailedMessage: null,
        activeMessageId: action.assistantMessage.id,
      };
    case 'begin_generation':
      return {
        ...state,
        isGenerating: true,
        isStreaming: true,
        generationError: null,
        generationErrorCode: null,
        activeMessageId: action.assistantMessageId,
        messages: state.messages.map(message =>
          message.id === action.assistantMessageId
            ? { ...message, status: 'streaming', text: '' }
            : message,
        ),
      };
    case 'append_assistant_text':
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.assistantMessageId
            ? { ...message, status: 'streaming', text: action.text }
            : message,
        ),
      };
    case 'complete_generation':
      return {
        ...state,
        isGenerating: false,
        isStreaming: false,
        activeMessageId: null,
        lastFailedMessage: null,
        generationErrorCode: null,
        messages: state.messages.map(message =>
          message.id === action.assistantMessageId ? { ...message, status: 'complete' } : message,
        ),
      };
    case 'cancel_generation':
      return {
        ...state,
        isGenerating: false,
        isStreaming: false,
        activeMessageId: null,
        generationError: null,
        generationErrorCode: null,
        messages: state.messages.map(message =>
          message.id === action.assistantMessageId
            ? { ...message, status: 'cancelled', text: message.text || action.notice }
            : message,
        ),
      };
    case 'fail_generation':
      return {
        ...state,
        isGenerating: false,
        isStreaming: false,
        activeMessageId: null,
        generationError: action.message,
        generationErrorCode: 'unavailable',
        lastFailedMessage: action.failedMessage,
        messages: state.messages.map(message =>
          message.id === action.failedMessage.assistantMessageId
            ? { ...message, status: 'failed', text: action.message }
            : message,
        ),
      };
    case 'fail_generation_with_code':
      return {
        ...state,
        isGenerating: false,
        isStreaming: false,
        activeMessageId: null,
        generationError: action.message,
        generationErrorCode: action.code,
        lastFailedMessage: action.failedMessage,
        messages: state.messages.map(message => message.id === action.failedMessage.assistantMessageId ? { ...message, status: 'failed', text: action.message } : message),
      };
    case 'retry_generation':
      return {
        ...state,
        isGenerating: true,
        isStreaming: true,
        generationError: null,
        generationErrorCode: null,
        activeMessageId: action.assistantMessageId,
        messages: state.messages.map(message =>
          message.id === action.assistantMessageId ? { ...message, status: 'streaming', text: '' } : message,
        ),
      };
    case 'set_feedback':
      return {
        ...state,
        feedbackByMessageId: { ...state.feedbackByMessageId, [action.messageId]: action.feedback },
        messages: state.messages.map(message =>
          message.id === action.messageId ? { ...message, feedback: action.feedback } : message,
        ),
      };
    case 'set_server_message_id':
      return { ...state, messages: state.messages.map(message => message.id === action.assistantMessageId ? { ...message, serverId: action.serverId } : message) };
    case 'mark_safety_escalation':
      return { ...state, messages: state.messages.map(message => message.id === action.assistantMessageId ? { ...message, safetyEscalated: true } : message) };
    case 'set_voice_state':
      return { ...state, voiceState: action.voiceState };
    case 'set_clear_confirmation':
      return { ...state, showClearConfirmation: action.value };
    case 'clear':
      return {
        ...initialChatState(state.selectedLanguage, state.ageGroup),
        keyboardState: state.keyboardState,
      };
    case 'set_keyboard':
      return { ...state, keyboardState: action.value };
    default:
      return state;
  }
}

export function createChatMessage(
  role: ChatRole,
  text: string,
  language: SupportedLanguage,
  status: ChatMessageStatus,
  isMock: boolean,
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
    status,
    language,
    isMock,
  };
}
