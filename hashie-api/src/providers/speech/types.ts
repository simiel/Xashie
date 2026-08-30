export type SpeechLanguage = 'en' | 'tw';

export type SpeechToTextRequest = {
  audio: Uint8Array;
  mimeType: string;
  language: SpeechLanguage;
  signal?: AbortSignal | undefined;
};

export type SpeechToTextResult = {
  transcript: string;
  language: SpeechLanguage;
  confidence?: number | undefined;
};

export interface SpeechToTextProvider {
  transcribe(request: SpeechToTextRequest): Promise<SpeechToTextResult>;
}

export type TextToSpeechRequest = {
  text: string;
  language: SpeechLanguage;
  signal?: AbortSignal | undefined;
};

export type TextToSpeechResult = {
  audio: Uint8Array;
  mimeType: string;
};

export interface TextToSpeechProvider {
  synthesize(request: TextToSpeechRequest): Promise<TextToSpeechResult>;
}
