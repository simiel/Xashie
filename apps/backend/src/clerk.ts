import { createClerkClient } from '@clerk/backend';
import { AuthServiceError } from './errors.js';

export type ClerkIdentity = {
  userId: string;
  sessionId: string;
};

export type ClerkVerification =
  | { status: 'authenticated'; identity: ClerkIdentity }
  | { status: 'invalid' };

export interface ClerkVerifier {
  verifyBearerToken(token: string): Promise<ClerkVerification>;
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
      if (!requestState.isAuthenticated) return { status: 'invalid' };
      const auth = requestState.toAuth();
      if (!auth.userId || !auth.sessionId) return { status: 'invalid' };
      return { status: 'authenticated', identity: { userId: auth.userId, sessionId: auth.sessionId } };
    } catch {
      return { status: 'invalid' };
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
