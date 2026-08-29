export const supportedLanguages = {
  en: { label: 'English', providerValue: 'eng' },
  tw: { label: 'Akan/Twi', providerValue: 'akh' },
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

export const copy = {
  en: {
    appName: 'Hashie',
    welcomeTitle: 'Health support, at your pace.',
    welcomeBody:
      'Learn about health topics, ask questions, and find human support when you need it.',
    limitation:
      'Hashie offers health education and support. It does not diagnose, prescribe, or replace a clinician or emergency service.',
    emergency: 'For severe or immediate danger, contact local emergency services or a trusted person now.',
    home: 'Home',
    learn: 'Learn',
    support: 'Support',
    settings: 'Settings',
    language: 'Language',
    privacy: 'Privacy first',
    privacyBody: 'Your choices and sensitive information deserve care.',
    comingSoon: 'This area is being prepared with reviewed information.',
  },
  tw: {
    appName: 'Hashie',
    welcomeTitle: 'Apɔwmuden ho mmoa, wo ara wo bere mu.',
    welcomeBody: 'Sua apɔwmuden ho nsɛm, bisa nsɛmmisa, na hwehwɛ nnipa mmoa bere a ehia wo.',
    limitation:
      'Hashie de apɔwmuden ho adesua ne mmoa ma. Enyɛ ɔyaresabea, ɛnkyerɛ ayaresa, na ɛnsi oduruyɛfo ananmu.',
    emergency: 'Sɛ asɛm no yɛ den anaasɛ ɛho hia ntɛm a, frɛ mpɔtam hɔ ntɛm mmoa anaa obi a wugye no di seesei.',
    home: 'Fie',
    learn: 'Sua',
    support: 'Mmoa',
    settings: 'Nhyehyɛe',
    language: 'Kasa',
    privacy: 'Ahintasɛm di kan',
    privacyBody: 'Wo apaw ne wo nsɛm a ɛho hia fata ahwɛyiye.',
    comingSoon: 'Wɔresiesie ha de nsɛm a wɔahwɛ mu ama wo.',
  },
} as const;

export type Copy = (typeof copy)[SupportedLanguage];
