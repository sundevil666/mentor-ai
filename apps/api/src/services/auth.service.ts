import crypto from 'node:crypto';
import { config } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

interface GoogleTokenInfo {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  sub?: string;
}

interface SessionPayload extends AuthenticatedUser {
  exp: number;
}

const sessionTtlSeconds = 60 * 60 * 24 * 30;

export const authService = {
  isGoogleAuthConfigured(): boolean {
    return Boolean(config.googleClientId && config.googleAllowedEmails.length > 0);
  },

  async signInWithGoogleCredential(credential: string) {
    if (!this.isGoogleAuthConfigured()) {
      throw new Error('Google sign-in is not configured.');
    }

    const tokenInfo = await verifyGoogleCredential(credential);
    const email = tokenInfo.email?.toLowerCase();

    if (
      tokenInfo.aud !== config.googleClientId ||
      !email ||
      tokenInfo.email_verified !== true && tokenInfo.email_verified !== 'true' ||
      !config.googleAllowedEmails.includes(email)
    ) {
      throw new Error('Google sign-in is not allowed for this account.');
    }

    const user: AuthenticatedUser = {
      id: createUserId(tokenInfo.sub ?? email),
      email,
      displayName: tokenInfo.name ?? email,
    };

    return {
      user,
      sessionToken: createSessionToken(user),
    };
  },

  verifySessionToken(token: string): AuthenticatedUser | null {
    const [payloadBase64, signature] = token.split('.');

    if (!payloadBase64 || !signature) {
      return null;
    }

    const expectedSignature = signPayload(payloadBase64);

    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')) as SessionPayload;

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return {
        id: payload.id,
        email: payload.email,
        displayName: payload.displayName,
      };
    } catch {
      return null;
    }
  },
};

async function verifyGoogleCredential(credential: string): Promise<GoogleTokenInfo> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);

  if (!response.ok) {
    throw new Error('Google token verification failed.');
  }

  return (await response.json()) as GoogleTokenInfo;
}

function createSessionToken(user: AuthenticatedUser): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

  return `${payloadBase64}.${signPayload(payloadBase64)}`;
}

function signPayload(payloadBase64: string): string {
  return crypto.createHmac('sha256', config.googleSessionSecret).update(payloadBase64).digest('base64url');
}

function createUserId(stableGoogleSubject: string): string {
  return `google-${crypto.createHash('sha256').update(stableGoogleSubject).digest('hex').slice(0, 24)}`;
}
