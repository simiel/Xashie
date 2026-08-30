import type { AgeGroup } from '@/auth/types';
import type { SupportedLanguage } from '@/content/copy';

export const MOCK_FAILURE_TOKEN = '__hashie_mock_failure__';

export type MockResponseCategory = 'greeting' | 'general_health' | 'sexual_health' | 'mental_wellbeing' | 'emergency' | 'unknown' | 'akan';

export type MockResponseInput = {
  text: string;
  language: SupportedLanguage;
  ageGroup: AgeGroup;
};

export type MockResponse = {
  text: string;
  category: MockResponseCategory;
};

export class MockResponderError extends Error {
  constructor(message = 'The local mock responder failed.') {
    super(message);
    this.name = 'MockResponderError';
  }
}

export class MockResponderCancelledError extends Error {
  constructor() {
    super('The local mock response was cancelled.');
    this.name = 'MockResponderCancelledError';
  }
}

function isAbortError(error: unknown): error is MockResponderCancelledError {
  return error instanceof MockResponderCancelledError;
}

function responseForCategory(category: MockResponseCategory, language: SupportedLanguage, ageGroup: AgeGroup): string {
  if (language === 'tw') {
    return 'Metumi aboa wo ama woasua ho asɛm. Ebia ebehia sɛ woka nsɛm kakra ka ho na ama matumi ama wo akwankyerɛ a ɛfata. Sɛ wowɔ yaw kɛse, home a ɛyɛ den, mogya pii, anaa wote nka sɛ wowɔ asiane mu ntɛm a, hwehwɛ mmoa fi akwahosan ho ɔbenfo anaa ɔhaw bere mu ɔsom.\n\nEyi yɛ mock mmuae a ɛwɔ saa app yi mu; ɛnyɛ ayaresa anaa oduruyɛfo afotu. Sɛ asɛm no yɛ w’adwene, wo nkwa, anaa wo ahobammɔ ho a, bisa ɔbenfo a wugye no di.';
  }

  const younger = ageGroup === 'under_13' || ageGroup === '13_to_15' || ageGroup === '16_to_17';
  const ageNote = younger
    ? 'Because you may be under 18, consider speaking with a trusted adult or qualified health professional who can support you safely.'
    : 'A qualified health professional can help with personal concerns or questions that need an individual assessment.';

  switch (category) {
    case 'greeting':
      return `Hello. I can help you learn about health in a calm, respectful way. ${ageNote}\n\nThis is a local mock response for the mobile experience, not medical advice.`;
    case 'mental_wellbeing':
      return `It is okay to ask for support when stress, worry, or low mood feels difficult to manage. You could try a quiet pause, slow breathing, or talking with someone you trust. If you may hurt yourself or feel unsafe, seek urgent human help now.\n\n${ageNote}\n\nThis is a local mock response for the mobile experience, not a diagnosis.`;
    case 'sexual_health':
      return `I can share general, respectful health education, but personal sexual-health questions are best discussed privately with a qualified health professional. You do not need to feel ashamed. Do not share private images or details with someone who pressures you.\n\n${ageNote}\n\nThis is a local mock response for the mobile experience, not a diagnosis or prescription.`;
    case 'emergency':
      return 'Severe pain, difficulty breathing, heavy bleeding, loss of consciousness, or immediate danger needs urgent human help. Contact local emergency services or a trusted person now.\n\nThis is a local mock response and cannot assess an emergency.';
    case 'general_health':
      return `I can help you learn about that. I may need a little more information before giving useful general guidance. Notice what you are experiencing, when it started, and whether it is getting worse. A qualified health professional can assess personal symptoms.\n\n${ageNote}\n\nThis is a local mock response for the mobile experience, not medical advice.`;
    default:
      return `I can help you learn about health topics and prepare questions for a qualified health professional. Please share only what you feel comfortable sharing. If you have severe or urgent symptoms, seek human help now.\n\n${ageNote}\n\nThis is a local mock response for the mobile experience, not medical advice.`;
  }
}

export function classifyPrompt(text: string): MockResponseCategory {
  const normalized = text.toLocaleLowerCase();
  if (/hello|hi |hey|good morning|good afternoon|akwaaba/.test(normalized)) return 'greeting';
  if (/breath|breathing|heavy bleeding|unconscious|passed out|severe pain|immediate danger|emergency|danger|suicide|hurt myself|kill myself/.test(normalized)) return 'emergency';
  if (/sex|sexual|period|menstrual|pregnan|contracept|sti|hiv|condom|puberty/.test(normalized)) return 'sexual_health';
  if (/stress|anxious|anxiety|worry|worried|sad|mood|overwhelmed|sleep|mental|self harm/.test(normalized)) return 'mental_wellbeing';
  if (/health|symptom|pain|clinic|doctor|medicine|body|fever|headache|cough/.test(normalized)) return 'general_health';
  return 'unknown';
}

export function getMockResponse(input: MockResponseInput): MockResponse {
  const category = input.language === 'tw' ? 'akan' : classifyPrompt(input.text);
  return { category, text: responseForCategory(category, input.language, input.ageGroup) };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new MockResponderCancelledError();
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new MockResponderCancelledError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function streamMockResponse(
  input: MockResponseInput,
  options: { signal?: AbortSignal; onChunk?: (text: string) => void; latencyMs?: number; chunkDelayMs?: number } = {},
): Promise<MockResponse> {
  if (input.text.includes(MOCK_FAILURE_TOKEN)) throw new MockResponderError();
  const response = getMockResponse(input);
  await wait(options.latencyMs ?? 260, options.signal);
  const chunks = response.text.match(/.{1,32}(?:\s+|$)/g) ?? [response.text];
  let partial = '';
  for (const chunk of chunks) {
    throwIfAborted(options.signal);
    partial += chunk;
    options.onChunk?.(partial);
    await wait(options.chunkDelayMs ?? 42, options.signal);
  }
  return response;
}

export function wasMockResponseCancelled(error: unknown) {
  return isAbortError(error);
}
