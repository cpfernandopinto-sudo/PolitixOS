import 'server-only';
import { cookies } from 'next/headers';
import {
  decryptSessionToken,
  encryptSessionToken,
  type SessionPayload,
} from '@/lib/auth/token';

export type { SessionPayload } from '@/lib/auth/token';

// ─── Encrypt / Decrypt ───────────────────────────────────────────────────────

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return encryptSessionToken(payload);
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  return decryptSessionToken(token);
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

const COOKIE_NAME = 'politixos_session';

export async function createSession(data: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  data.expiresAt = expiresAt.toISOString();
  const token = await encryptSession(data);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return decryptSession(token);
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    sameSite: 'lax',
    path: '/',
  });
}
