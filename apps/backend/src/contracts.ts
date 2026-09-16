export const languages = ['english', 'akan-twi'] as const;
export type Language = (typeof languages)[number];

export const ageGroups = ['under-13', '13-15', '16-17', '18-24', '25-plus', 'prefer-not-to-say'] as const;
export type AgeGroup = (typeof ageGroups)[number];

export const accessibilityPreferences = [
  'larger-text',
  'higher-contrast',
  'captions',
  'visual-details',
  'hearing-audio',
  'no-changes',
  'prefer-not-to-say',
] as const;
export type AccessibilityPreference = (typeof accessibilityPreferences)[number];

export type ActorType = 'guest' | 'clerk-user';
export type OwnerType = ActorType;

export type Actor =
  | { type: 'guest'; sessionId: string }
  | { type: 'clerk-user'; userId: string; sessionId: string };

export type Preferences = {
  language: Language | null;
  nickname: string | null;
  ageGroup: AgeGroup | null;
  accessibilityPreferences: AccessibilityPreference[];
};

export type PreferencesPatch = Partial<Preferences>;

export type StoredPreferences = Preferences & {
  ownerType: OwnerType;
  ownerId: string;
  updatedAt: string;
};

export type GuestSessionRecord = {
  id: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  upgradedToClerkUserId: string | null;
  upgradeIdempotencyKeyHash: string | null;
};

export type UpgradeResult = {
  alreadyUpgraded: boolean;
  migratedPreferences: boolean;
};

export const emptyPreferences: Preferences = {
  language: null,
  nickname: null,
  ageGroup: null,
  accessibilityPreferences: [],
};

export function ownerKey(ownerType: OwnerType, ownerId: string): string {
  return `${ownerType}:${ownerId}`;
}
