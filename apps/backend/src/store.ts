import { emptyPreferences, ownerKey, type GuestSessionRecord, type OwnerType, type Preferences, type PreferencesPatch, type StoredPreferences, type UpgradeResult } from './contracts.js';
import { StoreError } from './errors.js';

export interface DataStore {
  createGuestSession(record: GuestSessionRecord): Promise<void>;
  findGuestSessionByTokenHash(tokenHash: string): Promise<GuestSessionRecord | null>;
  getPreferences(ownerType: OwnerType, ownerId: string): Promise<StoredPreferences | null>;
  upsertPreferences(ownerType: OwnerType, ownerId: string, patch: PreferencesPatch, now: string): Promise<StoredPreferences>;
  deletePreferences(ownerType: OwnerType, ownerId: string): Promise<void>;
  upgradeGuestSession(sessionId: string, clerkUserId: string, idempotencyKeyHash: string, now: string): Promise<UpgradeResult>;
}

export class InMemoryDataStore implements DataStore {
  private readonly sessions = new Map<string, GuestSessionRecord>();
  private readonly preferences = new Map<string, StoredPreferences>();

  async createGuestSession(record: GuestSessionRecord): Promise<void> {
    this.sessions.set(record.id, { ...record });
  }

  async findGuestSessionByTokenHash(tokenHash: string): Promise<GuestSessionRecord | null> {
    for (const record of this.sessions.values()) {
      if (record.tokenHash === tokenHash) return { ...record };
    }
    return null;
  }

  async getPreferences(ownerType: OwnerType, ownerId: string): Promise<StoredPreferences | null> {
    const value = this.preferences.get(ownerKey(ownerType, ownerId));
    return value ? { ...value, accessibilityPreferences: [...value.accessibilityPreferences] } : null;
  }

  async upsertPreferences(ownerType: OwnerType, ownerId: string, patch: PreferencesPatch, now: string): Promise<StoredPreferences> {
    const key = ownerKey(ownerType, ownerId);
    const current = this.preferences.get(key);
    const next: StoredPreferences = {
      ownerType,
      ownerId,
      ...(current ?? { ...emptyPreferences }),
      ...patch,
      accessibilityPreferences: patch.accessibilityPreferences ?? current?.accessibilityPreferences ?? [],
      updatedAt: now,
    };
    this.preferences.set(key, next);
    return { ...next, accessibilityPreferences: [...next.accessibilityPreferences] };
  }

  async deletePreferences(ownerType: OwnerType, ownerId: string): Promise<void> {
    this.preferences.delete(ownerKey(ownerType, ownerId));
  }

  async upgradeGuestSession(sessionId: string, clerkUserId: string, idempotencyKeyHash: string, now: string): Promise<UpgradeResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new StoreError('inactive', 'Guest session is not active.');
    if (session.revokedAt) {
      if (session.upgradedToClerkUserId === clerkUserId && session.upgradeIdempotencyKeyHash === idempotencyKeyHash) {
        return { alreadyUpgraded: true, migratedPreferences: false };
      }
      throw new StoreError('conflict', 'Guest session was already upgraded.');
    }
    if (Date.parse(session.expiresAt) <= Date.parse(now)) throw new StoreError('inactive', 'Guest session is not active.');

    const guestKey = ownerKey('guest', session.id);
    const clerkKey = ownerKey('clerk-user', clerkUserId);
    const guestPreferences = this.preferences.get(guestKey);
    const clerkPreferences = this.preferences.get(clerkKey);
    let migratedPreferences = false;
    if (guestPreferences) {
      if (clerkPreferences) {
        const accessibilityPreferences = [...clerkPreferences.accessibilityPreferences];
        for (const preference of guestPreferences.accessibilityPreferences) {
          if (!accessibilityPreferences.includes(preference)) accessibilityPreferences.push(preference);
        }
        this.preferences.set(clerkKey, {
          ...clerkPreferences,
          language: clerkPreferences.language ?? guestPreferences.language,
          nickname: clerkPreferences.nickname ?? guestPreferences.nickname,
          ageGroup: clerkPreferences.ageGroup ?? guestPreferences.ageGroup,
          accessibilityPreferences,
          updatedAt: now,
        });
      } else {
        this.preferences.set(clerkKey, {
          ...guestPreferences,
          ownerType: 'clerk-user',
          ownerId: clerkUserId,
          accessibilityPreferences: [...guestPreferences.accessibilityPreferences],
          updatedAt: now,
        });
      }
      migratedPreferences = true;
      this.preferences.delete(guestKey);
    }
    session.revokedAt = now;
    session.upgradedToClerkUserId = clerkUserId;
    session.upgradeIdempotencyKeyHash = idempotencyKeyHash;
    this.sessions.set(session.id, session);
    return { alreadyUpgraded: false, migratedPreferences };
  }
}

export class UnavailableDataStore implements DataStore {
  private fail(): never {
    throw new StoreError('not_configured', 'Persistent data storage is not configured.');
  }

  async createGuestSession(): Promise<void> { this.fail(); }
  async findGuestSessionByTokenHash(): Promise<GuestSessionRecord | null> { this.fail(); }
  async getPreferences(): Promise<StoredPreferences | null> { this.fail(); }
  async upsertPreferences(): Promise<StoredPreferences> { this.fail(); }
  async deletePreferences(): Promise<void> { this.fail(); }
  async upgradeGuestSession(): Promise<UpgradeResult> { this.fail(); }
}

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  guestSessionsTable?: string;
  preferencesTable?: string;
};

type SupabaseGuestRow = {
  id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  upgraded_to_clerk_user_id: string | null;
  upgrade_idempotency_key_hash: string | null;
};

type SupabasePreferencesRow = {
  owner_type: OwnerType;
  owner_id: string;
  language: Preferences['language'];
  nickname: string | null;
  age_group: Preferences['ageGroup'];
  accessibility_preferences: Preferences['accessibilityPreferences'];
  updated_at: string;
};

export class SupabaseDataStore implements DataStore {
  private readonly guestSessionsTable: string;
  private readonly preferencesTable: string;

  constructor(private readonly config: SupabaseConfig) {
    this.guestSessionsTable = config.guestSessionsTable ?? 'hashie_guest_sessions';
    this.preferencesTable = config.preferencesTable ?? 'hashie_preferences';
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    try {
      const response = await fetch(`${this.config.url.replace(/\/$/, '')}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: this.config.serviceRoleKey,
          Authorization: `Bearer ${this.config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
      if (!response.ok) throw new StoreError('unavailable', 'Persistent data storage returned an unavailable response.');
      if (response.status === 204) return null;
      const body = await response.text();
      return body.length > 0 ? JSON.parse(body) : null;
    } catch (error) {
      if (error instanceof StoreError) throw error;
      throw new StoreError('unavailable', 'Persistent data storage is unavailable.');
    }
  }

  async createGuestSession(record: GuestSessionRecord): Promise<void> {
    await this.request(this.guestSessionsTable, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: record.id,
        token_hash: record.tokenHash,
        created_at: record.createdAt,
        expires_at: record.expiresAt,
        revoked_at: record.revokedAt,
        upgraded_to_clerk_user_id: record.upgradedToClerkUserId,
        upgrade_idempotency_key_hash: record.upgradeIdempotencyKeyHash,
      }),
    });
  }

  async findGuestSessionByTokenHash(tokenHash: string): Promise<GuestSessionRecord | null> {
    const query = new URLSearchParams({ select: '*', token_hash: `eq.${tokenHash}` });
    const rows = await this.request(`${this.guestSessionsTable}?${query}`) as SupabaseGuestRow[];
    const row = rows[0];
    return row ? this.toGuestRecord(row) : null;
  }

  async getPreferences(ownerType: OwnerType, ownerId: string): Promise<StoredPreferences | null> {
    const query = new URLSearchParams({ select: '*', owner_type: `eq.${ownerType}`, owner_id: `eq.${ownerId}` });
    const rows = await this.request(`${this.preferencesTable}?${query}`) as SupabasePreferencesRow[];
    return rows[0] ? this.toPreferences(rows[0]) : null;
  }

  async upsertPreferences(ownerType: OwnerType, ownerId: string, patch: PreferencesPatch, now: string): Promise<StoredPreferences> {
    const existing = await this.getPreferences(ownerType, ownerId);
    const next = { ...emptyPreferences, ...(existing ?? {}), ...patch };
    const query = new URLSearchParams({ on_conflict: 'owner_type,owner_id' });
    const rows = await this.request(`${this.preferencesTable}?${query}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        owner_type: ownerType,
        owner_id: ownerId,
        language: next.language,
        nickname: next.nickname,
        age_group: next.ageGroup,
        accessibility_preferences: next.accessibilityPreferences,
        updated_at: now,
      }),
    }) as SupabasePreferencesRow[];
    const row = rows[0];
    if (!row) throw new StoreError('unavailable', 'Persistent data storage did not return preferences.');
    return this.toPreferences(row);
  }

  async deletePreferences(ownerType: OwnerType, ownerId: string): Promise<void> {
    const query = new URLSearchParams({ owner_type: `eq.${ownerType}`, owner_id: `eq.${ownerId}` });
    await this.request(`${this.preferencesTable}?${query}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }

  async upgradeGuestSession(sessionId: string, clerkUserId: string, idempotencyKeyHash: string, now: string): Promise<UpgradeResult> {
    let response: Response;
    try {
      response = await fetch(`${this.config.url.replace(/\/$/, '')}/rest/v1/rpc/hashie_upgrade_guest_session`, {
        method: 'POST',
        headers: {
          apikey: this.config.serviceRoleKey,
          Authorization: `Bearer ${this.config.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_session_id: sessionId,
          p_clerk_user_id: clerkUserId,
          p_idempotency_key_hash: idempotencyKeyHash,
          p_consent: true,
          p_now: now,
        }),
      });
    } catch {
      throw new StoreError('unavailable', 'Persistent data storage is unavailable.');
    }

    if (!response.ok) throw new StoreError('unavailable', 'Persistent data storage returned an unavailable response.');

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new StoreError('unavailable', 'Persistent data storage returned an invalid response.');
    }

    if (!isRecord(payload) || typeof payload.status !== 'string') {
      throw new StoreError('unavailable', 'Persistent data storage returned an invalid response.');
    }
    if (payload.status === 'inactive') throw new StoreError('inactive', 'Guest session is not active.');
    if (payload.status === 'conflict') throw new StoreError('conflict', 'Guest session was already upgraded.');
    if (payload.status !== 'ok' || typeof payload.already_upgraded !== 'boolean' || typeof payload.migrated_preferences !== 'boolean') {
      throw new StoreError('unavailable', 'Persistent data storage returned an invalid response.');
    }

    return {
      alreadyUpgraded: payload.already_upgraded,
      migratedPreferences: payload.migrated_preferences,
    };
  }

  private toGuestRecord(row: SupabaseGuestRow): GuestSessionRecord {
    return {
      id: row.id,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      upgradedToClerkUserId: row.upgraded_to_clerk_user_id,
      upgradeIdempotencyKeyHash: row.upgrade_idempotency_key_hash,
    };
  }

  private toPreferences(row: SupabasePreferencesRow): StoredPreferences {
    return {
      ownerType: row.owner_type,
      ownerId: row.owner_id,
      language: row.language,
      nickname: row.nickname,
      ageGroup: row.age_group,
      accessibilityPreferences: [...row.accessibility_preferences],
      updatedAt: row.updated_at,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createDataStoreFromEnv(env: NodeJS.ProcessEnv = process.env): DataStore {
  if (env.HASHIE_DATA_STORE === 'memory' && env.HASHIE_ALLOW_INSECURE_MEMORY_STORE === 'true' && env.NODE_ENV !== 'production') {
    return new InMemoryDataStore();
  }
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseDataStore({ url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY });
  }
  return new UnavailableDataStore();
}
