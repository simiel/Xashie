import { createClerkClient } from '@clerk/backend';
import { AuthServiceError } from './errors.js';

export type ClerkIdentity = {
  userId: string;
  sessionId: string;
};

export type ClerkVerificationDiagnostic = {
  outcome: 'not_authenticated' | 'verification_exception';
  errorCode?: string;
  issuer?: string;
  authorizedParty?: string;
  keyId?: string;
  configuredAuthorizedParties: string[];
};

export type ClerkVerification =
  | { status: 'authenticated'; identity: ClerkIdentity }
  | { status: 'invalid'; diagnostic?: ClerkVerificationDiagnostic };

export interface ClerkVerifier {
  verifyBearerToken(token: string): Promise<ClerkVerification>;
}

function safeOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 256) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function safeKeyId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : undefined;
}

function safeErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: unknown; errors?: Array<{ code?: unknown }> };
  const code = typeof candidate.code === 'string'
    ? candidate.code
    : typeof candidate.errors?.[0]?.code === 'string'
      ? candidate.errors[0].code
      : undefined;
  return code && /^[a-z0-9_.:-]{1,128}$/i.test(code) ? code : undefined;
}

function safeTokenMetadata(token: string): Pick<ClerkVerificationDiagnostic, 'issuer' | 'authorizedParty' | 'keyId'> {
  const [encodedHeader, encodedPayload] = token.split('.');
  if (!encodedHeader || !encodedPayload || encodedHeader.length > 8_192 || encodedPayload.length > 8_192) return {};
  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as { kid?: unknown };
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as { iss?: unknown; azp?: unknown };
    return {
      issuer: safeOrigin(payload.iss),
      authorizedParty: safeOrigin(payload.azp),
      keyId: safeKeyId(header.kid),
    };
  } catch {
    return {};
  }
}

export class UnavailableClerkVerifier implements ClerkVerifier {
  async verifyBearerToken(): Promise<ClerkVerification> {
    throw new AuthServiceError('not_configured');
  }
}

export class ClerkBackendVerifier implements ClerkVerifier {
  private readonly client;

  constructor(options: { secretKey?: string; jwtKey?: string; publishableKey?: string; authorizedParties: string[] }) {
    this.client = createClerkClient({
      secretKey: options.secretKey,
      jwtKey: options.jwtKey,
      publishableKey: options.publishableKey,
    });
    this.authorizedParties = options.authorizedParties;
  }

  private readonly authorizedParties: string[];

  async verifyBearerToken(token: string): Promise<ClerkVerification> {
    try {
      const request = new Request('https://hashie.invalid/v1/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const requestState = await this.client.authenticateRequest(request, {
        acceptsToken: 'session_token',
        authorizedParties: this.authorizedParties.length > 0 ? this.authorizedParties : undefined,
      });
      if (!requestState.isAuthenticated) {
        return {
          status: 'invalid',
          diagnostic: {
            outcome: 'not_authenticated',
            ...safeTokenMetadata(token),
            configuredAuthorizedParties: this.authorizedParties,
          },
        };
      }
      const auth = requestState.toAuth();
      if (!auth.userId || !auth.sessionId) {
        return {
          status: 'invalid',
          diagnostic: {
            outcome: 'not_authenticated',
            ...safeTokenMetadata(token),
            configuredAuthorizedParties: this.authorizedParties,
          },
        };
      }
      return { status: 'authenticated', identity: { userId: auth.userId, sessionId: auth.sessionId } };
    } catch (error) {
      return {
        status: 'invalid',
        diagnostic: {
          outcome: 'verification_exception',
          errorCode: safeErrorCode(error),
          ...safeTokenMetadata(token),
          configuredAuthorizedParties: this.authorizedParties,
        },
      };
    }
  }
}

export function createClerkVerifierFromEnv(env: NodeJS.ProcessEnv = process.env): ClerkVerifier {
  if (!env.CLERK_SECRET_KEY && !env.CLERK_JWT_KEY) return new UnavailableClerkVerifier();
  return new ClerkBackendVerifier({
    secretKey: env.CLERK_SECRET_KEY,
    jwtKey: env.CLERK_JWT_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    authorizedParties: (env.CLERK_AUTHORIZED_PARTIES ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  });
}
