export type HashieLanguage = 'en' | 'tw';

export type IntelligenceMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type IntelligenceRequest = {
  messages: IntelligenceMessage[];
  language: HashieLanguage;
  ageGroup: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown';
  signal?: AbortSignal | undefined;
};

export type IntelligenceChunk = {
  text: string;
  finishReason?: string | undefined;
};

export interface IntelligenceProvider {
  stream(request: IntelligenceRequest): AsyncIterable<IntelligenceChunk>;
}
