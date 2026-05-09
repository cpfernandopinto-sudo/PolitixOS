import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { UserRole } from '@/lib/auth/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];      // screen_keys que o usuário pode acessar
  allowedTargetIds: string[]; // target UUIDs permitidos ([] = sem restrição para admin)
  expiresAt: string;          // ISO string
}

// ─── Secret key ──────────────────────────────────────────────────────────────

const raw = process.env.SESSION_SECRET;
if (!raw) {
  throw new Error('[PolitixOS] SESSION_SECRET não configurado. Adicione ao .env.local');
}
const encodedKey = new TextEncoder().encode(raw);

// ─── Encrypt / Decrypt ───────────────────────────────────────────────────────

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
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
  store.delete(COOKIE_NAME);
}
